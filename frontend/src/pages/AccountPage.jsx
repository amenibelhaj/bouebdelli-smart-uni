import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { ROLE_LABELS } from "../format";
import { Field, PageHeader, useAction } from "../components/ui";


export default function AccountPage() {
    const { user } = useAuth();
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirmNext, setConfirmNext] = useState("");
    const [error, setError] = useState("");
    const [run, busy] = useAction();

    const submit = async event => {
        event.preventDefault();
        setError("");

        if (next !== confirmNext) {
            setError("Les deux nouveaux mots de passe ne correspondent pas");
            return;
        }

        await run(() => api("/auth/password", {
            method: "PUT",
            body: { current_password: current, new_password: next }
        })).catch(() => {});

        setCurrent("");
        setNext("");
        setConfirmNext("");
    };

    return (
        <>
            <PageHeader title="Mon compte" subtitle={`${user.name} — ${ROLE_LABELS[user.role]} — ${user.email || ""}`} />

            <section className="panel narrow">
                <h2>Changer le mot de passe</h2>
                <form className="form" onSubmit={submit}>
                    <Field label="Mot de passe actuel">
                        <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoComplete="current-password" />
                    </Field>
                    <Field label="Nouveau mot de passe" hint="6 caractères minimum">
                        <input type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={6} autoComplete="new-password" />
                    </Field>
                    <Field label="Confirmer le nouveau mot de passe">
                        <input type="password" value={confirmNext} onChange={e => setConfirmNext(e.target.value)} required minLength={6} autoComplete="new-password" />
                    </Field>
                    {error && <p className="form-error" role="alert">{error}</p>}
                    <div className="form-actions">
                        <button className="btn btn-primary" disabled={busy}>Changer le mot de passe</button>
                    </div>
                </form>
            </section>
        </>
    );
}
