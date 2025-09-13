import { useState } from 'react'
import './App.css'
import PromptBox from './components/PromptBox/PromptBox'
import SubmitButton from './components/SubmitButton/SubmitButton';
import AnswerBox from './components/AnswerBox/AnswerBox';
import LoadingDisplay from './components/LoadingDisplay/LoadingDisplay';

function App() {
  const [prompt, setPrompt] = useState(
    'I would like to know information about session key 9161, about driver number 63'
  );
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsLoading(true)
    setResponse('')

    try {
      const response = await fetch('http://localhost:8000/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          <PromptBox
            prompt={prompt}
            setPrompt={setPrompt}
            isLoading={isLoading}
          />
          <SubmitButton
            prompt={prompt}
            isLoading={isLoading} />
        </form>

        {response && (
          <AnswerBox
            response={response} />
        )}

        {isLoading && (
          <LoadingDisplay />
        )}
      </main>
    </div>
  )
}

export default App
