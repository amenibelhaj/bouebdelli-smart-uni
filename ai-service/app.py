"""Face recognition API used by the backend.

Run:  python app.py      (listens on http://127.0.0.1:8000)

Every request must send the header  x-api-key: <AI_SERVICE_KEY>
Only the backend talks to this service; the browser and the door boxes never do.

GET    /health              -> service status
GET    /faces               -> {"faces": {"user_id": number_of_photos}}
POST   /faces/<user_id>     body {"image": "<base64 or data URL>"} -> register a photo
DELETE /faces/<user_id>     -> forget a person
POST   /identify            body {"image": ..., "candidates": [ids]} -> who is it?
"""

import hmac

from flask import Flask, jsonify, request

import config
import face_engine
from face_engine import FaceError

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024
app.json.ensure_ascii = False


@app.before_request
def check_api_key():
    if request.path == "/health":
        return None

    sent = request.headers.get("x-api-key", "")

    if not config.API_KEY or not hmac.compare_digest(sent, config.API_KEY):
        return jsonify(message="Clé API invalide"), 401

    return None


@app.errorhandler(FaceError)
def handle_face_error(error):
    return jsonify(message=str(error)), 400


@app.errorhandler(RuntimeError)
def handle_runtime_error(error):
    return jsonify(message=str(error)), 500


@app.errorhandler(413)
def handle_too_large(_error):
    return jsonify(message="Image trop volumineuse"), 413


def body():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        raise FaceError("Requête invalide")

    return data


@app.get("/health")
def health():
    return jsonify(status="OK", models_ready=face_engine.models_ready())


@app.get("/faces")
def list_faces():
    return jsonify(faces=face_engine.list_faces())


@app.post("/faces/<int:user_id>")
def enroll(user_id):
    photos = face_engine.enroll(user_id, body().get("image"))
    return jsonify(message="Photo enregistrée", user_id=user_id, photos=photos)


@app.delete("/faces/<int:user_id>")
def delete(user_id):
    removed = face_engine.delete(user_id)
    return jsonify(message="Visage supprimé" if removed else "Aucun visage enregistré", removed=removed)


@app.post("/identify")
def identify():
    data = body()
    candidates = data.get("candidates")

    if candidates is not None and not isinstance(candidates, list):
        raise FaceError("candidates doit être une liste")

    return jsonify(face_engine.identify(data.get("image"), candidates))


if __name__ == "__main__":
    if not config.API_KEY:
        raise SystemExit("AI_SERVICE_KEY is missing. Copy .env.example to .env and fill it in.")

    if not face_engine.models_ready():
        raise SystemExit("Model files missing. Run first: python download_models.py")

    print(f"Face recognition service on http://{config.HOST}:{config.PORT}")
    app.run(host=config.HOST, port=config.PORT, threaded=True)
