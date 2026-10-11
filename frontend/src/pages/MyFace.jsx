// Students and teachers register their own face (once) so the door cameras recognize them.
import { useState } from "react";
import { api, fileToDataUrl } from "../api";
import { navigate } from "../router";
import WebcamCapture from "../components/WebcamCapture";
import { Loader, PageHeader, useApi, useToast } from "../components/ui";


function Progress({ photos, needed }) {
    return (
        <ol className="face-steps" aria-label={`${photos} photo(s) sur ${needed}`}>
            {Array.from({ length: needed }, (_, i) => (
                <li key={i} className={i < photos ? "done" : i === photos ? "current" : ""}>
                    Photo {i + 1}
                </li>
            ))}
        </ol>
    );
}


function Enrollment({ status, onDone }) {
    const [photos, setPhotos] = useState(status.photos);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const toast = useToast();

    const tips = [
        "Regardez droit vers la caméra.",
        "Tournez très légèrement la tête vers la gauche.",
        "Tournez très légèrement la tête vers la droite."
    ];

    const send = async image => {
        setBusy(true);
        setError("");

        try {
            const result = await api("/auth/face", { method: "POST", body: { image } });
            setPhotos(result.photos);
            toast(result.message);
            if (!result.can_add) onDone();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const upload = async event => {
        const file = event.target.files[0];
        event.target.value = "";
        if (file) send(await fileToDataUrl(file));
    };

    return (
        <div className="face-enroll">
            <section className="panel">
                <Progress photos={photos} needed={status.needed} />
                <WebcamCapture onCapture={send} busy={busy} label={`Prendre la photo ${photos + 1} sur ${status.needed}`} />
                <p className="face-tip">{tips[Math.min(photos, tips.length - 1)]}</p>
                {error && <p className="form-error" role="alert">{error}</p>}
            </section>

            <aside className="face-help">
                <h2>Pourquoi ?</h2>
                <p>Une caméra à l'entrée de chaque salle enregistre votre présence automatiquement. Elle doit d'abord apprendre à reconnaître votre visage.</p>
                <h2>Conseils</h2>
                <ul>
                    <li>Bonne lumière, face à une fenêtre ou une lampe.</li>
                    <li>Seul(e) devant la caméra, visage dégagé.</li>
                    <li>Pas de lunettes de soleil ni de capuche.</li>
                </ul>
                <p className="muted small">
                    Seule une signature numérique de votre visage est conservée, pas la photo. Une fois enregistré, seule l'administration peut le modifier.
                </p>
                <label className="file-alt">
                    Pas de webcam ? <span className="text-link">Choisir une photo</span>
                    <input type="file" accept="image/jpeg,image/png" onChange={upload} disabled={busy} />
                </label>
            </aside>
        </div>
    );
}


export default function MyFace() {
    const state = useApi("/auth/face");
    const [done, setDone] = useState(false);

    return (
        <>
            <PageHeader title="Mon visage" subtitle="Pour que la caméra de la salle vous reconnaisse à l'entrée." />

            <Loader state={state}>
                {status => {
                    if (!status.available) {
                        return <p className="alert alert-warning">Le service de reconnaissance faciale est indisponible pour le moment. Réessayez plus tard.</p>;
                    }

                    if (done || !status.can_add) {
                        return (
                            <section className="panel narrow face-done">
                                <span className="face-check" aria-hidden="true">✓</span>
                                <h2>Votre visage est enregistré</h2>
                                <p>La caméra vous reconnaîtra à l'entrée de vos salles de cours. Pour le modifier, contactez l'administration.</p>
                                <button className="btn btn-primary" onClick={() => navigate("/")}>Aller à l'accueil</button>
                            </section>
                        );
                    }

                    return (
                        <>
                            {status.photos === 0 && (
                                <p className="alert alert-info">
                                    Première connexion : enregistrez votre visage en 3 photos. Cela prend une minute.
                                    <button className="btn btn-small btn-quiet" onClick={() => navigate("/")}>Plus tard</button>
                                </p>
                            )}
                            <Enrollment status={status} onDone={() => setDone(true)} />
                        </>
                    );
                }}
            </Loader>
        </>
    );
}
