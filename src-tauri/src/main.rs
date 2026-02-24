// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod model_manager;
mod whisper;

use model_manager::{check_whisper_ready, CheckResult};
use whisper::{transcribe as do_transcribe, Segment};

#[tauri::command]
fn transcribe(app: tauri::AppHandle, audio_data: Vec<f32>) -> Result<Vec<Segment>, String> {
    do_transcribe(&app, audio_data)
}

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
fn register_shortcut(app: tauri::AppHandle, shortcut: String) -> Result<(), String> {
    use tauri::Emitter;
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())?;

    let app_handle = app.clone();
    app.global_shortcut()
        .on_shortcut(shortcut.as_str(), move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let _ = app_handle.emit("toggle-recording", ());
            }
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            transcribe,
            check_whisper,
            write_primary,
            register_shortcut
        ])
        .setup(|app| {
            #[cfg(target_os = "linux")]
            {
                use tauri::Manager;
                use webkit2gtk::{PermissionRequestExt, WebViewExt};

                let webview_window = app.get_webview_window("main").unwrap();
                webview_window.with_webview(|webview| {
                    let wv = webview.inner();
                    wv.connect_permission_request(|_, request: &webkit2gtk::PermissionRequest| {
                        request.allow();
                        true
                    });
                })?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
