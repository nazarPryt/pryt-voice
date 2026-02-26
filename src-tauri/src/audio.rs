use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
}

struct RecordingHandle {
    /// Sending () signals the recording thread to flush and stop.
    stop_tx: Sender<()>,
    /// Receives the final Vec<f32> of 16kHz mono samples after stop.
    samples_rx: Receiver<Vec<f32>>,
}

pub struct AudioState {
    handle: Mutex<Option<RecordingHandle>>,
    selected_device: Mutex<Option<String>>,
}

impl AudioState {
    pub fn new() -> Self {
        Self {
            handle: Mutex::new(None),
            selected_device: Mutex::new(None),
        }
    }

    pub fn is_recording(&self) -> bool {
        self.handle.lock().unwrap().is_some()
    }

    pub fn set_device(&self, name: Option<String>) {
        *self.selected_device.lock().unwrap() = name;
    }

    pub fn get_device(&self) -> Option<String> {
        self.selected_device.lock().unwrap().clone()
    }

    /// Start recording from the device with the given name (or default).
    pub fn start(&self, device_name: Option<String>) -> Result<(), String> {
        let mut lock = self.handle.lock().unwrap();
        if lock.is_some() {
            return Err("Already recording".into());
        }

        let host = cpal::default_host();

        let device = if let Some(name) = device_name {
            host.input_devices()
                .map_err(|e| e.to_string())?
                .find(|d| d.name().map(|n| n == name).unwrap_or(false))
                .ok_or_else(|| format!("Device '{}' not found", name))?
        } else {
            host.default_input_device()
                .ok_or("No default input device")?
        };

        let supported = device
            .supported_input_configs()
            .map_err(|e| e.to_string())?
            .collect::<Vec<_>>();

        // Try to find a 16kHz f32 mono config first, else use default.
        let (config, native_rate) = supported
            .iter()
            .find(|c| {
                c.channels() == 1
                    && c.sample_format() == SampleFormat::F32
                    && c.min_sample_rate().0 <= 16000
                    && c.max_sample_rate().0 >= 16000
            })
            .map(|c| (c.with_sample_rate(cpal::SampleRate(16000)), 16000u32))
            .unwrap_or_else(|| {
                let def = device.default_input_config().unwrap();
                let rate = def.sample_rate().0;
                (def.into(), rate)
            });

        let channels = config.channels() as usize;
        let (stop_tx, stop_rx) = mpsc::channel::<()>();
        let (samples_tx, samples_rx) = mpsc::channel::<Vec<f32>>();

        let samples_buf: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
        let buf_clone = samples_buf.clone();

        // Spawn a thread that owns and drives the stream until stop signal.
        std::thread::spawn(move || {
            let stream = device
                .build_input_stream(
                    &config.into(),
                    move |data: &[f32], _| {
                        let mut buf = buf_clone.lock().unwrap();
                        for chunk in data.chunks(channels) {
                            let mono = chunk.iter().sum::<f32>() / channels as f32;
                            buf.push(mono);
                        }
                    },
                    |err| eprintln!("cpal error: {}", err),
                    None,
                )
                .expect("Failed to build input stream");

            stream.play().expect("Failed to start stream");

            // Block until stop signal.
            let _ = stop_rx.recv();

            drop(stream); // stops cpal

            let raw = samples_buf.lock().unwrap().clone();
            let resampled = if native_rate != 16000 {
                resample(&raw, native_rate, 16000)
            } else {
                raw
            };

            let _ = samples_tx.send(resampled);
        });

        *lock = Some(RecordingHandle { stop_tx, samples_rx });

        Ok(())
    }

    /// Stop recording and return 16kHz mono PCM samples.
    pub fn stop(&self) -> Result<Vec<f32>, String> {
        let mut lock = self.handle.lock().unwrap();
        let handle = lock.take().ok_or("Not recording")?;
        let _ = handle.stop_tx.send(());
        // Drop the lock before blocking on recv so other threads can proceed.
        drop(lock);
        handle.samples_rx.recv().map_err(|e| e.to_string())
    }
}

/// Simple linear interpolation resampling (sufficient for speech).
fn resample(input: &[f32], from_rate: u32, to_rate: u32) -> Vec<f32> {
    if from_rate == to_rate {
        return input.to_vec();
    }
    let ratio = from_rate as f64 / to_rate as f64;
    let out_len = (input.len() as f64 / ratio) as usize;
    (0..out_len)
        .map(|i| {
            let pos = i as f64 * ratio;
            let idx = pos as usize;
            let frac = pos - idx as f64;
            if idx + 1 < input.len() {
                input[idx] * (1.0 - frac as f32) + input[idx + 1] * frac as f32
            } else {
                input[idx.min(input.len() - 1)]
            }
        })
        .collect()
}

pub fn list_audio_devices() -> Result<Vec<AudioDevice>, String> {
    let host = cpal::default_host();
    let devices = host.input_devices().map_err(|e| e.to_string())?;
    Ok(devices
        .filter_map(|d| {
            let raw_id = d.name().ok()?;
            // On Linux/ALSA, cpal returns many virtual device variants per physical
            // mic (plughw:, sysdefault:, front:, etc.).
            // We enumerate by hw: (one entry per physical device) but store plughw:
            // as the actual id passed to cpal — plughw: does automatic format/rate/
            // channel conversion so it never panics on hw_params_set_format.
            #[cfg(target_os = "linux")]
            {
                if raw_id == "default" {
                    return Some(AudioDevice {
                        id: raw_id,
                        name: "System default".to_string(),
                    });
                }
                if let Some(rest) = raw_id.strip_prefix("hw:") {
                    let plug_id = format!("plughw:{}", rest);
                    let name = alsa_long_name_from_hw(&raw_id)
                        .unwrap_or_else(|| raw_id.clone());
                    return Some(AudioDevice { id: plug_id, name });
                }
                return None; // skip all other virtual variants
            }
            #[cfg(not(target_os = "linux"))]
            Some(AudioDevice { id: raw_id.clone(), name: raw_id })
        })
        .collect())
}

/// Extracts the human-readable long card name from an `hw:CARD=X,DEV=Y` string.
/// Falls back to the short card name, then the raw id.
#[cfg(target_os = "linux")]
fn alsa_long_name_from_hw(hw_id: &str) -> Option<String> {
    let short = hw_id.strip_prefix("hw:CARD=")?.split(',').next()?;
    alsa_card_longname(short).or_else(|| Some(short.to_string()))
}

/// Looks up the ALSA long card name by matching the short card name.
#[cfg(target_os = "linux")]
fn alsa_card_longname(short_name: &str) -> Option<String> {
    for card in alsa::card::Iter::new().flatten() {
        if card.get_name().ok().as_deref() == Some(short_name) {
            if let Ok(long) = card.get_longname() {
                return Some(long.to_string());
            }
        }
    }
    None
}