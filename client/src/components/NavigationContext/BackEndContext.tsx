import React, { createContext, useContext} from "react";
import type { ReactNode } from "react";
import type { CardData } from "./DataStructuresContext";

interface BackEndContextProps {
    create_card:(cardData: CardData)=>void;
    update_card:(cardData: CardData)=>void;
    delete_card:(number: number)=>void;
}

export const BackEndContext = createContext<BackEndContextProps | null>(null);

export const BackEndProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  
    const fileToByteArray = async (file: File): Promise<number[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
                const array = new Uint8Array(reader.result);
                resolve(Array.from(array)); // converte para array de números
            } else {
                reject("Erro ao ler arquivo");
            }
            };
            reader.onerror = (error) => reject(error);
        });
        };



    async function favorite_card(cardId:number, favorite:boolean) {
        try {
            const payload = {
                id: cardId,
                favorite: favorite
            };

            const response = await fetch("http://localhost:8000/api/updateCard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`Erro ao criar card. Status: ${response.status}`);

            const data = await response.json();
            console.log("Card criado:", data);
            return data;
        } catch (err) {
            console.error("Erro ao enviar card:", err);
            throw err;
        }
    }


    async function create_card(cardData: CardData) {
        try {
            let photoBytes: number[] | null = null;

            if (cardData.photo instanceof File) {
                photoBytes = await fileToByteArray(cardData.photo);
            }

            const payload = {
            id: cardData.id == -1 ? null : cardData.id,
            name: cardData.name ?? "",
            description: cardData.description ?? "",
            data_type: "url",
            data_file: null,
            data_url: cardData.data_url || "trivago",
            photo: null,
            favorite: cardData.favorite ? "true" : "false" // string mesmo
        };

            const response = await fetch("http://localhost:8000/api/createCard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`Erro ao criar card. Status: ${response.status}`);

            const data = await response.json();
            console.log("Card criado:", data);
            return data;
        } catch (err) {
            console.error("Erro ao enviar card:", err);
            throw err;
        }
    }

    async function update_card(cardData: CardData) {
        try{
            const response = await fetch("http://localhost:8000/api/updateCard", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json", // JSON puro
                },
                body: JSON.stringify(cardData),
            });

            if (!response.ok) throw new Error("Erro ao criar card");
            const data = await response.json();
            console.log("Card atualizado:", data);

         } catch (err) {
             console.error("Erro ao enviar card:", err);
         }
    }

    async function delete_card(number: number) {
        try {
            if (!number) {
                console.error("ID do card não definido");
                return;
            }

            const response = await fetch("http://localhost:8000/api/deleteCard", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: number }),
            });

            if (!response.ok) throw new Error("Erro ao deletar card");

            const data = await response.json();
            console.log("Card deletado:", data);

        } catch (err) {
            console.error("Erro ao enviar card:", err);
        }
    }





  


  return (
    <BackEndContext.Provider value={{create_card,update_card,delete_card}}>
      {children}
    </BackEndContext.Provider>
  );
};

export const useBackend = () => {
  const context = useContext(BackEndContext);
  if (!context) throw new Error("useNavigation must be used inside NavigationProvider");
  return context;
};
