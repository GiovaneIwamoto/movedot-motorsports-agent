import './App.css';
import Sidebar from './components/Sidebar/Sidebar';
import AddCardPage from './Pages/AddCardPage/AddCardPage';
import ProfilePage from './Pages/ProfilePage/ProfilePage';
import SettingsPage from './Pages/SettingsPage/SettingsPage';
import AllCardsPage from './Pages/AllCardsPage/AllCardsPage';
import { NavigationProvider, useNavigation } from './components/NavigationContext/NavigationContext';
import { BackEndContext, BackEndProvider } from './components/NavigationContext/BackEndContext';

function Pages() {
  const { activePage, selectedCard } = useNavigation();



  switch (activePage) {
    case "Profile": return <ProfilePage />;
    case "All Cards": return <AllCardsPage />;
    case "Add Card": 
      return (
        <AddCardPage
          card_number={selectedCard ? selectedCard.id : -1}
          card_name={selectedCard?.name}
          card_description={selectedCard?.description}
        />
      );
    case "Settings": return <SettingsPage />;
    default: return <ProfilePage />;
  }
}

function App() {
  

  return (
    <NavigationProvider>
      <BackEndProvider>
        <div className="app">
          <div className="main_layout">
            <Sidebar/>
            <div className="Current_page">
              <Pages />
            </div>
          </div>
        </div>
      </BackEndProvider>
    </NavigationProvider>
    
  );
}

export default App;
