# Suggested Commands: pryt-voice

## Development
```bash
bun run dev          # Start Tauri dev window (Vite + Tauri, hot reload)
bun run vite:dev     # Start Vite only (port 1420)
```

## Build
```bash
bun run build        # Tauri production build (output: src-tauri/target/release/)
bun run vite:build   # Vite frontend only (output: dist/)
```

## Testing
```bash
bun run test         # Run Vitest (browser/Playwright)
bun run test:ui      # Run Vitest with UI dashboard
```

## Formatting & Linting
```bash
bun run format       # Prettier --write .
bun run fix:css      # Stylelint --fix all .scss files
```

## Setup (first time)
```bash
bun install
bash scripts/setup-whisper.sh   # Clones + compiles whisper.cpp, downloads model (~142MB)
```

## Symlinks required on Linux (for Tauri non-interactive shell)
```bash
sudo ln -s ~/.cargo/bin/cargo /usr/local/bin/cargo
sudo ln -s ~/.cargo/bin/rustc /usr/local/bin/rustc
sudo ln -s ~/.bun/bin/bun /usr/local/bin/bun
```

## Git / Utility
```bash
git status / git diff / git log
bun add <pkg>        # Add dependency
bun add -d <pkg>     # Add dev dependency
```
