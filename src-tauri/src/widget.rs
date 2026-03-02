use tauri::Manager;

/// Creates the floating overlay widget window (hidden at startup).
pub fn create(app: &mut tauri::App) -> Result<(), tauri::Error> {
    let url = if cfg!(debug_assertions) {
        tauri::WebviewUrl::External("http://localhost:1420/widget.html".parse().unwrap())
    } else {
        tauri::WebviewUrl::App("widget.html".into())
    };

    let window = tauri::WebviewWindowBuilder::new(app, "widget", url)
        .title("Pryt Voice Widget")
        .inner_size(200.0, 52.0)
        .decorations(false)
        .always_on_top(true)
        .transparent(true)
        .resizable(false)
        .visible(false)
        .skip_taskbar(true)
        .build()?;

    // Position at bottom-centre of the primary monitor.
    if let Ok(Some(monitor)) = window.primary_monitor() {
        let size = monitor.size();
        let pos = monitor.position();
        let x = pos.x + (size.width as i32 - 200) / 2;
        let y = pos.y + size.height as i32 - 52 - 48;
        let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
    }

    Ok(())
}

pub fn show(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("widget") {
        let _ = w.show();
    }
}

/// Hides the widget after a 1.5 s delay. Spawns its own thread so the
/// caller is never blocked.
pub fn hide_delayed(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(1500));
        if let Some(w) = app.get_webview_window("widget") {
            let _ = w.hide();
        }
    });
}