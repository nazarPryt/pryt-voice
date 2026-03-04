// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod model_manager;
mod paste;
mod widget;
mod whisper;

use std::sync::Mutex;

use audio::{list_audio_devices as do_list_devices, AudioDevice, AudioState};
use model_manager::{check_whisper_ready, CheckResult};
use paste::{copy_and_maybe_paste, segments_to_text, PasteState};
use tauri::Manager;

// ---------------------------------------------------------------------------
// Translate state — persists the output language choice across recordings
// ---------------------------------------------------------------------------

struct TranslateState(Mutex<bool>);

impl TranslateState {
    fn new() -> Self {
        TranslateState(Mutex::new(true))
    }
    fn set(&self, translate: bool) {
        *self.0.lock().unwrap() = translate;
    }
    fn get(&self) -> bool {
        *self.0.lock().unwrap()
    }
}

struct ModelState(Mutex<String>);

impl ModelState {
    fn new() -> Self {
        ModelState(Mutex::new("small".to_string()))
    }
    fn set(&self, model: String) {
        *self.0.lock().unwrap() = model;
    }
    fn get(&self) -> String {
        self.0.lock().unwrap().clone()
    }
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn check_whisper(app: tauri::AppHandle) -> Result<CheckResult, String> {
    let model = app.state::<ModelState>().get();
    Ok(check_whisper_ready(&app, &model))
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
        let translate = app_clone.state::<TranslateState>().get();
        let model = app_clone.state::<ModelState>().get();
        match audio_state.stop() {
            Ok(samples) => {
                let _ = app_clone.emit("recording-stopped", ());
                match whisper::transcribe(&app_clone, samples, translate, &model) {
                    Ok(segments) => {
                        let text = segments_to_text(&segments);
                        let _ = app_clone.emit("transcription-result", &segments);
                        // Auto-copy to clipboard only — the Tauri window has
                        // focus here, so pasting into it makes no sense.
                        if !text.is_empty() {
                            std::thread::spawn(move || {
                                copy_and_maybe_paste(&text, false, None);
                            });
                        }
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
        widget::hide_delayed(app_clone);
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

/// Syncs the auto-paste toggle from the frontend to Rust state.
#[tauri::command]
fn set_auto_paste(state: tauri::State<'_, PasteState>, enabled: bool) {
    state.set_enabled(enabled);
}

/// Syncs the output language setting from the frontend.
/// `translate = true`  → English output (whisper --translate)
/// `translate = false` → Keep original language
#[tauri::command]
fn set_output_language(state: tauri::State<'_, TranslateState>, translate: bool) {
    state.set(translate);
}

/// Syncs the selected whisper model from the frontend ("base" or "small").
#[tauri::command]
fn set_model(state: tauri::State<'_, ModelState>, model: String) {
    state.set(model);
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
                let _ = app_handle.emit("recording-stopping", ());
                let app2 = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    let audio_state = app2.state::<AudioState>();
                    let translate = app2.state::<TranslateState>().get();
                    let model = app2.state::<ModelState>().get();
                    match audio_state.stop() {
                        Ok(samples) => {
                            let _ = app2.emit("recording-stopped", ());
                            match whisper::transcribe(&app2, samples, translate, &model) {
                                Ok(segments) => {
                                    let text = segments_to_text(&segments);
                                    let _ = app2.emit("transcription-result", &segments);
                                    if !text.is_empty() {
                                        let paste_state = app2.state::<PasteState>();
                                        let should_paste = paste_state.is_enabled();
                                        let saved_window = if should_paste {
                                            paste_state.take_window()
                                        } else {
                                            None
                                        };
                                        std::thread::spawn(move || {
                                            copy_and_maybe_paste(&text, should_paste, saved_window);
                                        });
                                    }
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
                    widget::hide_delayed(app2);
                });
            } else {
                // Save the active window BEFORE the widget appears so we can
                // restore focus to the right app after transcription.
                app_handle.state::<PasteState>().save_window();

                let mic = audio_state.get_device();
                match audio_state.start(mic) {
                    Ok(_) => {
                        let _ = app_handle.emit("recording-started", ());
                        widget::show(&app_handle);
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

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

fn main() {
    tauri::Builder::default()
        .manage(AudioState::new())
        .manage(PasteState::new())
        .manage(TranslateState::new())
        .manage(ModelState::new())
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
            set_auto_paste,
            set_output_language,
            set_model,
        ])
        .setup(|app| {
            widget::create(app)?;

            // Exit the entire app when the main window is closed so the hidden
            // widget window doesn't keep the process alive. Without this, the
            // old process holds its global-shortcut grab and the next launch
            // fails with "HotKey already registered".
            if let Some(main_win) = app.get_webview_window("main") {
                let handle = app.handle().clone();
                main_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::Destroyed = event {
                        handle.exit(0);
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}