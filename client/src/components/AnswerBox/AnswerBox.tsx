import React from 'react';
import './AnswerBox.css';

interface AnswerBoxProps {
  response: string;
}

const AnswerBox: React.FC<AnswerBoxProps> = ({ response }) => {
  return (
    <div className="AnswerBox-section">
        <h3>Agent Response:</h3>
        <div className="AnswerBox-content">{response}</div>
    </div>
  );
};

export default AnswerBox;
