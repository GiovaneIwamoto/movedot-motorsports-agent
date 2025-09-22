import MyButton from '../../components/Buttons/MyButton';
import Card from '../../components/Card/Card';
import { useBackend } from '../../components/NavigationContext/BackEndContext';
import type { CardData } from '../../components/NavigationContext/DataStructuresContext';
import './AddCardPage.css';
import React, { useState } from "react";

interface AddCardPageProps {
  card_number: number;
  card_name: string;
  card_description?: string;
}

const AddCardPage: React.FC<AddCardPageProps> = ({
  card_number,
  card_name,
  card_description,
}) => {

    const {create_card,update_card} = useBackend();
    


  const [name, setName] = useState<string>(card_name || "");
  const [description, setDescription] = useState<string>(card_description || "");
  const [url, setUrl] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);
    

    const handleBoxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const cardData: CardData = {
        id: card_number,
        name: name ,
        description: description ,
        photo: photo,
        favorite: false,
        data_type: "", 
        data_file: "", 
        data_url: ""
        };
        
        if (cardData.id == -1){
            create_card(cardData);
        }else{
            update_card(cardData)
        }

        setName("");
        setDescription("");
        setUrl("");
        setPhoto(null);
    };



    return (
        <div className="Add_card_page">
            <div className="edit_card title">
                <h2>Edit card</h2>
            </div>

            <div className="card_preview">
                <Card
                    Id = {card_number}
                    Title={name}
                    Description={description}
                    Photo={photo ?? null}
                    file_url=""
                    onClick={() => {}}
                />
            </div>
            <div className="register_box" onClick={handleBoxClick}>
                <form onSubmit={handleSubmit} className="register_form">
                    <label>
                        Name:
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </label>

                    <label>
                        Description:
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </label>

                    <label>
                        URL:
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </label>

                    <label>
                        Foto:
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                        />
                    </label>

                    <div className="form_buttons">
                        <MyButton Type="submit" Text="Save" Colored={true} onClick={()=>{}}/>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCardPage;
