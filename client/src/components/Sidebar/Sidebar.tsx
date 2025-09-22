import React from "react";
import './Sidebar.css';
import profilePic from '../../assets/profile.png';
import { useNavigation } from "../NavigationContext/NavigationContext";


const Sidebar: React.FC = () => {
    const { activePage, setActivePage, clearSelectedCard } = useNavigation();
    return (
        <div className="sidebar">
            <div className="border_line"></div>

            <div className="sidebar_top">
                <img src="/logo.png" alt="Company Logo" className="company_logo" />
                <h2 className="company_name">Movelabs: Grupo 02</h2>
                <div className="user_info">
                    <img src={profilePic} alt="User" className="user_avatar" />
                    <div className="user_text">
                        <p className="user_name">Profile</p>
                        <p className="user_role">Admin</p>
                    </div>
                </div>
            </div>

            <div className="menu">

                <button
                    className={`menu_button ${activePage === "Profile" ? "active" : ""}`}
                    onClick={() => setActivePage("Profile")}
                >
                    Profile
                </button>

                <button
                    className={`menu_button ${activePage === "All Cards" ? "active" : ""}`}
                    onClick={() => setActivePage("All Cards")}
                >
                    All Cards
                </button>

                <button
                    className={`menu_button ${activePage === "Add Card" ? "active" : ""}`}
                    onClick={() => {
                        clearSelectedCard()
                        setActivePage("Add Card")
                    }}
                >
                    Add Card
                </button>

                <button
                    className={`menu_button ${activePage === "Settings" ? "active" : ""}`}
                    onClick={() => setActivePage("Settings")}
                >
                    Settings
                </button>
            </div>

            {/* Rodapé */}
            <div className="sidebar_footer">
                <p>© Movelabs: Grupo 02</p>
            </div>
        </div>
    );
};

export default Sidebar;
