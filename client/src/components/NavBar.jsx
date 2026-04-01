import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import styles from './NavBar.module.css';

export default function NavBar() {
    const { user, logout, refreshCount } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) refreshCount();
    }, [user, refreshCount]);

    return (
        <header className={styles.nav}>
            <span className={styles.brand}>kto dzisiaj na lodo</span>
            <div className={styles.right}>
                <button className={styles.avatarBtn} onClick={() => navigate('/profile')} title="Profil">
                    {user?.avatar
                        ? <img className={styles.avatarImg} src={`/uploads/${user.avatar}`} alt={user.username} />
                        : <span className={styles.avatarInitial}>{user?.username?.[0]?.toUpperCase()}</span>
                    }
                </button>
                <span className={styles.username}>{user?.username}</span>
                <button className={styles.logoutBtn} onClick={logout}>
                    Wyloguj się
                </button>
            </div>
        </header>
    );
}
