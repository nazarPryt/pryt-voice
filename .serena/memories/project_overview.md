# Project Overview: pryt-voice

## Purpose
Local, offline voice recognition desktop app. Captures audio, transcribes via whisper.cpp (runs locally), and copies results to clipboard.

## Tech Stack
- **Shell**: Tauri v2 (Rust backend)
- **Frontend**: React 18 + TypeScript + Vite 6 + SCSS Modules
- **State**: Zustand v5
- **UI**: Radix UI Tabs, Lucide React icons, clsx
- **Audio**: Web Audio API + AudioWorklet at 16kHz mono
- **Transcription**: whisper.cpp (`whisper-cli`) spawned as child process from Rust
- **Package manager**: bun (always use bun, never npm)
- **Testing**: Vitest + Playwright browser provider + vitest-browser-react

## Codebase Structure
```
pryt-voice/
├── src/                      # React frontend
│   ├── App.tsx               # Root: state, spacebar shortcut, mic enum
│   ├── main.tsx              # Vite entry
│   ├── recorder.ts           # AudioRecorder class (AudioWorklet)
│   ├── styles.scss           # Global styles
│   ├── shared/types.ts       # Shared TypeScript types
│   ├── hooks/
│   │   ├── useRecorder.ts    # React wrapper around AudioRecorder
│   │   ├── useTranscription.ts # invoke('transcribe'), accumulates Segment[][]
│   │   └── useCopyText.ts    # Clipboard write (CLIPBOARD + PRIMARY)
│   ├── stores/
│   │   └── useAppStore.ts    # Zustand store (centralized state)
│   ├── features/             # Feature slices (Zustand state + hooks per feature)
│   │   ├── recording/        # recordingSlice, useRecordingEvents
│   │   ├── history/          # historySlice (persistent transcription history)
│   │   ├── shortcuts/        # shortcutsSlice, useShortcutRegistration, formatShortcut
│   │   ├── mics/             # micsSlice
│   │   ├── settings/         # settingsSlice, useSettingsSync
│   │   ├── setup/            # setupSlice, useWhisperSetup
│   │   ├── status/           # statusSlice
│   │   └── theme/            # themeSlice, useThemeSync, applyTheme
│   └── components/           # Per-component folders (Component + .module.scss + index.ts)
│       ├── Header/
│       ├── MicSelect/
│       ├── RecordButton/
│       ├── StatusBar/
│       ├── TranscriptArea/
│       ├── TranscriptBlock/
│       ├── OverviewTab/      # Main recorder + live transcript tab
│       ├── HistoryTab/       # Persistent transcription history
│       ├── ShortcutsTab/
│       ├── SettingsTab/      # Settings: theme, history limit, model, output language, auto-paste
│       └── Widget/           # Floating always-on-top window (passive, event-driven)
├── src-tauri/
│   └── src/
│       ├── main.rs           # Tauri entry: registers commands, inits clipboard plugin
│       ├── whisper.rs        # Float32Array→WAV, spawn whisper-cli, parse output
│       ├── model_manager.rs  # Resolves whisper-cli and model paths
│       ├── widget.rs         # Floating widget window management
│       ├── audio.rs          # Audio processing helpers
│       └── paste.rs          # Paste/clipboard helpers
├── public/
│   └── audio-processor.js   # AudioWorkletProcessor
├── index.html                # Main entry HTML
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── package.json
└── .prettierrc.json
```

## Data Flow
1. User clicks record → `start_recording` Tauri command → Rust opens mic via CPAL/ALSA
2. User clicks stop → `stop_recording` → Rust reads TranslateState + ModelState, runs whisper-cli
3. whisper-cli flags: `-l auto` always; `--translate` added when output language = English
4. `Segment[]` emitted as `transcription-result` event → frontend updates history + live transcript
5. Clicking a transcript block copies text via clipboard plugin + `write_primary`

## Important Notes
- Audio: always 16kHz mono PCM (whisper.cpp requirement)
- whisper.cpp binary + models in `whisper/` (gitignored), created by setup script
- Two models: `ggml-base.bin` (~145 MB, fast) and `ggml-small.bin` (~488 MB, accurate)
- Must pass `-l auto` explicitly — whisper-cli defaults to `-l en` without it
- Tauri IPC: snake_case Rust ↔ camelCase JS auto-mapped
- Dev mode: `cfg!(debug_assertions)` for path switching in Rust
- Alias: `@/` → `src/` in both Vite and Vitest configs
