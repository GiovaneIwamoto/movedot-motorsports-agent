import React from 'react';
import './LoadingDisplay.css';

interface LoadingDisplayProps {}

const LoadingDisplay: React.FC<LoadingDisplayProps> = () => {
  return (
    <div className="loading">
        <div className="spinner"></div>
        <p>Agent is thinking...</p>
    </div>
  );
};

export default LoadingDisplay;
