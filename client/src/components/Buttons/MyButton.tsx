import React, { useState } from 'react';
import './MyButton.css';

interface MyButtonProps {
  Text: string;
  Type?: "button" | "submit" | "reset"
  Colored: boolean;
  onClick?: () => void;
  isLoading? :boolean
}

const MyButton: React.FC<MyButtonProps> = ({ Text,Type, Colored, onClick }) => {
  return (
    <button type={Type? Type : "button"}      
    className={`myButton ${Colored ? "colored" : ""}`} onClick={onClick}>
        {Text}
    </button>
  );
};

export default MyButton;
