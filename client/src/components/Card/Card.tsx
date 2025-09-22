import React, { useState, useEffect } from 'react';
import { FileText, MoreHorizontal, Star } from "lucide-react"; // Apenas Star
import './Card.css';
import { useNavigation } from '../NavigationContext/NavigationContext';
import { useBackend } from '../NavigationContext/BackEndContext';

interface CardProps {
  Id: number;
  Title: string;
  Description: string;
  Photo: File | Blob | string | null; // aceita blob também
  file_url: string;
  onClick: () => void;
  onDelete?: (id: number) => void;
}
const Card: React.FC<CardProps> = ({ Id, Title, Description, Photo, file_url, onClick, onDelete }) => {
  const { goToAddCardPage } = useNavigation();
  const { delete_card } = useBackend();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | undefined>(undefined);

  useEffect(() => {
    let url: string | undefined;

    if (Photo instanceof File || Photo instanceof Blob) {
      url = URL.createObjectURL(Photo);
      setPhotoURL(url);

      return () => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      };
    } else if (typeof Photo === 'string') {
      setPhotoURL(Photo);
    } else {
      setPhotoURL(undefined);
    }
  }, [Photo]);



  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleMenuAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    switch (action) {
      case "delete":
        if (onDelete){
          onDelete(Id);
        }  
        delete_card(Id);
        break;
      case "edit":
        if (goToAddCardPage) {
          goToAddCardPage({ 
            id: Id, 
            name: Title, 
            description: Description,
            data_type: "", 
            data_file: "", 
            data_url: "",
            favorite: false,
            photo: null
          });
        }
        break;
      default:
        break;
    }
    setMenuOpen(false);
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorited(!favorited);
  };

  const openDoc = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(file_url, "_blank");
  };

  return (
    <div className="card" onClick={onClick}>
      <div className="card_header">
        <div className="menu_container">
          <MoreHorizontal className="menu_icon" onClick={toggleMenu} />
          {menuOpen && (
            <div className="menu_dropdown" onClick={(e) => e.stopPropagation()}>
              <button onClick={(e) => handleMenuAction(e, "edit")}>Editar</button>
              <button onClick={(e) => handleMenuAction(e, "delete")}>Excluir</button>
            </div>
          )}
        </div>
      </div>

      <div className="icons">
        <div className="document_icon" onClick={openDoc}>
          <FileText size={20} stroke="var(--text-color)" />
        </div> 
        <div className="favorite_icon" onClick={toggleFavorite}>
          <Star 
            size={20} 
            fill={favorited ? "var(--details-color)" : "none"} 
            stroke={favorited ? "var(--details-color)" : "var(--text-color)"} 
          />
        </div>
      </div>

      {photoURL && <img className="card_image" src={photoURL} alt="card_picture" />}

      <div className="card_text">
        <h2>{Title}</h2>
        <p>{Description}</p>
      </div>
    </div>
  );
};

export default Card;
