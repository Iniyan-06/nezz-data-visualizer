#!/bin/bash

echo "🚀 Starting Nezz One-Command Setup..."

# 1. Check for Ollama
if ! command -v ollama &> /dev/null
then
    echo "❌ Ollama is not installed."
    echo "Please download and install it from: https://ollama.com"
    exit 1
fi

# 2. Pull the optimized 0.6B model
echo "📦 Pulling Qwen 3 0.6B (optimized for 8GB RAM)..."
ollama pull qwen3:0.6b

# 3. Install NPM dependencies
echo "🛠️ Installing project dependencies..."
npm install

# 4. Start the application
echo "✨ Setup complete! Launching Nezz..."
echo "Open http://localhost:3000 in your browser."
npm run dev
