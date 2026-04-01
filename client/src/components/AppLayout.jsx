import NavBar from './NavBar.jsx';
import Sidebar from './Sidebar.jsx';
import styles from './AppLayout.module.css';

export default function AppLayout({ children }) {
    return (
        <div className={styles.shell}>
            <NavBar />
            <div className={styles.body}>
                <Sidebar />
                <div className={styles.main}>
                    {children}
                </div>
            </div>
        </div>
    );
}
