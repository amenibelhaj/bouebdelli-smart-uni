"""Settings, read from environment variables or from ai-service/.env"""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _load_env_file():
    """Minimal .env loader (KEY=value lines), so no extra package is needed."""
    path = os.path.join(BASE_DIR, ".env")

    if not os.path.exists(path):
        return

    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file()


# --- AI service ---
HOST = os.environ.get("AI_HOST", "127.0.0.1")
PORT = int(os.environ.get("AI_PORT", "8000"))

# Shared secret with the backend (AI_SERVICE_KEY in backend/.env)
API_KEY = os.environ.get("AI_SERVICE_KEY", "")

# Cosine similarity needed to accept a match (OpenCV recommends 0.363 for SFace).
# Higher = stricter (fewer false matches, but more "not recognized").
MATCH_THRESHOLD = float(os.environ.get("FACE_MATCH_THRESHOLD", "0.40"))

MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR = os.path.join(BASE_DIR, "data")
FACES_FILE = os.path.join(DATA_DIR, "faces.json")

DETECTOR_MODEL = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
RECOGNIZER_MODEL = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")

# Keep at most this many photos per person
MAX_PHOTOS_PER_PERSON = 5


# --- Door box (door_box.py) ---
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5000/api")
DEVICE_KEY = os.environ.get("DEVICE_KEY", "")
CAMERA_INDEX = int(os.environ.get("CAMERA_INDEX", "0"))
