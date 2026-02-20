# Pryt Voice

Local voice recognition desktop app. Runs 100% offline — no data leaves your machine.

Built with [Tauri v2](https://tauri.app) + React + [whisper.cpp](https://github.com/ggerganov/whisper.cpp) (C++ port of OpenAI's Whisper).

## How it works

Click the record button (or press spacebar), speak, click again to stop. Your speech is transcribed locally using whisper.cpp and displayed on screen.

## Prerequisites

- **Rust** — install from [rustup.rs](https://rustup.rs)
- **Bun** — install from [bun.sh](https://bun.sh)
- **git**, **cmake**, **build-essential** (C++ compiler)
- **curl** (for downloading the model)

### Ubuntu/Debian

```bash
sudo apt install build-essential cmake curl git
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libglib2.0-dev \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### Fedora

```bash
sudo dnf install gcc-c++ cmake curl git
sudo dnf install webkit2gtk4.1-devel gtk3-devel openssl-devel librsvg2-devel
```

### Arch

```bash
sudo pacman -S base-devel cmake curl git
sudo pacman -S webkit2gtk-4.1 gtk3 openssl librsvg
```

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/nazarPryt/pryt-voice
cd pryt-voice
```

### 2. Install JS dependencies

```bash
bun install
```

### 3. Build whisper.cpp and download the model

This clones whisper.cpp, compiles it, and downloads the `base.en` model (~142 MB):

```bash
bash scripts/setup-whisper.sh
```

### 4. Run the app

```bash
bun run dev
```

## Usage

1. Select your microphone from the dropdown
2. Click the record button (or press **spacebar**) to start recording
3. Speak
4. Click again (or press **spacebar**) to stop
5. Wait for transcription to appear

## Packaging

Build a distributable package (AppImage + deb on Linux):

```bash
bun run build
```

Output will be in `src-tauri/target/release/bundle/`.

If you change the app icon, regenerate all required sizes from a square PNG source (512×512 RGBA):

```bash
bun run tauri icon src-tauri/icons/icon.png
```

## Project structure

```
src/
  components/
    Header/               # Whisper status + app title
    MicSelect/            # Microphone dropdown
    RecordButton/         # Record/stop button
    StatusBar/            # Status text
    TranscriptArea/       # Scrollable transcript list
    TranscriptBlock/      # Single transcript entry (click to copy)
  hooks/
    useRecorder.ts        # AudioRecorder React wrapper
    useTranscription.ts   # Transcription state + invoke
    useCopyText.ts        # Clipboard copy + copied state
  shared/
    types.ts              # Shared TypeScript types
  recorder.ts             # AudioWorklet-based mic capture
  App.tsx                 # Root component
public/
  audio-processor.js      # AudioWorklet processor (16kHz mono)
src-tauri/
  src/                    # Rust backend
    main.rs               # Tauri entry, registers commands
    whisper.rs            # WAV encoding, whisper-cli spawning, output parsing
    model_manager.rs      # Resolves whisper-cli and model paths
  icons/                  # App icons (all sizes)
  tauri.conf.json         # Tauri config
  capabilities/           # Tauri v2 permission grants
scripts/
  setup-whisper.sh        # Builds whisper.cpp + downloads model
whisper/                  # Created by setup script, .gitignored
```

## Dev tools

```bash
bun run format    # Format all source files with Prettier
bun run fix:css   # Fix SCSS property order with Stylelint
```

## Tech stack

- **Tauri v2** (Rust backend + WebView frontend shell)
- **React + TypeScript + Vite**
- **SCSS Modules** (scoped styles, per-component)
- **whisper.cpp** (spawned as a child process)
- **Web Audio API** (AudioWorklet for 16kHz mono capture)
- **ggml-base.en** model (English, good speed/accuracy balance)
