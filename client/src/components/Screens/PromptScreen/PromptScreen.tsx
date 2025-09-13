import './PromptScreen.css';
import React, { useState } from "react";
import PromptBox from '../../PromptBox/PromptBox';
import AnswerBox from '../../AnswerBox/AnswerBox';
import LoadingDisplay from '../../LoadingDisplay/LoadingDisplay';
import SubmitButton from '../../Buttons/SubmitButton/SubmitButton';

interface PromptScreenProps {
    onClose: () => void;
}

const PromptScreen: React.FC<PromptScreenProps> = ({ onClose }) => {
    const [prompt, setPrompt] = useState(
        'I would like to know information about session key 9161, about driver number 63'
    );
    const [isLoading, setIsLoading] = useState(false)
    const [response, setResponse] = useState('')

    const handleBackgroundClick = () => {
        onClose();
    };

    const handleBoxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

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
        <div className="register_background" onClick={handleBackgroundClick}>
            <div className="register_box" onClick={handleBoxClick}>
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
            </div>
        </div>
    );
};

export default PromptScreen;
