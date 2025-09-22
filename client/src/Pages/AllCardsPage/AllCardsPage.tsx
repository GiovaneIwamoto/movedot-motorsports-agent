import React, { useEffect, useState } from "react";
import './AllCardsPage.css';
import Card from "../../components/Card/Card";
import PromptScreen from "../../components/Screens/PromptScreen/PromptScreen";
import type { CardData } from "../../components/NavigationContext/DataStructuresContext";




const AllCardsPage: React.FC = () => {
    const [cards, setCards] = useState<CardData[]>([]);
    const [PromptScreenOpen, SetPromptScreenOpen] = useState(false);

    const openPromptScreen = () => SetPromptScreenOpen(true);
    const closePromptScreen = () => SetPromptScreenOpen(false);

    useEffect(() => {
        fetch("http://localhost:8000/api/getcards")
          .then((res) => res.json())
          .then((data) => setCards(data))
          .catch((err) => console.error("Erro ao buscar cards:", err));
    }, []);

    return (
    <div className="homepage_background">
        {cards.map((card) => (
            <Card
                Id={card.id}
                Title={card.name}
                file_url="https://openf1.org/"
                Description={card.description}
                Photo={card.photo}
                onClick={openPromptScreen}
                onDelete={(id) => {
                setCards((prev) => prev.filter((c) => c.id !== id))}}
            />
        ))}
        {PromptScreenOpen && <PromptScreen onClose={closePromptScreen} />}
    </div>
);
};

export default AllCardsPage;
