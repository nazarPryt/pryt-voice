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

pub fn get_model_path(app: &tauri::AppHandle, model: &str) -> PathBuf {
    let filename = match model {
        "base" => "ggml-base.bin",
        _ => "ggml-small.bin",
    };
    if cfg!(debug_assertions) {
        let cwd = std::env::current_dir().unwrap_or_default();
        cwd.join(format!("../whisper/models/{filename}"))
    } else {
        app.path()
            .resource_dir()
            .unwrap_or_default()
            .join(format!("whisper/{filename}"))
    }
}

pub fn check_whisper_ready(app: &tauri::AppHandle, model: &str) -> CheckResult {
    let mut missing = Vec::new();
    let cli = get_whisper_cli_path(app);
    let model = get_model_path(app, model);

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
