import './NewCardScreen.css';
import React, { useState } from "react";

interface NewCardScreenProps {
    onClose: () => void;
}

const NewCardScreen: React.FC<NewCardScreenProps> = ({ onClose }) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [url, setUrl] = useState("");
    const [photo, setPhoto] = useState<File | null>(null);

    const handleBackgroundClick = () => {
        onClose();
    };

    const handleBoxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log({
            name,
            description,
            url,
            photo,
        });
        onClose(); // fecha após salvar
    };

    return (
        <div className="register_background" onClick={handleBackgroundClick}>
            <div className="register_box" onClick={handleBoxClick}>
                <h2>Cadastro</h2>
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
                            required
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
                        <button type="submit">Salvar</button>
                        <button type="button" onClick={onClose}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewCardScreen;
