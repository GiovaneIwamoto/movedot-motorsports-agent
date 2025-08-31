import { useState } from 'react'
import './App.css'

function App() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsLoading(true)
    setResponse('')

    try {
      // TODO: Update this URL to your actual agent endpoint
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setResponse(data.response || 'Response received from agent')
      } else {
        setResponse('Error: Failed to get response from agent')
      }
    } catch (error) {
      setResponse('Error: Failed to connect to agent')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Personal Motorsport Agent</h1>
        <p>Send prompts to your AI agent</p>
      </header>

      <main className="main">
        <form onSubmit={handleSubmit} className="prompt-form">
          <div className="input-group">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              className="prompt-input"
              rows={4}
              disabled={isLoading}
            />
          </div>
          
          <button 
            type="submit" 
            className="send-button"
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? 'Sending...' : 'Send to Agent'}
          </button>
        </form>

        {response && (
          <div className="response-section">
            <h3>Agent Response:</h3>
            <div className="response-content">
              {response}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Agent is thinking...</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
