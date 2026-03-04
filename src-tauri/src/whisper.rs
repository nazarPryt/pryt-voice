use std::io::Write;
use std::path::Path;
use serde::{Deserialize, Serialize};
use tempfile::NamedTempFile;

use crate::model_manager::{get_model_path, get_whisper_cli_path};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Segment {
    pub start: String,
    pub end: String,
    pub text: String,
}

const SAMPLE_RATE: u32 = 16000;
const CHANNELS: u16 = 1;
const BIT_DEPTH: u16 = 16;

pub fn encode_wav(samples: &[f32]) -> Vec<u8> {
    let byte_rate = SAMPLE_RATE * (CHANNELS as u32) * (BIT_DEPTH as u32 / 8);
    let block_align = CHANNELS * (BIT_DEPTH / 8);
    let data_size = (samples.len() * (BIT_DEPTH as usize / 8)) as u32;
    let header_size: u32 = 44;

    let mut buf = Vec::with_capacity((header_size + data_size) as usize);

    // RIFF header
    buf.extend_from_slice(b"RIFF");
    buf.extend_from_slice(&(36 + data_size).to_le_bytes());
    buf.extend_from_slice(b"WAVE");

    // fmt chunk
    buf.extend_from_slice(b"fmt ");
    buf.extend_from_slice(&16u32.to_le_bytes()); // chunk size
    buf.extend_from_slice(&1u16.to_le_bytes());  // PCM format
    buf.extend_from_slice(&CHANNELS.to_le_bytes());
    buf.extend_from_slice(&SAMPLE_RATE.to_le_bytes());
    buf.extend_from_slice(&byte_rate.to_le_bytes());
    buf.extend_from_slice(&block_align.to_le_bytes());
    buf.extend_from_slice(&BIT_DEPTH.to_le_bytes());

    // data chunk
    buf.extend_from_slice(b"data");
    buf.extend_from_slice(&data_size.to_le_bytes());

    // PCM samples: convert f32 [-1, 1] to i16
    for &s in samples {
        let clamped = s.clamp(-1.0, 1.0);
        let val: i16 = if clamped < 0.0 {
            (clamped * 0x8000 as f32) as i16
        } else {
            (clamped * 0x7fff as f32) as i16
        };
        buf.extend_from_slice(&val.to_le_bytes());
    }

    buf
}

fn run_whisper_cli(cli: &Path, model: &Path, wav: &Path, translate: bool) -> Result<String, String> {
    let mut cmd = std::process::Command::new(cli);
    cmd.args([
        "-m",
        model.to_str().unwrap_or_default(),
        "-f",
        wav.to_str().unwrap_or_default(),
        "--no-prints",
        "-l",
        "auto",
    ]);
    if translate {
        cmd.arg("--translate");
    }
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to spawn whisper-cli: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "whisper-cli exited with code {}: {}",
            output.status.code().unwrap_or(-1),
            stderr
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

fn parse_output(stdout: &str) -> Vec<Segment> {
    // Expected format: [HH:MM:SS.mmm --> HH:MM:SS.mmm]   text
    let mut segments = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if !line.starts_with('[') {
            continue;
        }
        let Some(close) = line.find(']') else { continue };
        let bracket = &line[1..close];
        let Some(arrow) = bracket.find("-->") else { continue };
        let start = bracket[..arrow].trim().to_string();
        let end = bracket[arrow + 3..].trim().to_string();
        let text = line[close + 1..].trim().to_string();
        if !text.is_empty() {
            segments.push(Segment { start, end, text });
        }
    }

    segments
}

pub fn transcribe(app: &tauri::AppHandle, samples: Vec<f32>, translate: bool, model_name: &str) -> Result<Vec<Segment>, String> {
    let cli = get_whisper_cli_path(app);
    let model = get_model_path(app, model_name);

    let wav_data = encode_wav(&samples);

    let mut tmp = NamedTempFile::new()
        .map_err(|e| format!("Failed to create temp file: {e}"))?;
    tmp.write_all(&wav_data)
        .map_err(|e| format!("Failed to write temp WAV: {e}"))?;

    let stdout = run_whisper_cli(&cli, &model, tmp.path(), translate)?;
    Ok(parse_output(&stdout))
}
