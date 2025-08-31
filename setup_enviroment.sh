echo "🚀 Starting Ollama server..."
# inicia o server em background
ollama serve &

# guarda o PID para poder parar depois
SERVER_PID=$!

# dá um tempo para o server iniciar
sleep 5

echo "📥 Pulling Llama3.2 model..."
ollama pull llama3.2

# opcional: parar o server depois
# kill $SERVER_PID
