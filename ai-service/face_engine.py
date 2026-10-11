"""Face detection and recognition with OpenCV.

- Detection: YuNet  (finds faces in a photo)
- Recognition: SFace (turns a face into a 128-number "signature" / embedding)

This module only computes signatures. Storing and comparing them is done by
the backend, in the database. Photos are never stored.
"""

import base64
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


# ---------- Public function used by the API ----------

def embed(image_data, mode="detect"):
    """Turns a photo into a face signature.

    mode "enroll": the photo must contain exactly one, large enough face (FaceError otherwise).
    mode "detect": uses the biggest face (the person closest to the camera), if any.
    Returns {"signature": [128 floats] or None, "faces_detected": n}.
    """
    image = decode_image(image_data)
    faces = detect_faces(image)

    if mode == "enroll":
        if len(faces) == 0:
            raise FaceError("Aucun visage détecté sur la photo")

        if len(faces) > 1:
            raise FaceError("Plusieurs visages détectés : une seule personne doit apparaître sur la photo")

        if min(faces[0][2], faces[0][3]) < 60:
            raise FaceError("Visage trop petit : prenez une photo plus rapprochée")

    if not faces:
        return {"signature": None, "faces_detected": 0}

    sig = signature(image, faces[0])

    return {
        "signature": [round(float(x), 6) for x in sig],
        "faces_detected": len(faces),
    }
