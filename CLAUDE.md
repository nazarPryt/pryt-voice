# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Pryt Voice — a local, offline voice recognition desktop app. Electron frontend captures audio via Web Audio API (AudioWorklet at 16kHz mono), sends it to the main process over IPC, which spawns `whisper-cli` (whisper.cpp) as a child process for transcription.

## Commands

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production (electron-vite build)
npm run package:linux  # Build + package as AppImage/deb (output in dist/)
```

First-time setup requires building whisper.cpp and downloading the model:
```bash
npm install
bash scripts/setup-whisper.sh   # clones whisper.cpp, compiles it, downloads ggml-base.en.bin (~142MB)
```

## Architecture

Three Electron processes, built with **electron-vite** (config in `electron.vite.config.ts`):

- **Main** (`src/main/`) — Electron main process. Handles IPC, spawns whisper-cli.
  - `index.ts` — Window creation, IPC handlers (`whisper:transcribe`, `whisper:check`), mic permission grant.
  - `whisper.ts` — Encodes Float32Array→WAV, spawns whisper-cli, parses timestamped output into `Segment[]`.
  - `model-manager.ts` — Resolves whisper-cli and model paths (dev vs packaged). Dev uses `whisper/whisper.cpp/build/bin/`, packaged uses `process.resourcesPath/whisper/`.

- **Preload** (`src/preload/index.ts`) — Context bridge exposing `window.api.transcribe()` and `window.api.checkWhisper()`.

- **Renderer** (`src/renderer/`) — UI, no framework (vanilla TS + CSS).
  - `src/main.ts` — App logic: mic selection, record toggle (click/spacebar), transcription display.
  - `src/recorder.ts` — `AudioRecorder` class using AudioWorklet for 16kHz capture. Audio data flows back via worklet port messaging.
  - `public/audio-processor.js` — AudioWorkletProcessor that buffers samples and returns them on stop.

## Data Flow

1. User clicks record → `AudioRecorder.start()` opens mic stream at 16kHz, connects to AudioWorklet
2. User clicks stop → worklet sends accumulated Float32Array back via port message
3. Renderer converts to `number[]`, calls `window.api.transcribe()` (IPC to main)
4. Main process writes WAV to temp file, spawns `whisper-cli -m <model> -f <file>`, parses stdout
5. Segments returned to renderer for display

## Key Details

- Audio is always 16kHz mono PCM (whisper.cpp requirement)
- whisper.cpp binary and model live in `whisper/` (gitignored), created by setup script
- Packaged app bundles whisper-cli and model as `extraResources` (see `package.json` build config)
- No test framework is currently configured
