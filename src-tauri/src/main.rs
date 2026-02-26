// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod model_manager;
mod whisper;

use audio::{list_audio_devices as do_list_devices, AudioDevice, AudioState};
use model_manager::{check_whisper_ready, CheckResult};
use tauri::Manager;

#[tauri::command]
fn check_whisper(app: tauri::AppHandle) -> Result<CheckResult, String> {
    Ok(check_whisper_ready(&app))
}

#[tauri::command]
fn write_primary(text: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        use arboard::{Clipboard, LinuxClipboardKind, SetExtLinux};
        let mut ctx = Clipboard::new().map_err(|e: arboard::Error| e.to_string())?;
        ctx.set()
            .clipboard(LinuxClipboardKind::Primary)
            .text(text)
            .map_err(|e: arboard::Error| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn list_audio_devices() -> Result<Vec<AudioDevice>, String> {
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
fn stop_recording(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Emitter;
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        let audio_state = app_clone.state::<AudioState>();
        match audio_state.stop() {
            Ok(samples) => {
                let _ = app_clone.emit("recording-stopped", ());
                match whisper::transcribe(&app_clone, samples) {
                    Ok(segments) => {
                        let _ = app_clone.emit("transcription-result", &segments);
                    }
                    Err(e) => {
                        let _ = app_clone.emit("transcription-error", e);
                    }
                }
            }
            Err(e) => {
                let _ = app_clone.emit("transcription-error", e);
            }
        }
    });
    Ok(())
}

#[tauri::command]
fn set_recording_device(
    state: tauri::State<'_, AudioState>,
    device_name: Option<String>,
) -> Result<(), String> {
    state.set_device(device_name);
    Ok(())
}

#[tauri::command]
fn register_shortcut(app: tauri::AppHandle, shortcut: String) -> Result<(), String> {
    use tauri::Emitter;
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())?;

    let app_handle = app.clone();
    app.global_shortcut()
        .on_shortcut(shortcut.as_str(), move |_app, _shortcut, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }

            let audio_state = app_handle.state::<AudioState>();

            if audio_state.is_recording() {
                // Stop recording — collect samples and transcribe in background.
                let _ = app_handle.emit("recording-stopping", ());
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
                let mic = audio_state.get_device();
                match audio_state.start(mic) {
                    Ok(_) => {
                        let _ = app_handle.emit("recording-started", ());
                    }
                    Err(e) => {
                        let _ = app_handle.emit("transcription-error", e);
                    }
                }
            }
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(AudioState::new())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            check_whisper,
            write_primary,
            register_shortcut,
            list_audio_devices,
            start_recording,
            stop_recording,
            set_recording_device,
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}