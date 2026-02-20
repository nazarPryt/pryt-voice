# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Pryt Voice — a local, offline voice recognition desktop app. Tauri v2 shell with a React + TypeScript frontend. The frontend captures audio via Web Audio API (AudioWorklet at 16kHz mono), sends it to the Rust backend via Tauri `invoke`, which spawns `whisper-cli` (whisper.cpp) as a child process for transcription.

## Commands

```bash
bun run dev          # Start Tauri dev window with hot reload (requires system deps + whisper setup)
bun run build        # Build + package app (output in src-tauri/target/release/)
bun run vite:dev     # Start Vite dev server only (port 1420)
bun run vite:build   # Build frontend only (output in dist/)
```

First-time setup requires Rust and system deps:
```bash
# 1. Install Rust: https://rustup.rs
# 2. Install system deps (Ubuntu/Debian):
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libglib2.0-dev \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev
# 3. Install JS deps and whisper.cpp:
bun install
bash scripts/setup-whisper.sh   # clones whisper.cpp, compiles it, downloads ggml-base.en.bin (~142MB)
```
## Prerequisites

On Linux Before running the project, make sure the following tools are symlinked to `/usr/local/bin` so Tauri can find them in non-interactive shells:
```bash
sudo ln -s ~/.cargo/bin/cargo /usr/local/bin/cargo
sudo ln -s ~/.cargo/bin/rustc /usr/local/bin/rustc
sudo ln -s ~/.bun/bin/bun /usr/local/bin/bun
```

This is required because Tauri runs `beforeDevCommand` and `beforeBuildCommand` via `/bin/sh`, which doesn't source your shell's PATH.

## Architecture

Two parts: Rust backend (`src-tauri/`) and React frontend (`src/`).

### Rust Backend (`src-tauri/src/`)
- `main.rs` — Tauri app entry: registers `transcribe` and `check_whisper` commands, inits clipboard plugin.
- `whisper.rs` — Encodes Float32Array→WAV, spawns whisper-cli, parses timestamped output into `Segment[]`.
- `model_manager.rs` — Resolves whisper-cli and model paths. Dev: CWD-relative `whisper/whisper.cpp/build/bin/`. Production: `resource_dir/whisper/`.

### React Frontend (`src/`)
- `main.tsx` — Vite entry, React root mount.
- `App.tsx` — Root component: composes all UI, handles state, spacebar shortcut, mic enumeration.
- `recorder.ts` — `AudioRecorder` class using AudioWorklet for 16kHz capture.
- `hooks/useRecorder.ts` — React hook wrapping `AudioRecorder`.
- `hooks/useTranscription.ts` — (utility hook, not currently used by App.tsx directly).
- `components/` — Header, MicSelect, RecordButton, StatusBar, TranscriptArea, TranscriptBlock.
- `public/audio-processor.js` — AudioWorkletProcessor that buffers samples.

### Config
- `src-tauri/tauri.conf.json` — Tauri config: window, bundle resources, dev/build commands.
- `src-tauri/capabilities/main.json` — Tauri v2 capability grants (clipboard write, core defaults).
- `vite.config.ts` — Vite config (port 1420, React plugin, chrome105 target).

## Data Flow

1. User clicks record → `AudioRecorder.start()` opens mic stream at 16kHz, connects to AudioWorklet
2. User clicks stop → worklet sends accumulated Float32Array back via port message
3. React calls `invoke('transcribe', { audioData })` (Tauri IPC to Rust)
4. Rust writes WAV to temp file, spawns `whisper-cli -m <model> -f <file>`, parses stdout
5. `Segment[]` returned to frontend for display; clicking a block copies text via clipboard plugin

## Key Details

- Audio is always 16kHz mono PCM (whisper.cpp requirement)
- whisper.cpp binary and model live in `whisper/` (gitignored), created by setup script
- Packaged app bundles whisper-cli and model as `resources` (see `src-tauri/tauri.conf.json`)
- Tauri command parameters: snake_case in Rust (`audio_data`) maps to camelCase in JS (`audioData`)
- No test framework is currently configured
