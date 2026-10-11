import { useState } from "react";
import { useAuth } from "../auth";


export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async event => {
        event.preventDefault();
        setError("");
        setBusy(true);

        try {
            await login(email, password);
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    };

    return (
        <div className="login">
            <section className="login-side">
                <img src="/logo.png" alt="Bouebdelli University" className="login-logo" />
                <p className="login-tagline">
                    La présence se fait à la porte.<br />
                    <span>Le reste, ici.</span>
                </p>
            </section>

            <section className="login-main">
                <form className="login-form" onSubmit={submit}>
                    <img src="/crest.png" alt="" className="brand-mark large" />
                    <h1>Bouebdelli Smart Uni</h1>
                    <p className="muted">Connectez-vous avec votre compte universitaire.</p>

                    <label className="field">
                        <span className="field-label">Email</span>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" autoFocus />
                    </label>

                    <label className="field">
                        <span className="field-label">Mot de passe</span>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                    </label>

                    {error && <p className="form-error" role="alert">{error}</p>}

                    <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>

                    <p className="muted small">Pas encore de compte ? Demandez-le à l'administration de l'université.</p>
                </form>
            </section>
        </div>
    );
}
