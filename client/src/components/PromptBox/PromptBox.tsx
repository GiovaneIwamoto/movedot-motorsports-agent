import React from 'react';
import './PromptBox.css';

interface PromptBoxProps {
  prompt: string;
  setPrompt: (value: string) => void;
  isLoading: boolean;
}

const PromptBox: React.FC<PromptBoxProps> = ({ prompt, setPrompt, isLoading }) => {
  return (
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
  );
};

export default PromptBox;
