import React from 'react';
import './SubmitButton.css';

interface SubmitButtonProps {
  prompt: string;
  isLoading: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ prompt, isLoading }) => {
  return (
    <button
      type="submit"
      className="submit-button"
      disabled={isLoading || !prompt.trim()}
    >
      {isLoading ? 'Sending...' : 'Send to Agent'}
    </button>
  );
};

export default SubmitButton;



