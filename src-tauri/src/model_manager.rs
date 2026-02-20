use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckResult {
    pub ready: bool,
    pub missing: Vec<String>,
}

pub fn get_whisper_cli_path(app: &tauri::AppHandle) -> PathBuf {
    if cfg!(debug_assertions) {
        let cwd = std::env::current_dir().unwrap_or_default();
        cwd.join("../whisper/whisper.cpp/build/bin/whisper-cli")
    } else {
        app.path()
            .resource_dir()
            .unwrap_or_default()
            .join("whisper/whisper-cli")
    }
}

pub fn get_model_path(app: &tauri::AppHandle) -> PathBuf {
    if cfg!(debug_assertions) {
        let cwd = std::env::current_dir().unwrap_or_default();
        cwd.join("../whisper/models/ggml-base.en.bin")
    } else {
        app.path()
            .resource_dir()
            .unwrap_or_default()
            .join("whisper/ggml-base.en.bin")
    }
}

pub fn check_whisper_ready(app: &tauri::AppHandle) -> CheckResult {
    let mut missing = Vec::new();
    let cli = get_whisper_cli_path(app);
    let model = get_model_path(app);

    if !cli.exists() {
        missing.push(format!("whisper-cli not found at: {}", cli.display()));
    }
    if !model.exists() {
        missing.push(format!("model not found at: {}", model.display()));
    }

    CheckResult {
        ready: missing.is_empty(),
        missing,
    }
}
