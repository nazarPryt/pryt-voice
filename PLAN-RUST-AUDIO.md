# Plan: Rust-level Audio Recording (feat/rust-audio)

## Goal
Replace Web Audio API (browser) with Rust `cpal` audio capture so recording works
even when the main window is minimized. The shortcut fires → Rust records → Rust
transcribes → result emitted to frontend (no webview needed during capture).

## Branch
```bash
git checkout feat/widget      # start from current branch
git checkout -b feat/rust-audio
```

## Why This Works
Today: shortcut → Rust emits → JS listener handles → JS starts Web Audio API
Problem: webkit2gtk suspends JS when window is minimized.

After: shortcut → Rust directly starts cpal recording → Rust calls whisper → Rust
emits result. The webview is only needed to display results, not for audio capture.

---

## Step 1 — Add Rust dependencies

**`src-tauri/Cargo.toml`** — add:
```toml
[dependencies]
# ... existing ...
cpal = "0.15"
rubato = "0.15"   # for resampling to 16kHz if device doesn't support it

[target.'cfg(target_os = "linux")'.dependencies]
# ... existing ...
# cpal on Linux requires ALSA headers:
# sudo apt-get install libasound2-dev
```

Also make sure `Cargo.toml` has:
```toml
[features]
default = []
```

> **Linux prerequisite**: `sudo apt-get install libasound2-dev`

---

## Step 2 — Create `src-tauri/src/audio.rs`

This module owns all audio capture state.

```rust
use std::sync::{Arc, Mutex};
use std::sync::mpsc::{self, Receiver, Sender};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, Stream};
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
}

struct RecordingHandle {
    // Sending () signals the recording thread to flush and stop.
    stop_tx: Sender<()>,
    // Receives the final Vec<f32> of 16kHz mono samples after stop.
    samples_rx: Receiver<Vec<f32>>,
    // Keep stream alive (dropping it stops cpal).
    _stream: Stream,
}

pub struct AudioState {
    handle: Mutex<Option<RecordingHandle>>,
}

impl AudioState {
    pub fn new() -> Self {
        Self { handle: Mutex::new(None) }
    }

    pub fn is_recording(&self) -> bool {
        self.handle.lock().unwrap().is_some()
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

        let supported = device.supported_input_configs()
            .map_err(|e| e.to_string())?
            .collect::<Vec<_>>();

        // Try to find a 16kHz f32 mono config first, else use default.
        let (config, native_rate) = supported.iter()
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

        // Spawn a thread that drives the stream until stop signal.
        std::thread::spawn(move || {
            let stream = device.build_input_stream(
                &config.into(),
                move |data: &[f32], _| {
                    // Mix to mono and downsample to 16kHz if needed.
                    let mut buf = buf_clone.lock().unwrap();
                    for chunk in data.chunks(channels) {
                        let mono = chunk.iter().sum::<f32>() / channels as f32;
                        buf.push(mono);
                    }
                },
                |err| eprintln!("cpal error: {}", err),
                None,
            ).expect("Failed to build input stream");

            stream.play().expect("Failed to start stream");

            // Wait for stop signal.
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

        *lock = Some(RecordingHandle {
            stop_tx,
            samples_rx,
            _stream: unsafe { std::mem::zeroed() }, // stream lives in thread
        });

        Ok(())
    }

    /// Stop recording and return 16kHz mono PCM samples.
    pub fn stop(&self) -> Result<Vec<f32>, String> {
        let mut lock = self.handle.lock().unwrap();
        let handle = lock.take().ok_or("Not recording")?;
        let _ = handle.stop_tx.send(());
        handle.samples_rx.recv().map_err(|e| e.to_string())
    }
}

/// Simple linear resampling (good enough for speech).
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
            let name = d.name().ok()?;
            Some(AudioDevice { id: name.clone(), name })
        })
        .collect())
}
```

> **Note on `_stream`**: The stream must stay alive while recording. Since it lives
> on the spawned thread, the `RecordingHandle` stores a dummy. A cleaner approach
> is to use a `Arc<AtomicBool>` stop flag instead of channels. See note at bottom.

---

## Step 3 — Register state and commands in `main.rs`

```rust
mod audio;
use audio::{AudioState, list_audio_devices as do_list_devices};

#[tauri::command]
fn list_audio_devices() -> Result<Vec<audio::AudioDevice>, String> {
    do_list_devices()
}

#[tauri::command]
fn start_recording(
    state: tauri::State<'_, AudioState>,
    device_name: Option<String>,
) -> Result<(), String> {
    state.start(device_name)
}

#[tauri::command]
fn stop_recording(state: tauri::State<'_, AudioState>) -> Result<(), String> {
    // Just signals stop. Actual samples are collected async via stop_and_transcribe.
    state.stop_signal()
}
```

### Modify the shortcut handler to work fully in Rust

Instead of emitting `toggle-recording` to JS, the shortcut now:
1. Checks if recording is active
2. Either starts or stops it
3. If stopping: spawns an async task to collect samples → run whisper → emit result

```rust
#[tauri::command]
fn register_shortcut(app: tauri::AppHandle, shortcut: String) -> Result<(), String> {
    use tauri::Emitter;
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

    app.global_shortcut().unregister_all().map_err(|e| e.to_string())?;

    let app_handle = app.clone();
    app.global_shortcut()
        .on_shortcut(shortcut.as_str(), move |_app, _shortcut, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }

            let audio_state = app_handle.state::<AudioState>();

            if audio_state.is_recording() {
                // Stop recording — collect samples and transcribe in background.
                let _ = app_handle.emit("recording-stopping", ());  // UI feedback
                let app2 = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    let audio_state = app2.state::<AudioState>();
                    match audio_state.stop() {
                        Ok(samples) => {
                            let _ = app2.emit("recording-stopped", ());
                            match whisper::transcribe(&app2, samples) {
                                Ok(segments) => {
                                    let _ = app2.emit("transcription-result", &segments);
                                }
                                Err(e) => {
                                    let _ = app2.emit("transcription-error", e);
                                }
                            }
                        }
                        Err(e) => {
                            let _ = app2.emit("transcription-error", e);
                        }
                    }
                });
            } else {
                // Start recording.
                let mic = { /* optionally read selected mic from persisted state */ None };
                match audio_state.start(mic) {
                    Ok(_) => { let _ = app_handle.emit("recording-started", ()); }
                    Err(e) => { let _ = app_handle.emit("transcription-error", e); }
                }
            }
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}
```

Register managed state in `main()`:
```rust
tauri::Builder::default()
    .manage(AudioState::new())   // <-- add this
    .plugin(...)
    .invoke_handler(tauri::generate_handler![
        transcribe,
        check_whisper,
        write_primary,
        register_shortcut,
        list_audio_devices,       // new
        start_recording,          // new (optional — shortcut uses state directly)
        stop_recording,           // new (optional)
    ])
```

---

## Step 4 — Update `whisper.rs`

The current `transcribe` function takes `Vec<f32>` from the Tauri command (converted
from JS `Array<number>`). We need a version callable from Rust directly (not via IPC):

Current signature:
```rust
pub fn transcribe(app: &tauri::AppHandle, audio_data: Vec<f32>) -> Result<Vec<Segment>, String>
```

This is already fine — call it directly from the shortcut handler with the samples
returned by `audio_state.stop()`. No changes needed to `whisper.rs`.

---

## Step 5 — Update Frontend

### `src/stores/useAppStore.ts`

Replace `populateMics` (which uses `enumerateMicrophones()` from `recorder.ts`):

```ts
populateMics: async () => {
  set({ micsLoading: true })
  try {
    const devices = await invoke<Array<{ id: string; name: string }>>('list_audio_devices')
    // Map to same shape as before for minimal UI changes
    const mics = devices.map(d => ({
      deviceId: d.id,
      label: d.name,
      kind: 'audioinput' as MediaDeviceKind,
      groupId: '',
      toJSON: () => ({}),
    } as MediaDeviceInfo))
    set({ mics })
    // ... rest of selectedMic logic same as now
  } catch (err) {
    get().setStatus(`Mic enumerate error: ${(err as Error).message}`, 'error')
  } finally {
    set({ micsLoading: false })
  }
},
```

### `src/App.tsx` — listen to Rust events instead of triggering recording

Replace the `toggle-recording` listener and `toggleRecording` logic:

```ts
useEffect(() => {
  const handlers = [
    listen('recording-started', () => {
      playStartSound()
      setStatus('Recording — press shortcut again to stop', 'recording')
      setIsRecording(true)
    }),
    listen('recording-stopping', () => {
      playStopSound()
      setStatus('Transcribing...', 'processing')
      setIsRecording(false)
    }),
    listen<Segment[]>('transcription-result', ({ payload }) => {
      if (payload.length > 0) {
        addGroup(payload)
      }
      setStatus(payload.length === 0 ? 'No speech detected' : 'Ready', 'idle')
    }),
    listen<string>('transcription-error', ({ payload }) => {
      setStatus(`Error: ${payload}`, 'error')
    }),
  ]

  return () => {
    handlers.forEach(p => p.then(fn => fn()))
  }
}, [])
```

The **record button** in the UI still calls `invoke('start_recording')` /
`invoke('stop_recording')` for manual button clicks (when window is open).

### `src/hooks/useRecorder.ts` — keep but use Tauri invoke

```ts
import { invoke } from '@tauri-apps/api/core'

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  const startRecording = useCallback(async (deviceId?: string) => {
    setIsBusy(true)
    try {
      await invoke('start_recording', { deviceName: deviceId || null })
      setIsRecording(true)
    } finally {
      setIsBusy(false)
    }
  }, [])

  const stopRecording = useCallback(async () => {
    setIsBusy(true)
    try {
      // stop_recording is fire-and-forget — results come via 'transcription-result' event
      await invoke('stop_recording')
      setIsRecording(false)
    } finally {
      setIsBusy(false)
    }
  }, [])

  return { isRecording, isBusy, startRecording, stopRecording }
}
```

### Remove these files (no longer needed)
- `src/recorder.ts` (Web Audio API recorder)
- `public/audio-processor.js` (AudioWorklet processor)
- The `AudioContext` / worklet setup is gone entirely

---

## Step 6 — Selected mic persistence in Rust

The shortcut handler needs to know which mic to use. Options:
1. **Simple**: Pass `None` → always use system default mic
2. **Better**: Store selected device name in a `Mutex<Option<String>>` in `AudioState`,
   expose a `set_recording_device(name: String)` Tauri command called when user changes
   mic in settings

Add to `AudioState`:
```rust
pub struct AudioState {
    handle: Mutex<Option<RecordingHandle>>,
    selected_device: Mutex<Option<String>>,  // persisted separately
}

impl AudioState {
    pub fn set_device(&self, name: Option<String>) {
        *self.selected_device.lock().unwrap() = name;
    }
    pub fn get_device(&self) -> Option<String> {
        self.selected_device.lock().unwrap().clone()
    }
}
```

Call `state.set_device(...)` whenever the frontend changes mic selection:
```ts
// In useAppStore setSelectedMicId:
setSelectedMicId: async (id: string) => {
  localStorage.setItem(STORAGE_KEYS.SELECTED_MIC_ID, id)
  set({ selectedMicId: id })
  await invoke('set_recording_device', { deviceName: id || null })
},
```

---

## Checklist

- [ ] `sudo apt-get install libasound2-dev` (Linux ALSA headers for cpal)
- [ ] Add `cpal` + `rubato` to `Cargo.toml`
- [ ] Create `src-tauri/src/audio.rs` with `AudioState`, `start`, `stop`, `list_audio_devices`
- [ ] Add `mod audio` + `manage(AudioState::new())` to `main.rs`
- [ ] Update `register_shortcut` to toggle recording directly via `AudioState`
- [ ] Add `list_audio_devices`, `start_recording`, `stop_recording`, `set_recording_device` commands
- [ ] Update `useAppStore.populateMics` to call `invoke('list_audio_devices')`
- [ ] Update `useAppStore.setSelectedMicId` to call `invoke('set_recording_device')`
- [ ] Update `useRecorder.ts` to use `invoke` instead of Web Audio API
- [ ] Update `App.tsx` event listeners to handle Rust-emitted events
- [ ] Remove `src/recorder.ts` and `public/audio-processor.js`
- [ ] Test: shortcut works when window minimized
- [ ] Test: button click works when window open

---

## Caveats

- `cpal` on Linux uses ALSA by default (not PulseAudio/PipeWire). For PipeWire,
  use the `jack` feature or use `pipewire-alsa` compatibility layer.
- cpal device IDs on Linux are device names (e.g. `"hw:0,0"`). These differ from
  browser `deviceId` values, so mic persistence format changes.
- The `_stream` dummy in `RecordingHandle` is a hack. A cleaner approach is to not
  store the stream in the handle at all — the stream lives on the recording thread and
  is dropped when `stop_tx.send(())` triggers thread exit.
