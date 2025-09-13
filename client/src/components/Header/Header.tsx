import React from 'react';
import './Header.css';
import NewCardButton from '../Buttons/NewCardButton/NewCardButton';

interface HeaderProps {
    onNewCardClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewCardClick }) => {
    return (
        <div className='header'>
            <img></img>
            <p>Título do projeto</p>
            <NewCardButton onClick={onNewCardClick} />
        </div>
    );
};

export default Header;
