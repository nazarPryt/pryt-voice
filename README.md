# Pryt Voice

Local voice recognition desktop app. Runs 100% offline — no data leaves your machine.

Built with [Tauri v2](https://tauri.app) + React + [whisper.cpp](https://github.com/ggerganov/whisper.cpp) (C++ port of OpenAI's Whisper).

## How it works

Click the record button (or press your configured shortcut), speak, click again to stop. Your speech is transcribed locally using whisper.cpp and displayed on screen. A floating widget appears while recording and disappears after transcription. Transcriptions are saved to history and can be copied to clipboard.

Supports any spoken language. The output language and whisper model are configurable in Settings.

## Prerequisites

- **Rust** — install from [rustup.rs](https://rustup.rs)
- **Bun** — install from [bun.sh](https://bun.sh)
- **git**, **cmake**, **build-essential** (C++ compiler)
- **curl** (for downloading models)

### Ubuntu/Debian

```bash
sudo apt install build-essential cmake curl git
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libglib2.0-dev \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev \
  libasound2-dev libxdo-dev
```

### Fedora

```bash
sudo dnf install gcc-c++ cmake curl git
sudo dnf install webkit2gtk4.1-devel gtk3-devel openssl-devel librsvg2-devel \
  alsa-lib-devel libxdo-devel
```

### Arch

```bash
sudo pacman -S base-devel cmake curl git
sudo pacman -S webkit2gtk-4.1 gtk3 openssl librsvg alsa-lib xdotool
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

### 3. Build whisper.cpp and download models

This clones whisper.cpp, compiles it, and downloads both the `base` (~145 MB) and `small` (~488 MB) multilingual models:

```bash
bash scripts/setup-whisper.sh
```

### 4. Run the app

```bash
bun run dev
```

## Usage

1. Select your microphone from the dropdown
2. Click the record button (or press your configured shortcut) to start recording
3. Speak in any language
4. Click again to stop
5. Wait for transcription to appear
6. Click a transcript block to copy it to clipboard

The app has four tabs: **Overview** (recorder + live transcript), **History** (past sessions), **Shortcuts** (key bindings), and **Settings** (preferences).

## Settings

| Setting         | Options                 | Description                                               |
| --------------- | ----------------------- | --------------------------------------------------------- |
| Appearance      | themes                  | Visual theme                                              |
| History limit   | 1–20                    | Max transcriptions kept                                   |
| Whisper model   | Base / Small            | Base is faster (~2–4s), Small is more accurate (~5–10s)   |
| Output language | English / Keep original | Translate to English or transcribe in the spoken language |
| Auto-paste      | on/off                  | Paste result at cursor after global shortcut recording    |

## Packaging

Build a distributable package (AppImage + deb on Linux):

```bash
bun run build
```

Output will be in `src-tauri/target/release/bundle/`.

If you change the app icon, regenerate all required sizes from a square PNG source (512×512 RGBA):

```bash
bunx tauri icon src-tauri/icons/icon.png
```

## Dev tools

```bash
bun run format    # Format all source files with Prettier
bun run fix:css   # Fix SCSS property order with Stylelint
bun run test      # Run tests with Vitest
bun run test:ui   # Run tests with Vitest UI
```

## Versioning

Before a release, bump the version across all three files (`package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`) in one command:

```bash
bun run version
```

It will prompt for the new version. You can also pass it directly: `bun run version 2.1.0`.

Then build as usual:

```bash
bun run build
```

## Tech stack

- **Tauri v2** (Rust backend + WebView frontend shell)
- **React + TypeScript + Vite**
- **Zustand** (state management, feature-sliced store)
- **Radix UI Tabs** (sidebar navigation)
- **SCSS Modules** (scoped styles, per-component)
- **whisper.cpp** (spawned as a child process)
- **CPAL/ALSA** (audio capture via Rust)
- **ggml-base.bin** / **ggml-small.bin** multilingual models
