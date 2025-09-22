import React, { useState } from "react";
import { Sun, Moon} from "lucide-react";
import "./SettingsPage.css";
import MyButton from "../../components/Buttons/MyButton";
import { useNavigation } from "../../components/NavigationContext/NavigationContext";

const SettingsPage: React.FC = () => {
  const { userColor, userTheme, configureDisplayOptions } = useNavigation();
  
  const [showFavorites, setShowFavorites] = useState(true);
  const [showRecent, setShowRecent] = useState(true);
  const [cardsPerRow, setCardsPerRow] = useState(3);

  const appVersion = "1.0.0";



  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    configureDisplayOptions(color); // passa só a cor
  };

  const handleThemeToggle = () => {
    const newTheme = userTheme === "light" ? "dark" : "light";
    configureDisplayOptions(undefined, newTheme); // passa só o tema
  };


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Configurações salvas!");
  };

  const handleHelp = () => {
    alert("Ajuda: Configure o aplicativo conforme suas preferências.\n\n- Toggle de tema: alterna claro/escuro.\n- Cards: mostra ou esconde favoritos e últimos utilizados.\n- Cor de detalhes: muda a cor principal do app.");
  };

  return (
    <div className="settings_page_app">
      <h2>Configurações</h2>

      <form onSubmit={handleSave} className="settings_form_app">

        {/* Tema */}
        <section className="settings_section_app">
          <h3>Tema do Aplicativo</h3>
          <div className="theme_toggle">
            <button type="button" onClick={handleThemeToggle} className="theme_button">
              {userTheme === "light" ? <Sun size={20} /> : <Moon size={20} />}
              <span>{userTheme === "light" ? "Claro" : "Escuro"}</span>
            </button>
          </div>
        </section>

        {/* Visualização de Cards */}
        <section className="settings_section_app">
          <h3>Cards</h3>
          <label>
            Mostrar favoritos:
            <input
              type="checkbox"
              checked={showFavorites}
              onChange={(e) => setShowFavorites(e.target.checked)}
            />
          </label>
          <label>
            Mostrar últimos utilizados:
            <input
              type="checkbox"
              checked={showRecent}
              onChange={(e) => setShowRecent(e.target.checked)}
            />
          </label>
          <label>
            Cards por linha:
            <input
              type="number"
              min={1}
              max={6}
              value={cardsPerRow}
              onChange={(e) => setCardsPerRow(Number(e.target.value))}
            />
          </label>
        </section>

        <section className="settings_section_app">
          <h3>Cor de detalhes</h3>
          <input
            type="color"
            value={userColor}
            onChange={handleColorChange}
          />
        </section>

        {/* Versão e ajuda */}
        <section className="settings_section_app">
          <h3>Informações</h3>
          <p>Versão do App: {appVersion}</p>
          <MyButton Text="Help" Colored={true} onClick={handleHelp}/>
        </section>

        <div className="form_buttons_app">
          <MyButton Text="Save changes" Colored={true} onClick={()=>{}}/>
          <MyButton Text="Cancel" Colored={false} onClick={()=>{}}/>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
