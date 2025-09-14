import React from 'react';
import './Card.css';


interface CardProps {
  Title: string;
  Description: string;
  Photo: string;
  onClick: () => void;
}

const Card: React.FC<CardProps> = ({ Title, Description, Photo, onClick }) => {
  return (
    <div className="card" onClick={onClick}>
      <img className="card_image" src={Photo} alt="card_picture" />
      <h2>{Title}</h2>
      <p>{Description}</p>
    </div>
  );
};

export default Card;
