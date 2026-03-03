# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Pryt Voice — a local, offline voice recognition desktop app. Tauri v2 shell with a React + TypeScript frontend. The frontend captures audio via the Rust backend (CPAL/ALSA), sends it for transcription via Tauri `invoke`, which spawns `whisper-cli` (whisper.cpp) as a child process.

## Commands

```bash
bun run dev          # Start Tauri dev window with hot reload (requires system deps + whisper setup)
bun run build        # Build + package app (output in src-tauri/target/release/)
bun run vite:dev     # Start Vite dev server only (port 1420)
bun run vite:build   # Build frontend only (output in dist/)
bun run test         # Run tests with Vitest (Playwright browser provider)
bun run test:ui      # Run tests with Vitest UI
```

## Versioning

Version is kept in sync across three files: `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.

**Never edit these files manually.** Use the bump script instead:

```bash
bun run version 2.1.0   # updates all three files atomically
```

The script (`scripts/bump-version.ts`) validates semver format and writes the new version to all three locations. After running it, commit the three changed files together before pushing.

First-time setup requires Rust and system deps:

```bash
# 1. Install Rust: https://rustup.rs
# 2. Install system deps (Ubuntu/Debian):
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libglib2.0-dev \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev \
  libasound2-dev libxdo-dev
# 3. Install JS deps and whisper.cpp:
bun install
bash scripts/setup-whisper.sh   # clones whisper.cpp, compiles it, downloads ggml-base.en.bin (~142MB)
```

## Prerequisites

On Linux, make sure the following tools are symlinked to `/usr/local/bin` so Tauri can find them in non-interactive shells:

```bash
sudo ln -s ~/.cargo/bin/cargo /usr/local/bin/cargo
sudo ln -s ~/.cargo/bin/rustc /usr/local/bin/rustc
sudo ln -s ~/.bun/bin/bun /usr/local/bin/bun
```

This is required because Tauri runs `beforeDevCommand` and `beforeBuildCommand` via `/bin/sh`, which doesn't source your shell's PATH.

## Architecture

Two parts: Rust backend (`src-tauri/`) and React frontend (`src/`).

### Rust Backend (`src-tauri/src/`)

- `main.rs` — Tauri app entry: registers all commands (`check_whisper`, `write_primary`, `register_shortcut`, `list_audio_devices`, `start_recording`, `stop_recording`, `set_recording_device`, `set_auto_paste`), inits plugins, creates widget window.
- `whisper.rs` — Spawns whisper-cli, parses timestamped output into `Segment[]`.
- `audio.rs` — Audio capture via CPAL/ALSA: device enumeration, recording start/stop, emits Tauri events with audio data.
- `model_manager.rs` — Resolves whisper-cli and model paths. Dev: CWD-relative `whisper/`. Production: `resource_dir/whisper/`.
- `widget.rs` — Creates and manages the floating always-on-top widget window.
- `paste.rs` — Writes to PRIMARY selection (middle-click paste) via arboard on Linux.

### React Frontend (`src/`)

- `main.tsx` — Vite entry, React root mount.
- `widget.tsx` — Entry for the floating widget window (`widget.html`).
- `App.tsx` — Root component: composes tabbed layout (Radix Tabs), wires up store and hooks.
- `stores/useAppStore.ts` — Zustand store: combines all feature slices into one store.
- `features/` — Feature slices (state + hooks), one folder per domain:
   - `recording/` — `recordingSlice`, `useRecordingEvents` (listens to Rust audio events)
   - `history/` — `historySlice` (persists transcription history to localStorage)
   - `shortcuts/` — `shortcutsSlice`, `useShortcutRegistration`, `formatShortcut`
   - `mics/` — `micsSlice` (audio device list)
   - `settings/` — `settingsSlice`, `useSettingsSync`
   - `setup/` — `setupSlice`, `useWhisperSetup` (checks whisper-cli on startup)
   - `status/` — `statusSlice`
   - `theme/` — `themeSlice`, `useThemeSync`, `applyTheme`
- `hooks/useCopyText.ts` — Clipboard copy flow: writes to CLIPBOARD + PRIMARY, manages `copied` state.
- `components/` — Per-component folders (Component + `.module.scss` + `index.ts`):
   - `OverviewTab/` — Main recorder UI + live transcript
   - `HistoryTab/` — Persistent transcription history with copy/clear
   - `ShortcutsTab/` — Keyboard shortcut viewer
   - `SettingsTab/` — App settings
   - `Widget/` — Floating widget (frameless, always-on-top, passive/event-driven)
   - `Header/`, `MicSelect/`, `RecordButton/`, `StatusBar/`, `TranscriptArea/`, `TranscriptBlock/`
- `public/audio-processor.js` — AudioWorkletProcessor (kept for reference; recording now done in Rust via CPAL).
- `shared/types.ts` — Shared TypeScript types.
- `shared/storageKeys.ts` — localStorage key constants.
- `shared/utils/sounds.ts` — UI sound helpers.

### Config

- `src-tauri/tauri.conf.json` — Tauri config: windows, bundle resources, dev/build commands.
- `src-tauri/capabilities/main.json` — Tauri v2 capability grants for main window.
- `src-tauri/capabilities/widget-capability.json` — Capability grants for widget window (includes `core:window:allow-start-dragging`).
- `vite.config.ts` — Vite config (port 1420, React plugin, multi-page: `main` + `widget`).
- `vitest.config.ts` — Vitest config (Playwright browser provider, chromium, `@/` alias).

## Data Flow

1. User clicks record → `start_recording` Tauri command → Rust opens mic via CPAL/ALSA
2. User clicks stop → `stop_recording` command → Rust emits `transcription-result` event with `Segment[]`
3. `useRecordingEvents` hook receives the event, updates history slice
4. History and live transcript rendered in `OverviewTab` and `HistoryTab`
5. Clicking a transcript block copies text via `useCopyText` (clipboard plugin + `write_primary`)

## Key Details

- Audio capture is done in Rust via CPAL/ALSA (not Web Audio API)
- whisper.cpp binary and model live in `whisper/` (gitignored), created by setup script
- Packaged app bundles whisper-cli and model as `resources` (see `src-tauri/tauri.conf.json`)
- Tauri command parameters: snake_case in Rust (`audio_data`) maps to camelCase in JS (`audioData`)
- Dev/prod path switching in Rust: `cfg!(debug_assertions)`
- Widget window: frameless, always-on-top, 200×52, transparent — listens to Rust events passively
- Testing: Vitest + Playwright browser provider + vitest-browser-react; run with `bun run test`
- State: Zustand v5 with feature-sliced store (`src/features/*/` + `src/stores/useAppStore.ts`)
- Theme: multi-theme system via CSS custom properties, synced across main + widget windows
