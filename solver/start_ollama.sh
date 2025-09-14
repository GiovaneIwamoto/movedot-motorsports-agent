echo "🚀 Starting Ollama server..."

ollama serve &

SERVER_PID=$!

sleep 5

echo "📥 Pulling Llama3.2 model..."
ollama pull llama3.2

