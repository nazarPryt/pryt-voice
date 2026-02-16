# Pryt Voice

Local voice recognition desktop app. Runs 100% offline — no data leaves your machine.

Built with Electron + [whisper.cpp](https://github.com/ggerganov/whisper.cpp) (C++ port of OpenAI's Whisper).

## How it works

Click the record button (or press spacebar), speak, click again to stop. Your speech is transcribed locally using whisper.cpp and displayed on screen.

## Prerequisites

- **Node.js** >= 18
- **git**, **cmake**, **build-essential** (C++ compiler)
- **curl** (for downloading the model)

### Ubuntu/Debian

```bash
sudo apt install build-essential cmake curl git
```

### Fedora

```bash
sudo dnf install gcc-c++ cmake curl git
```

### Arch

```bash
sudo pacman -S base-devel cmake curl git
```

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/nazarPryt/pryt-voice
cd pryt-voice
```

### 2. Install Node dependencies

```bash
npm install
```

### 3. Build whisper.cpp and download the model

This clones whisper.cpp, compiles it, and downloads the `base.en` model (~142 MB):

```bash
bash scripts/setup-whisper.sh
```

### 4. Run the app

```bash
npm run dev
```

## Usage

1. Select your microphone from the dropdown
2. Click the record button (or press **spacebar**) to start recording
3. Speak
4. Click again (or press **spacebar**) to stop
5. Wait for transcription to appear

## Packaging

Build a distributable Linux package (AppImage + deb):

```bash
npm run package:linux
```

Output will be in the `dist/` directory.

## Project structure

```
src/
  main/           # Electron main process (IPC, whisper.cpp integration)
  preload/        # Context bridge (renderer <-> main)
  renderer/       # UI (HTML, CSS, TypeScript, AudioWorklet)
scripts/
  setup-whisper.sh  # Builds whisper.cpp + downloads model
whisper/            # Created by setup script, .gitignored
```

## Tech stack

- **Electron** + **electron-vite** (TypeScript)
- **whisper.cpp** (spawned as a child process)
- **Web Audio API** (AudioWorklet for 16kHz mono capture)
- **ggml-base.en** model (English, good speed/accuracy balance)
