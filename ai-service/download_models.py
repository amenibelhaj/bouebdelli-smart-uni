"""Downloads the two OpenCV face models into ai-service/models (about 39 MB).

Run once:  python download_models.py
"""

import os
import urllib.request

import config

BASE = "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models"

MODELS = {
    config.DETECTOR_MODEL: f"{BASE}/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    config.RECOGNIZER_MODEL: f"{BASE}/face_recognition_sface/face_recognition_sface_2021dec.onnx",
}


def main():
    os.makedirs(config.MODELS_DIR, exist_ok=True)

    for path, url in MODELS.items():
        name = os.path.basename(path)

        if os.path.exists(path) and os.path.getsize(path) > 100_000:
            print(f"OK (already downloaded): {name}")
            continue

        print(f"Downloading {name} ...")
        urllib.request.urlretrieve(url, path)

        if os.path.getsize(path) < 100_000:
            os.remove(path)
            raise SystemExit(f"Download of {name} failed. Download it manually from {url}")

        print(f"OK: {name}")

    print("Models ready.")


if __name__ == "__main__":
    main()
