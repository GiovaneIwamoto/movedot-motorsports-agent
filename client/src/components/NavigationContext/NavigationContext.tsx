import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CardData } from "./DataStructuresContext";



interface NavigationContextProps {
  activePage: string;
  selectedCard: CardData | null;
  setActivePage: (page: string) => void;
  goToAddCardPage: (card: CardData) => void;
  clearSelectedCard: ()=>void;
  configureDisplayOptions: (color?: string, theme?: "light" | "dark")=>void;
  userColor:string;
  userTheme: string;
}

export const NavigationContext = createContext<NavigationContextProps | null>(null);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  
  
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      document.body.classList.remove("day_mode", "night_mode");
      document.body.classList.add(savedTheme === "light" ? "day_mode" : "night_mode");
    }

    const savedColor = localStorage.getItem("details-color");
    if (savedColor){
      document.body.style.setProperty("--details-color", savedColor);
    }
  }, []);
  
  
  const [activePage, setActivePage] = useState("Profile");
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const initialColor = localStorage.getItem("details-color") || "#049bffff";
  const [userColor, setUserColor] = useState(initialColor);
  const savedTheme = localStorage.getItem("theme");
  const initialTheme: "light" | "dark" = savedTheme === "dark" ? "dark" : "light";
  const [userTheme, setUserTheme] = useState<"light" | "dark">(initialTheme);
  
  




  const configureDisplayOptions = (color?: string, theme?: "light" | "dark") => {
    if (color) {
      document.body.style.setProperty("--details-color", color);
      localStorage.setItem("details-color", color);
      setUserColor(color)
    }

    if (theme) {
      document.body.classList.remove("day_mode", "night_mode");
      document.body.classList.add(theme === "light" ? "day_mode" : "night_mode");
      localStorage.setItem("theme", theme);
      setUserTheme(theme)
    }
  };



  const goToAddCardPage = (card: CardData) => {
    setSelectedCard(card || null);
    setActivePage("Add Card");
  };

  const clearSelectedCard= () => {
    setSelectedCard(null);
  };







  return (
    <NavigationContext.Provider value={{ activePage, selectedCard, setActivePage, goToAddCardPage,clearSelectedCard,configureDisplayOptions,userColor,userTheme }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useNavigation must be used inside NavigationProvider");
  return context;
};
