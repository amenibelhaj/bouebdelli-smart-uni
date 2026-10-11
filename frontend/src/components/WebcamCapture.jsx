// Live webcam preview with a "take photo" button. Calls onCapture(dataUrl).
import { useEffect, useRef, useState } from "react";


export default function WebcamCapture({ onCapture, busy = false, label = "Prendre la photo" }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [error, setError] = useState("");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let stream;

        if (!navigator.mediaDevices?.getUserMedia) {
            setError("Ce navigateur ne permet pas d'utiliser la caméra.");
            return;
        }

        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false })
            .then(s => {
                stream = s;
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                    videoRef.current.onloadeddata = () => setReady(true);
                }
            })
            .catch(() => setError("Impossible d'accéder à la caméra. Autorisez la caméra dans le navigateur, puis rechargez la page."));

        return () => stream?.getTracks().forEach(track => track.stop());
    }, []);

    const capture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);

        onCapture(canvas.toDataURL("image/jpeg", 0.9));
    };

    if (error) {
        return <p className="alert alert-warning">{error}</p>;
    }

    return (
        <div className="webcam">
            <div className="webcam-frame">
                <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
                <span className="webcam-guide" aria-hidden="true" />
            </div>
            <button type="button" className="btn btn-primary btn-block" onClick={capture} disabled={!ready || busy}>
                {busy ? "Analyse du visage…" : label}
            </button>
            <canvas ref={canvasRef} hidden />
        </div>
    );
}
