import { useState } from "react";
import { useAuth } from "../auth";
import { Link } from "../router";
import { ROLE_LABELS } from "../format";


const MENUS = {
    student: [
        ["/", "Accueil"],
        ["/emploi-du-temps", "Emploi du temps"],
        ["/absences", "Mes absences"],
        ["/mon-visage", "Mon visage"]
    ],
    teacher: [
        ["/", "Accueil"],
        ["/emploi-du-temps", "Emploi du temps"],
        ["/presences", "Présences"],
        ["/notes", "Mes notes"],
        ["/mon-visage", "Mon visage"]
    ],
    admin: [
        ["/", "Tableau de bord"],
        ["/utilisateurs", "Utilisateurs"],
        ["/emploi-du-temps", "Emploi du temps"],
        ["/presences", "Présences"],
        ["/groupes", "Groupes"],
        ["/matieres", "Matières"],
        ["/salles", "Salles"],
        ["/boitiers", "Boîtiers caméra"]
    ]
};


export default function Layout({ path, children }) {
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);

    const menu = MENUS[user.role] || [];
    const initials = user.name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();

    return (
        <div className="shell">
            <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
                <div className="brand">
                    <span className="brand-mark" aria-hidden="true" />
                    <span className="brand-name">Bouebdelli<br /><small>Smart Uni</small></span>
                    <button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
                        {open ? "×" : "☰"}
                    </button>
                </div>

                <nav className="nav" aria-label="Navigation principale">
                    {menu.map(([to, label]) => (
                        <Link
                            key={to}
                            to={to}
                            className={`nav-link ${path === to ? "active" : ""}`}
                            onClick={() => setOpen(false)}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                <div className="account">
                    <Link to="/compte" className="account-card" onClick={() => setOpen(false)}>
                        <span className="avatar" aria-hidden="true">{initials}</span>
                        <span>
                            <strong>{user.name}</strong>
                            <small>{ROLE_LABELS[user.role]}</small>
                        </span>
                    </Link>
                    <button className="btn btn-ghost-light" onClick={logout}>Se déconnecter</button>
                </div>
            </aside>

            <main className="content">{children}</main>
        </div>
    );
}
