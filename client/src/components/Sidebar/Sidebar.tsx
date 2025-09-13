import './Sidebar.css';

const Sidebar: React.FC = () => {
    return (
        <div className="sidebar">
            <ul className="menu">
                <li>Home</li>
                <li>Profile</li>
                <li>Settings</li>
                <li>Configurations</li>
            </ul>
        </div>
    );
};

export default Sidebar;