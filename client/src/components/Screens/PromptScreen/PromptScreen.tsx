import './PromptScreen.css';
import React, { useState } from "react";
import PromptBox from '../../PromptBox/PromptBox';
import AnswerBox from '../../AnswerBox/AnswerBox';
import LoadingDisplay from '../../LoadingDisplay/LoadingDisplay';
import MyButton from '../../Buttons/MyButton';

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
        <div className="promptScreen_background" onClick={handleBackgroundClick}>
            <div className="side_panel" onClick={(e) => e.stopPropagation()}>
                {response && <AnswerBox response={response} />}
                {isLoading && <LoadingDisplay />}
                <form onSubmit={handleSubmit} className="prompt-form">
                <div className="promptScreen_footer">
                    <PromptBox prompt={prompt} setPrompt={setPrompt} isLoading={isLoading} />
                    <MyButton Type="submit"   Text="Send Message" isLoading={isLoading} Colored={true} />  
                </div>    
                </form>
            </div>
        </div>
    );
};

export default PromptScreen;
