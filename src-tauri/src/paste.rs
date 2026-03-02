use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};

use crate::whisper::Segment;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/// Tracks the auto-paste toggle and the X11 window that was active when
/// recording started, so focus can be restored before typing.
pub struct PasteState {
    auto_paste: AtomicBool,
    saved_window: Mutex<Option<u64>>,
}

impl PasteState {
    pub fn new() -> Self {
        Self {
            auto_paste: AtomicBool::new(false),
            saved_window: Mutex::new(None),
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.auto_paste.load(Ordering::Relaxed)
    }

    pub fn set_enabled(&self, val: bool) {
        self.auto_paste.store(val, Ordering::Relaxed);
    }

    /// Snapshot the currently active X11 window and remember it.
    pub fn save_window(&self) {
        if let Ok(mut w) = self.saved_window.lock() {
            *w = get_active_window();
        }
    }

    /// Return the saved window ID and clear it.
    pub fn take_window(&self) -> Option<u64> {
        self.saved_window.lock().ok().and_then(|mut w| w.take())
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Returns the X11 window ID of the currently focused window via xdotool.
/// Returns `None` on Wayland-only sessions or if xdotool is not installed.
pub fn get_active_window() -> Option<u64> {
    if std::env::var("DISPLAY").is_err() {
        return None;
    }
    let output = std::process::Command::new("xdotool")
        .args(["getactivewindow"])
        .output()
        .ok()?;
    String::from_utf8(output.stdout).ok()?.trim().parse().ok()
}

/// Joins all non-empty segment texts into a single space-separated string.
pub fn segments_to_text(segments: &[Segment]) -> String {
    segments
        .iter()
        .map(|s| s.text.trim())
        .filter(|t| !t.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

/// Copies `text` to the system clipboard (so the user can paste manually
/// later) and, if `paste` is `true`, also types it directly into
/// `saved_window` via `xdotool type`.
///
/// Direct typing works universally — standalone terminals, embedded IDE
/// terminals (WebStorm, VS Code), editors, browsers — without per-app
/// detection or paste-shortcut guessing.
///
/// **Call from a `std::thread`, not the tokio runtime** — this function
/// contains blocking sleeps.
pub fn copy_and_maybe_paste(text: &str, paste: bool, saved_window: Option<u64>) {
    #[cfg(target_os = "linux")]
    {
        use arboard::Clipboard;

        let Ok(mut ctx) = Clipboard::new() else { return };
        let Ok(()) = ctx.set_text(text.to_string()) else { return };

        // Brief hold so a clipboard manager can capture the content.
        std::thread::sleep(std::time::Duration::from_millis(100));
        drop(ctx); // clipboard manager takes over if one is running

        if paste {
            type_text(text, saved_window);
        }
    }
}

/// Types `text` into `window_id` (or the current focus if `None`) using
/// `xdotool type` + `windowactivate`.
///
/// `windowactivate` sends `_NET_ACTIVE_WINDOW` through the window manager,
/// which is accepted by all apps. `windowfocus` (XSetInputFocus) fails with
/// `BadMatch` on many modern applications.
fn type_text(text: &str, window_id: Option<u64>) {
    if std::env::var("DISPLAY").is_err() {
        return;
    }
    if let Some(id) = window_id {
        let id_str = id.to_string();
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