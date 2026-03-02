// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod model_manager;
mod whisper;

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};

use audio::{list_audio_devices as do_list_devices, AudioDevice, AudioState};
use model_manager::{check_whisper_ready, CheckResult};
use tauri::Manager;

// ---------------------------------------------------------------------------
// Paste state — tracks the auto-paste toggle and the window that was active
// when recording started so we can restore focus before pasting.
// ---------------------------------------------------------------------------

struct PasteState {
    auto_paste: AtomicBool,
    saved_window: Mutex<Option<u64>>,
}

impl PasteState {
    fn new() -> Self {
        Self {
            auto_paste: AtomicBool::new(false),
            saved_window: Mutex::new(None),
        }
    }

    fn is_enabled(&self) -> bool {
        self.auto_paste.load(Ordering::Relaxed)
    }

    fn set_enabled(&self, val: bool) {
        self.auto_paste.store(val, Ordering::Relaxed);
    }

    fn save_window(&self) {
        if let Ok(mut w) = self.saved_window.lock() {
            *w = get_active_window();
        }
    }

    fn take_window(&self) -> Option<u64> {
        self.saved_window.lock().ok().and_then(|mut w| w.take())
    }
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/// Returns the X11 window ID of the currently focused window using xdotool.
/// Returns None on Wayland-only sessions (no DISPLAY) or if xdotool is absent.
fn get_active_window() -> Option<u64> {
    if std::env::var("DISPLAY").is_err() {
        return None;
    }
    let output = std::process::Command::new("xdotool")
        .args(["getactivewindow"])
        .output()
        .ok()?;
    String::from_utf8(output.stdout).ok()?.trim().parse().ok()
}

/// Joins segment texts into a single string.
fn segments_to_text(segments: &[whisper::Segment]) -> String {
    segments
        .iter()
        .map(|s| s.text.trim())
        .filter(|t| !t.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

/// Copies `text` to the system clipboard (for manual paste later) and, if
/// `paste` is true, also types it directly into the target window via
/// `xdotool type`. Direct typing works universally — standalone terminals,
/// embedded IDE terminals (WebStorm, VS Code), editors, browsers — without
/// any per-app detection or paste-shortcut guessing.
///
/// Must be called from a dedicated std::thread (not the tokio runtime).
fn copy_and_maybe_paste(text: &str, paste: bool, saved_window: Option<u64>) {
    #[cfg(target_os = "linux")]
    {
        use arboard::Clipboard;

        let Ok(mut ctx) = Clipboard::new() else { return };
        let Ok(()) = ctx.set_text(text.to_string()) else { return };

        // Brief hold so a clipboard manager can capture the content.
        std::thread::sleep(std::time::Duration::from_millis(100));
        // ctx drops — clipboard manager takes over if one is running.
        drop(ctx);

        if paste {
            // Type text directly into the target window. This works in
            // embedded terminals (WebStorm, VS Code), standalone terminals,
            // editors, and browsers without any app-type detection.
            do_xdotool_type(text, saved_window);
        }
    }
}

/// Types `text` directly into `window_id` (or the current focus if None)
/// using xdotool type. This bypasses clipboard paste entirely, so it works
/// in embedded terminals (WebStorm, VS Code), standalone terminal emulators,
/// editors, and browsers — regardless of which paste shortcut each uses.
fn do_xdotool_type(text: &str, window_id: Option<u64>) {
    if std::env::var("DISPLAY").is_err() {
        return;
    }
    if let Some(id) = window_id {
        let id_str = id.to_string();
        // windowactivate uses _NET_ACTIVE_WINDOW (WM-friendly); windowfocus
        // uses XSetInputFocus directly and fails with BadMatch on many apps.
        let _ = std::process::Command::new("xdotool")
            .args([
                "windowactivate", "--sync", &id_str,
                "type", "--clearmodifiers", "--delay", "0", "--", text,
            ])
            .output();
    } else {
        let _ = std::process::Command::new("xdotool")
            .args(["type", "--clearmodifiers", "--delay", "0", "--", text])
            .output();
    }
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

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
                        let text = segments_to_text(&segments);
                        let _ = app_clone.emit("transcription-result", &segments);
                        // Auto-copy to clipboard (no auto-paste: UI button means
                        // the Tauri window has focus, not an external editor).
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
        hide_widget_delayed(app_clone);
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

/// Called by the frontend to sync the auto-paste toggle to Rust state.
#[tauri::command]
fn set_auto_paste(state: tauri::State<'_, PasteState>, enabled: bool) {
    state.set_enabled(enabled);
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
                                    let text = segments_to_text(&segments);
                                    let _ = app2.emit("transcription-result", &segments);
                                    if !text.is_empty() {
                                        let paste_state = app2.state::<PasteState>();
                                        let should_paste = paste_state.is_enabled();
                                        let saved_window =
                                            if should_paste { paste_state.take_window() } else { None };
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
                    hide_widget_delayed(app2);
                });
            } else {
                // Save the active window BEFORE the widget appears so we can
                // restore focus to it after transcription completes.
                let paste_state = app_handle.state::<PasteState>();
                paste_state.save_window();

                // Start recording.
                let mic = audio_state.get_device();
                match audio_state.start(mic) {
                    Ok(_) => {
                        let _ = app_handle.emit("recording-started", ());
                        show_widget_window(&app_handle);
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
// Widget window helpers
// ---------------------------------------------------------------------------

fn create_widget_window(app: &mut tauri::App) -> Result<(), tauri::Error> {
    let widget_url = if cfg!(debug_assertions) {
        tauri::WebviewUrl::External("http://localhost:1420/widget.html".parse().unwrap())
    } else {
        tauri::WebviewUrl::App("widget.html".into())
    };

    let window = tauri::WebviewWindowBuilder::new(app, "widget", widget_url)
        .title("Pryt Voice Widget")
        .inner_size(200.0, 52.0)
        .decorations(false)
        .always_on_top(true)
        .transparent(true)
        .resizable(false)
        .visible(false)
        .skip_taskbar(true)
        .build()?;

    // Position at bottom-center of the primary monitor.
    if let Ok(Some(monitor)) = window.primary_monitor() {
        let size = monitor.size();
        let pos = monitor.position();
        let x = pos.x + (size.width as i32 - 200) / 2;
        let y = pos.y + size.height as i32 - 52 - 48;
        let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
    }

    Ok(())
}

fn show_widget_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("widget") {
        let _ = w.show();
    }
}

fn hide_widget_delayed(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(1500));
        if let Some(w) = app.get_webview_window("widget") {
            let _ = w.hide();
        }
    });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

fn main() {
    tauri::Builder::default()
        .manage(AudioState::new())
        .manage(PasteState::new())
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
        ])
        .setup(|app| {
            create_widget_window(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
