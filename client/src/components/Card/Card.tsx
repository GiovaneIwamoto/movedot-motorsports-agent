import React from 'react';
import './Card.css';
import motorsportImage from "../../assets/motorsport_image.jpg";


interface CardProps {
    onClick: () => void;
}

const Card: React.FC<CardProps> = ({ onClick }) => {
    return (
        <div className='card' onClick={onClick}>
            <img className="card_image" src={motorsportImage} alt="card_picture"></img>
            <h2>F1 API</h2>
            <p>Data from formula 1</p>
        </div>
    );
};

export default Card;
