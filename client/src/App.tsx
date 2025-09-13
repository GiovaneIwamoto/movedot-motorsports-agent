import './App.css'
import Card from './components/Card/Card';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import { useState } from 'react';
import NewCardScreen from './components/Screens/NewCardScreen/NewCardScreen';
import PromptScreen from './components/Screens/PromptScreen/PromptScreen';

function App() {


  const [NewCardScreenOpen, SetNewCardScreenOpen] = useState(false);
  const [PromptScreenOpen, SetPromptScreenOpen] = useState(false);



  const openNewScreen = () => SetNewCardScreenOpen(true);
  const closeNewScreen = () => SetNewCardScreenOpen(false);

  const openPromptScreen = () => SetPromptScreenOpen(true);
  const closePromptScreen = () => SetPromptScreenOpen(false);

  return (
    <div className="app">
      {NewCardScreenOpen && <NewCardScreen onClose={closeNewScreen} />}
      {PromptScreenOpen && <PromptScreen onClose={closePromptScreen} />}
      <Header onNewCardClick={openNewScreen} />
      <div className="workspace">
        <Sidebar />
        <div className="cardsContainer">
          <Card onClick={openPromptScreen} />
        </div>
      </div>
    </div>


  )
}

export default App
