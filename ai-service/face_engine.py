"""Face detection and recognition with OpenCV.

- Detection: YuNet  (finds faces in a photo)
- Recognition: SFace (turns a face into a 128-number "signature" / embedding)

Two photos of the same person give signatures that point in almost the same
direction, so we compare them with cosine similarity (1.0 = identical).
Only the signatures are stored, never the photos.
"""

import base64
import json
import os
import threading

import cv2
import numpy as np

import config


class FaceError(Exception):
    """A problem with the photo that should be shown to the user (HTTP 400)."""


_detector = None
_recognizer = None
_models_lock = threading.Lock()
_store_lock = threading.Lock()


def models_ready():
    return os.path.exists(config.DETECTOR_MODEL) and os.path.exists(config.RECOGNIZER_MODEL)


def _models():
    global _detector, _recognizer

    with _models_lock:
        if _detector is None:
            if not models_ready():
                raise RuntimeError("Model files missing. Run: python download_models.py")

            _detector = cv2.FaceDetectorYN.create(config.DETECTOR_MODEL, "", (320, 320), 0.8, 0.3, 5000)
            _recognizer = cv2.FaceRecognizerSF.create(config.RECOGNIZER_MODEL, "")

    return _detector, _recognizer


# ---------- Images ----------

def decode_image(data):
    """Accepts a data URL ("data:image/jpeg;base64,...") or plain base64. Returns a BGR image."""
    if not data or not isinstance(data, str):
        raise FaceError("Image manquante")

    if "," in data and data.startswith("data:"):
        data = data.split(",", 1)[1]

    try:
        raw = base64.b64decode(data, validate=False)
    except ValueError:
        raise FaceError("Image invalide")

    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)

    if image is None:
        raise FaceError("Image illisible (utilisez une photo JPEG ou PNG)")

    # Big photos are slow to process: scale down to 1280 px max
    height, width = image.shape[:2]
    scale = 1280 / max(height, width)

    if scale < 1:
        image = cv2.resize(image, (int(width * scale), int(height * scale)))

    return image


# ---------- Detection / signatures ----------

def detect_faces(image):
    """Returns the detected faces (one row per face), biggest first."""
    detector, _ = _models()

    height, width = image.shape[:2]
    detector.setInputSize((width, height))

    _, faces = detector.detect(image)

    if faces is None:
        return []

    # columns 2 and 3 are the box width and height
    return sorted(faces, key=lambda f: f[2] * f[3], reverse=True)


def signature(image, face):
    """128-number face signature, normalized to length 1."""
    _, recognizer = _models()

    aligned = recognizer.alignCrop(image, face)
    feature = recognizer.feature(aligned).flatten().astype(np.float32)

    return feature / (np.linalg.norm(feature) + 1e-10)


# ---------- Storage (data/faces.json: {"user_id": [[128 numbers], ...]}) ----------

def _load_store():
    if not os.path.exists(config.FACES_FILE):
        return {}

    with open(config.FACES_FILE, encoding="utf-8") as f:
        return json.load(f)


def _save_store(store):
    os.makedirs(config.DATA_DIR, exist_ok=True)
    temp = config.FACES_FILE + ".tmp"

    with open(temp, "w", encoding="utf-8") as f:
        json.dump(store, f)

    os.replace(temp, config.FACES_FILE)


def list_faces():
    with _store_lock:
        return {user_id: len(sigs) for user_id, sigs in _load_store().items()}


def enroll(user_id, image_data):
    """Adds a photo of a person. The photo must contain exactly one clear face."""
    image = decode_image(image_data)
    faces = detect_faces(image)

    if len(faces) == 0:
        raise FaceError("Aucun visage détecté sur la photo")

    if len(faces) > 1:
        raise FaceError("Plusieurs visages détectés : une seule personne doit apparaître sur la photo")

    face = faces[0]

    if min(face[2], face[3]) < 60:
        raise FaceError("Visage trop petit : prenez une photo plus rapprochée")

    sig = signature(image, face)

    with _store_lock:
        store = _load_store()
        sigs = store.get(str(user_id), [])
        sigs.append([round(float(x), 6) for x in sig])
        store[str(user_id)] = sigs[-config.MAX_PHOTOS_PER_PERSON:]
        _save_store(store)

        return len(store[str(user_id)])


def delete(user_id):
    with _store_lock:
        store = _load_store()
        removed = store.pop(str(user_id), None) is not None
        _save_store(store)
        return removed


def identify(image_data, candidates=None):
    """Finds who is in the photo.

    candidates: optional list of user ids to compare against (e.g. the students of
    the class happening now). Returns a dict with match, user_id, confidence.
    """
    image = decode_image(image_data)
    faces = detect_faces(image)

    result = {"match": False, "user_id": None, "confidence": None, "faces_detected": len(faces)}

    if not faces:
        return result

    sig = signature(image, faces[0])  # the biggest face = the person closest to the camera

    with _store_lock:
        store = _load_store()

    if candidates is not None:
        allowed = {str(c) for c in candidates}
        store = {uid: sigs for uid, sigs in store.items() if uid in allowed}

    best_user, best_score = None, -1.0

    for user_id, sigs in store.items():
        if not sigs:
            continue
        score = float(np.max(np.asarray(sigs, dtype=np.float32) @ sig))
        if score > best_score:
            best_user, best_score = user_id, score

    if best_user is None:
        return result

    result["confidence"] = round(best_score, 3)

    if best_score >= config.MATCH_THRESHOLD:
        result["match"] = True
        result["user_id"] = int(best_user)

    return result
