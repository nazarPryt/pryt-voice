#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WHISPER_DIR="$PROJECT_DIR/whisper"
WHISPER_CPP_DIR="$WHISPER_DIR/whisper.cpp"
MODELS_DIR="$WHISPER_DIR/models"

echo "=== Pryt Voice: whisper.cpp Setup ==="
echo ""

# Clone whisper.cpp if not present
if [ ! -d "$WHISPER_CPP_DIR" ]; then
  echo "[1/3] Cloning whisper.cpp..."
  mkdir -p "$WHISPER_DIR"
  git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git "$WHISPER_CPP_DIR"
else
  echo "[1/3] whisper.cpp already cloned, skipping..."
fi

# Build whisper.cpp
echo "[2/3] Building whisper.cpp..."
cd "$WHISPER_CPP_DIR"
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release -j "$(nproc)"

# Verify binary
if [ ! -f "$WHISPER_CPP_DIR/build/bin/whisper-cli" ]; then
  echo "ERROR: whisper-cli binary not found after build"
  exit 1
fi
echo "  Built: $WHISPER_CPP_DIR/build/bin/whisper-cli"

# Download model
mkdir -p "$MODELS_DIR"
MODEL_FILE="$MODELS_DIR/ggml-base.bin"
if [ ! -f "$MODEL_FILE" ]; then
  echo "[3/3] Downloading ggml-base.bin model (~145MB)..."
  curl -L --progress-bar \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" \
    -o "$MODEL_FILE"
else
  echo "[3/3] Model already downloaded, skipping..."
fi

echo ""
echo "=== Setup complete! ==="
echo "  Binary: $WHISPER_CPP_DIR/build/bin/whisper-cli"
echo "  Model:  $MODEL_FILE"
echo ""
echo "Test with:"
echo "  $WHISPER_CPP_DIR/build/bin/whisper-cli -m $MODEL_FILE -f <audio.wav>"
