import React from 'react';
import './NewCardButton.css';

interface NewCardButtonProps {
  onClick: () => void;
}

const NewCardButton: React.FC<NewCardButtonProps> = ({ onClick }) => {
  return (
    <button
      type="submit"
      className="newcard-button"
      onClick={onClick}
    >New Card</button>
  );
};

export default NewCardButton;



