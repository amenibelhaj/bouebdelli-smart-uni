"""Face signature API used by the backend.

Run:  python app.py      (listens on http://127.0.0.1:8000)

Every request must send the header  x-api-key: <AI_SERVICE_KEY>
Only the backend talks to this service; the browser and the door boxes never do.

GET  /health   -> service status
POST /embed    body {"image": "<base64 or data URL>", "mode": "enroll" | "detect"}
               -> {"signature": [128 numbers] or null, "faces_detected": n}

The service stores nothing: the backend keeps the signatures in the database
and does the comparison.
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


@app.post("/embed")
def embed():
    data = body()
    mode = data.get("mode", "detect")

    if mode not in ("enroll", "detect"):
        raise FaceError("mode doit être enroll ou detect")

    return jsonify(face_engine.embed(data.get("image"), mode))


if __name__ == "__main__":
    if not config.API_KEY:
        raise SystemExit("AI_SERVICE_KEY is missing. Copy .env.example to .env and fill it in.")

    if not face_engine.models_ready():
        raise SystemExit("Model files missing. Run first: python download_models.py")

    print(f"Face recognition service on http://{config.HOST}:{config.PORT}")
    app.run(host=config.HOST, port=config.PORT, threaded=True)
