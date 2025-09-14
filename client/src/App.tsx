import './App.css'
import Card from './components/Card/Card';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import { useState, useEffect } from 'react';
import NewCardScreen from './components/Screens/NewCardScreen/NewCardScreen';
import PromptScreen from './components/Screens/PromptScreen/PromptScreen';

function App() {


  interface CardData {
    id: number;
    name: string;
    description: string;
    photo: string;
  }

  const [NewCardScreenOpen, SetNewCardScreenOpen] = useState(false);
  const [PromptScreenOpen, SetPromptScreenOpen] = useState(false);
  const [cards, setCards] = useState<CardData[]>([]);


  const openNewScreen = () => SetNewCardScreenOpen(true);
  const closeNewScreen = () => SetNewCardScreenOpen(false);

  const openPromptScreen = () => SetPromptScreenOpen(true);
  const closePromptScreen = () => SetPromptScreenOpen(false);


    useEffect(() => {
    fetch("http://localhost:8000/api/getcards")
      .then((res) => res.json())
      .then((data) => setCards(data))
      .catch((err) => console.error("Erro ao buscar cards:", err));
  }, []);

  return (
    <div className="app">
      {NewCardScreenOpen && <NewCardScreen onClose={closeNewScreen} />}
      {PromptScreenOpen && <PromptScreen onClose={closePromptScreen} />}
      <Header onNewCardClick={openNewScreen} />
      <div className="workspace">
        <Sidebar />
        <div className="cardsContainer">
          {cards.map((card) => (
            <Card
              key={card.id}
              Title={card.name}
              Description={card.description}
              Photo={card.photo}
              onClick={openPromptScreen}
            />
          ))}
        </div>
      </div>
    </div>


  )
}

export default App
