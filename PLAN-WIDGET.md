# Plan: Floating Widget Window (feat/widget)

## Goal
A small always-on-top transparent widget window that handles recording and is never
suspended by webkit2gtk. The main window can be freely minimized. The widget stays
visible, receives the `toggle-recording` event, and records/transcribes independently.

## Branch
Already on `feat/widget`. No new branch needed.

## Why This Works
The widget window is always visible (never minimized) → its webview is never
suspended → it always receives the `toggle-recording` Tauri event emitted by the
OS-level shortcut → it can start/stop Web Audio API recording at any time.

---

## Architecture Overview

```
Main window (800×600)           Widget window (200×72, always-on-top)
  - Settings, history, mics       - Shows mic icon + recording state
  - Displays transcriptions        - Handles toggle-recording event
  - Can be minimized freely        - Runs useRecorder + useTranscription
                                   - Emits 'transcription-result' → main
```

---

## Step 1 — Add widget window to `src-tauri/tauri.conf.json`

```json
"app": {
  "windows": [
    {
      "title": "Pryt Voice",
      "width": 800,
      "height": 600,
      "minWidth": 400,
      "minHeight": 400,
      "backgroundColor": "#1a1a2e"
    },
    {
      "label": "widget",
      "title": "Pryt Voice Widget",
      "width": 200,
      "height": 72,
      "decorations": false,
      "alwaysOnTop": true,
      "transparent": true,
      "resizable": false,
      "visible": false,
      "url": "widget.html"
    }
  ]
}
```

> In dev mode the URL must be `http://localhost:1420/widget.html` — handled below via
> Rust `cfg!(debug_assertions)` or Vite serving multi-page.

For dev mode, change `"url"` to `"http://localhost:1420/widget.html"` OR use the
Tauri `devUrl` pattern. Simplest: use a runtime check in Rust (see Step 3).

---

## Step 2 — Multi-page Vite config

**`vite.config.ts`** — add widget as a second entry point:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 1420, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        widget: path.resolve(__dirname, 'widget.html'),
      },
    },
  },
})
```

---

## Step 3 — Add widget HTML entry

**`widget.html`** (at project root, sibling of `index.html`):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pryt Voice Widget</title>
  </head>
  <body>
    <div id="widget-root"></div>
    <script type="module" src="/src/widget.tsx"></script>
  </body>
</html>
```

---

## Step 4 — Widget React entry files

### `src/widget.tsx`
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { WidgetApp } from './WidgetApp'
import './styles.scss'  // or a widget-specific stylesheet

ReactDOM.createRoot(document.getElementById('widget-root')!).render(
  <React.StrictMode>
    <WidgetApp />
  </React.StrictMode>
)
```

### `src/WidgetApp.tsx`
```tsx
import { useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Widget } from './components/Widget/Widget'

const STORAGE_KEY = 'widget-position'

export function WidgetApp() {
  // Persist position across restarts.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const { x, y } = JSON.parse(saved)
      getCurrentWindow().setPosition({ type: 'Physical', x, y })
    }

    const unlisten = getCurrentWindow().onMoved(({ payload }) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    })

    return () => { unlisten.then(fn => fn()) }
  }, [])

  return <Widget />
}
```

### `src/components/Widget/Widget.tsx`
```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { emitTo } from '@tauri-apps/api/event'
import { useRecorder } from '@/hooks/useRecorder'
import { playStartSound, playStopSound } from '@/shared/utils/sounds'
import type { Segment } from '@/shared/types'
import s from './Widget.module.scss'

export function Widget() {
  const { isRecording, isBusy, startRecording, stopRecording } = useRecorder()
  const [isProcessing, setIsProcessing] = useState(false)
  const toggleRef = useRef<() => void>(() => {})

  const toggle = useCallback(async () => {
    if (isBusy || isProcessing) return

    if (!isRecording) {
      playStartSound()
      await startRecording()
    } else {
      playStopSound()
      setIsProcessing(true)
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const samples = await stopRecording()
        const segments = await invoke<Segment[]>('transcribe', {
          audioData: Array.from(samples),
        })
        // Send result to main window.
        await emitTo('main', 'transcription-result', segments)
      } finally {
        setIsProcessing(false)
      }
    }
  }, [isBusy, isProcessing, isRecording, startRecording, stopRecording])

  useEffect(() => { toggleRef.current = toggle }, [toggle])

  // Listen for the global shortcut event (widget is always visible → never suspended).
  useEffect(() => {
    const unlisten = listen<void>('toggle-recording', () => {
      toggleRef.current()
    })
    return () => { unlisten.then(fn => fn()) }
  }, [])

  const state = isProcessing ? 'processing' : isRecording ? 'recording' : 'idle'

  return (
    <div className={s.widget} data-state={state} onClick={toggle}>
      {/* Mic icon + state indicator */}
      <div className={s.icon}>🎙</div>
      <div className={s.label}>
        {isProcessing ? 'Transcribing...' : isRecording ? 'Recording' : 'Click to record'}
      </div>
    </div>
  )
}
```

### `src/components/Widget/Widget.module.scss`
```scss
.widget {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  width: 200px;
  height: 72px;
  background: rgba(26, 26, 46, 0.9);
  border-radius: 12px;
  cursor: pointer;
  user-select: none;

  &[data-state='recording'] {
    background: rgba(180, 30, 30, 0.85);
  }
  &[data-state='processing'] {
    background: rgba(30, 100, 180, 0.85);
  }
}

.icon { font-size: 24px; }
.label { font-size: 13px; color: #fff; }
```

---

## Step 5 — Add `show_widget` / `hide_widget` Rust commands

**`src-tauri/src/main.rs`** — add:

```rust
#[tauri::command]
fn show_widget(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    let window = app.get_webview_window("widget")
        .ok_or("Widget window not found")?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn hide_widget(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    let window = app.get_webview_window("widget")
        .ok_or("Widget window not found")?;
    window.hide().map_err(|e| e.to_string())
}
```

Register in `invoke_handler`:
```rust
.invoke_handler(tauri::generate_handler![
    transcribe,
    check_whisper,
    write_primary,
    register_shortcut,
    show_widget,   // new
    hide_widget,   // new
])
```

---

## Step 6 — Widget capability file

**`src-tauri/capabilities/widget-capability.json`** (new file):

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "widget-capability",
  "description": "Widget window permissions",
  "windows": ["widget"],
  "permissions": [
    "core:default",
    "core:event:default",
    "core:window:default"
  ]
}
```

Also update `src-tauri/capabilities/main.json` to include the `show_widget` / `hide_widget`
commands if using Tauri v2 allowlist (add to `"permissions"` if needed).

---

## Step 7 — Main window: listen for widget results + toggle widget

### `src/App.tsx` — add listener for widget transcription results

```tsx
// Listen for transcription results from the widget window.
useEffect(() => {
  const unlisten = listen<Segment[]>('transcription-result', ({ payload }) => {
    if (payload.length > 0) {
      addGroup(payload)  // add to store — implement addGroup in useAppStore
    }
    setStatus(payload.length === 0 ? 'No speech detected' : 'Ready', 'idle')
  })
  return () => { unlisten.then(fn => fn()) }
}, [])
```

### `src/stores/useAppStore.ts` — add `widgetEnabled` + `addGroup`

```ts
// New fields:
widgetEnabled: boolean  // persisted to localStorage
// New actions:
setWidgetEnabled: (enabled: boolean) => Promise<void>
addGroup: (segments: Segment[]) => void
```

```ts
widgetEnabled: localStorage.getItem('widgetEnabled') === 'true',

setWidgetEnabled: async (enabled) => {
  localStorage.setItem('widgetEnabled', String(enabled))
  set({ widgetEnabled: enabled })
  if (enabled) {
    await invoke('show_widget')
  } else {
    await invoke('hide_widget')
  }
},

addGroup: (segments) => set(state => ({ groups: [...state.groups, segments] })),
```

### `src/components/SettingsTab/SettingsTab.tsx` — add widget toggle

```tsx
const { widgetEnabled, setWidgetEnabled } = useAppStore()

// In the JSX:
<label>
  <input
    type="checkbox"
    checked={widgetEnabled}
    onChange={e => setWidgetEnabled(e.target.checked)}
  />
  Show floating widget (enables background recording)
</label>
```

---

## Step 8 — Linux webkit2gtk permission for widget window

The widget window also needs microphone permission. In `main.rs` setup:

```rust
.setup(|app| {
  #[cfg(target_os = "linux")]
  {
    use tauri::Manager;
    use webkit2gtk::{PermissionRequestExt, WebViewExt};

    // Grant mic permission for both main and widget windows.
    for label in ["main", "widget"] {
      if let Some(webview_window) = app.get_webview_window(label) {
        webview_window.with_webview(|webview| {
          let wv = webview.inner();
          wv.connect_permission_request(|_, request: &webkit2gtk::PermissionRequest| {
            request.allow();
            true
          });
        })?;
      }
    }
  }
  Ok(())
})
```

---

## Step 9 — Dev mode URL fix

The `tauri.conf.json` `"url": "widget.html"` works in production but in dev mode
Tauri serves from `devUrl = http://localhost:1420`. Tauri v2 automatically prepends
the devUrl for relative paths in `windows[].url` during dev. So `"widget.html"` in
`tauri.conf.json` should resolve to `http://localhost:1420/widget.html` in dev mode.

If it doesn't, set the URL dynamically in the setup hook:
```rust
.setup(|app| {
  #[cfg(debug_assertions)]
  {
    use tauri::Manager;
    use tauri::WebviewUrl;
    if let Some(widget) = app.get_webview_window("widget") {
      // In Tauri v2 you can't change URL after creation.
      // Instead, create the window dynamically:
    }
  }
  // Alternative: use `tauri::WebviewWindowBuilder` to create widget at runtime.
```

Simplest approach: **create the widget window at runtime** instead of in config,
using `WebviewWindowBuilder` in the setup hook, which lets you use `cfg!` for URL:

```rust
.setup(|app| {
  let widget_url = if cfg!(debug_assertions) {
    tauri::WebviewUrl::External("http://localhost:1420/widget.html".parse().unwrap())
  } else {
    tauri::WebviewUrl::App("widget.html".into())
  };

  tauri::WebviewWindowBuilder::new(app, "widget", widget_url)
    .title("Pryt Voice Widget")
    .inner_size(200.0, 72.0)
    .decorations(false)
    .always_on_top(true)
    .transparent(true)
    .resizable(false)
    .visible(false)
    .build()?;

  // ... existing linux permission setup ...
  Ok(())
})
```

Remove the widget entry from `tauri.conf.json` `windows` array if using this approach.

---

## Checklist

- [ ] Add widget entry to `tauri.conf.json` (or use `WebviewWindowBuilder` in setup)
- [ ] Update `vite.config.ts` with multi-page `rollupOptions.input`
- [ ] Create `widget.html`
- [ ] Create `src/widget.tsx`
- [ ] Create `src/WidgetApp.tsx` (with position persistence)
- [ ] Create `src/components/Widget/Widget.tsx` (handles recording + emits to main)
- [ ] Create `src/components/Widget/Widget.module.scss`
- [ ] Add `show_widget` / `hide_widget` Rust commands to `main.rs`
- [ ] Add `src-tauri/capabilities/widget-capability.json`
- [ ] Grant mic permission for widget window in `main.rs` setup
- [ ] Add `widgetEnabled` + `addGroup` + `setWidgetEnabled` to `useAppStore`
- [ ] Add `listen('transcription-result')` in main `App.tsx`
- [ ] Add widget toggle UI in `SettingsTab`
- [ ] Test: shortcut works when main window minimized (widget visible)
- [ ] Test: widget position persists across restarts
- [ ] Test: recording in widget → result appears in main window history

---

## Key Notes

- Widget is created hidden. User enables it in Settings → `show_widget` is called.
- The widget window is NEVER minimized or hidden while enabled — that's the point.
- The `emitTo('main', ...)` call requires the `core:event:emit-to` permission in the
  widget capability file. Add `"core:event:emit-to"` to `widget-capability.json`.
- Widget dragging: make the widget draggable so user can reposition it. Use
  `getCurrentWindow().startDragging()` on mousedown on a drag handle area.
- The main window's `toggle-recording` listener (in `App.tsx`) should be REMOVED
  when the widget is enabled, to avoid double-triggering. Use `widgetEnabled` state.
