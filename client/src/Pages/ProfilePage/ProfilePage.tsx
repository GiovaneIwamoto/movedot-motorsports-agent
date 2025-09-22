import React, { useState } from "react";
import Card from "../../components/Card/Card";
import "./ProfilePage.css";
import profilepicture from "../../assets/profile.png"
import PromptScreen from "../../components/Screens/PromptScreen/PromptScreen";

const ProfilePage: React.FC = () => {
  const [PromptScreenOpen, SetPromptScreenOpen] = useState(false);
  const openPromptScreen = () => SetPromptScreenOpen(true);
  const closePromptScreen = () => SetPromptScreenOpen(false);
  
  const favoritos = [
    { id: 1, Title: "React", Description: "Biblioteca para interfaces", Photo: "https://reactjs.org/logo-og.png" },
    { id: 2, Title: "Node.js", Description: "JavaScript no backend", Photo: "https://nodejs.org/static/images/logo.svg" },
  ];

  const ultimos = [
    { id: 3, Title: "Docker", Description: "Containerização de apps", Photo: "https://www.docker.com/wp-content/uploads/2022/03/vertical-logo-monochromatic.png" },
    { id: 4, Title: "TypeScript", Description: "Superset do JavaScript", Photo: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg" },
    { id: 5, Title: "Git", Description: "Controle de versão", Photo: "https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png" },
  ];

  return (
    <div className="home_page">
      <section className="profile_section">
        <img
          src={profilepicture   }
          alt="Foto de perfil"
          className="profile_photo"
        />
        <div className="profile_info">
          <h1>Profile</h1>
          <p>Potential Client</p>
          <p>Software developer</p>
        </div>
      </section>

      {/* Favoritos */}
      <section className="favorites_section">
        <h2>Favorites</h2>
        <div className="cards_grid">
          {favoritos.map((card) => (
            <Card
              key={card.id}
              Title={card.Title}
              Description={card.Description}
              Photo={card.Photo}
              onClick={openPromptScreen}
            />
          ))}
        </div>
      </section>

      {/* Últimos utilizados */}
      <section className="recent_section">
        <h2>Recently used</h2>
        <div className="cards_grid">
          {ultimos.map((card) => (
            <Card
              key={card.id}
              Title={card.Title}
              Description={card.Description}
              Photo={card.Photo}
              onClick={openPromptScreen}
            />
          ))}
        </div>
      </section>
      {PromptScreenOpen && <PromptScreen onClose={closePromptScreen} />}  
    </div>
  );
};

export default ProfilePage;
