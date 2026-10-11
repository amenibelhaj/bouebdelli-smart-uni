// The classroom door camera box, running in the browser with the webcam.
// Open #/boitier?key=demo-key-b6 — no login needed: the box uses its own key.
// Same job as ai-service/door_box.py, without installing anything.
import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "../api";
import { hhmm } from "../format";

const SCAN_INTERVAL = 2000;    // one photo every 2 s
const RESULT_SECONDS = 3500;   // how long a result stays on screen
const KEY_STORAGE = "smartuni_device_key";


function keyFromUrl() {
    const query = window.location.hash.split("?")[1] || "";
    return new URLSearchParams(query).get("key") || "";
}

function storedKey() {
    try {
        return localStorage.getItem(KEY_STORAGE) || "";
    } catch {
        return "";
    }
}


async function deviceCall(key, path, body) {
    const response = await fetch(API_URL + path, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", "x-device-key": key },
        body: body ? JSON.stringify(body) : undefined
    }).catch(() => {
        throw new Error("Serveur injoignable");
    });

    const data = await response.json().catch(() => ({}));

    return { ok: response.ok, status: response.status, data };
}


export default function DoorBox() {
    const [key, setKey] = useState(() => keyFromUrl() || storedKey());
    const [keyInput, setKeyInput] = useState(key);
    const [box, setBox] = useState(null);
    const [error, setError] = useState("");
    const [cameraOn, setCameraOn] = useState(false);
    const [result, setResult] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const busyRef = useRef(false);
    const holdUntilRef = useRef(0);

    // Check the key and get the current class (refresh every minute)
    const loadStatus = useCallback(async () => {
        if (!key) return;

        try {
            const { ok, data } = await deviceCall(key, "/attendance/device/status");

            if (!ok) {
                setBox(null);
                setError(data.message || "Clé refusée");
                return;
            }

            setError("");
            setBox(data);
            try { localStorage.setItem(KEY_STORAGE, key); } catch { /* ignore */ }
        } catch (err) {
            setError(err.message);
        }
    }, [key]);

    useEffect(() => {
        loadStatus();
        const timer = setInterval(loadStatus, 60000);
        return () => clearInterval(timer);
    }, [loadStatus]);

    // Start / stop the webcam
    useEffect(() => {
        if (!cameraOn) return;

        let stream;

        navigator.mediaDevices?.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
            .then(s => {
                stream = s;
                if (videoRef.current) videoRef.current.srcObject = s;
            })
            .catch(() => {
                setError("Impossible d'accéder à la caméra. Autorisez la caméra dans le navigateur.");
                setCameraOn(false);
            });

        return () => stream?.getTracks().forEach(track => track.stop());
    }, [cameraOn]);

    // Send a photo every 2 seconds while the camera is on
    useEffect(() => {
        if (!cameraOn || !box) return;

        const timer = setInterval(async () => {
            const video = videoRef.current;

            if (busyRef.current || Date.now() < holdUntilRef.current || !video || video.readyState < 2) return;

            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d").drawImage(video, 0, 0);
            const image = canvas.toDataURL("image/jpeg", 0.85);

            busyRef.current = true;

            try {
                const { data } = await deviceCall(key, "/attendance/device/scan", { image });

                // Nobody at the door: stay quiet
                if (!data.recognized && /Aucun visage/.test(data.message || "")) {
                    setResult(null);
                    return;
                }

                setResult({ ok: !!data.recognized, message: data.message || "Erreur", confidence: data.confidence });
                holdUntilRef.current = Date.now() + RESULT_SECONDS;
                setTimeout(() => setResult(null), RESULT_SECONDS);
            } catch (err) {
                setResult({ ok: false, message: err.message });
            } finally {
                busyRef.current = false;
            }
        }, SCAN_INTERVAL);

        return () => clearInterval(timer);
    }, [cameraOn, box, key]);

    const saveKey = event => {
        event.preventDefault();
        setBox(null);
        setKey(keyInput.trim());
    };

    const current = box?.current_class;

    return (
        <div className="doorbox">
            <header className="doorbox-head">
                <div>
                    <p className="doorbox-title">{box ? box.device : "Boîtier caméra"}</p>
                    <p className="doorbox-sub">Bouebdelli Smart Uni</p>
                </div>
                {box && (
                    <span className="door-plate doorbox-plate">
                        <small>Salle</small>
                        {box.classroom}
                    </span>
                )}
            </header>

            {!box && (
                <form className="doorbox-key" onSubmit={saveKey}>
                    <label className="field">
                        <span className="field-label">Clé du boîtier</span>
                        <input value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="demo-key-b6" required />
                    </label>
                    <button className="btn btn-primary">Connecter le boîtier</button>
                    <p className="muted small">La clé de chaque boîtier est dans la page « Boîtiers caméra » de l'administration.</p>
                </form>
            )}

            {error && <p className="alert alert-error" role="alert">{error}</p>}

            {box && (
                <>
                    <p className="doorbox-class">
                        {current
                            ? <><strong>{current.course}</strong> — {current.group} — {current.teacher} ({hhmm(current.start_time)}–{hhmm(current.end_time)})</>
                            : "Aucun cours en ce moment dans cette salle"}
                    </p>

                    <div className="doorbox-frame">
                        {cameraOn ? (
                            <video ref={videoRef} autoPlay playsInline muted className="doorbox-video" />
                        ) : (
                            <button className="btn btn-primary doorbox-start" onClick={() => { setError(""); setCameraOn(true); }}>
                                Démarrer la caméra
                            </button>
                        )}

                        {result && (
                            <div className={`doorbox-result ${result.ok ? "ok" : "ko"}`} role="status">
                                {result.message}
                                {result.ok && result.confidence ? <small> — {Math.round(result.confidence * 100)} %</small> : null}
                            </div>
                        )}
                    </div>

                    <p className="muted small doorbox-help">
                        {cameraOn
                            ? "Placez-vous face à la caméra, à moins d'un mètre."
                            : "La caméra reconnaît les étudiants et l'enseignant du cours qui a lieu dans cette salle."}
                    </p>

                    <div className="doorbox-actions">
                        {cameraOn && <button className="btn btn-quiet" onClick={() => setCameraOn(false)}>Arrêter la caméra</button>}
                        <button className="btn btn-quiet" onClick={() => { setCameraOn(false); setBox(null); setKey(""); }}>Changer de boîtier</button>
                        <a className="btn btn-quiet" href="#/">Retour au site</a>
                    </div>
                </>
            )}

            <canvas ref={canvasRef} hidden />
        </div>
    );
}
