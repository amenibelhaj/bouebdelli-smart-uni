"""The camera box at a classroom door.

In production this runs on a small computer with a camera (e.g. a Raspberry Pi)
mounted at each classroom door. For the demo it runs on a laptop webcam.

What it does, in a loop:
  1. reads the camera
  2. when a face is close enough, takes a photo
  3. sends it to the backend, which recognizes the person and marks them present
     for the class happening in this room right now
  4. shows the result on screen (green = present, red = not recognized)

Run:
  python door_box.py                       # webcam, settings from .env
  python door_box.py --key demo-key-b6     # pretend to be the box of room B6
  python door_box.py --image photo.jpg     # send one photo, no camera (for testing)

Press Q in the camera window to quit.
"""

import argparse
import base64
import json
import time
import urllib.error
import urllib.request

import cv2

import config
import face_engine

# A face must be at least this wide (pixels) to be "at the door", not far away
MIN_FACE_WIDTH = 90
# Wait between two photos sent to the server
SEND_INTERVAL = 2.0
# How long a result stays on screen
RESULT_DISPLAY_SECONDS = 3.0


def api(method, path, key, payload=None):
    """Calls the backend. Returns (status_code, json_body)."""
    data = json.dumps(payload).encode("utf-8") if payload is not None else None

    request = urllib.request.Request(
        config.BACKEND_URL.rstrip("/") + path,
        data=data,
        method=method,
        headers={"Content-Type": "application/json", "x-device-key": key},
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        try:
            return error.code, json.loads(error.read().decode("utf-8"))
        except ValueError:
            return error.code, {"message": f"Erreur HTTP {error.code}"}
    except urllib.error.URLError:
        return 0, {"message": "Serveur injoignable"}


def to_data_url(image):
    ok, jpeg = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 85])

    if not ok:
        raise RuntimeError("Impossible d'encoder l'image")

    return "data:image/jpeg;base64," + base64.b64encode(jpeg.tobytes()).decode("ascii")


def show_status(key):
    status, body = api("GET", "/attendance/device/status", key)

    if status != 200:
        raise SystemExit(f"Box not accepted by the backend: {body.get('message')}")

    print(f"Box: {body['device']}  |  Classroom: {body['classroom']}")

    current = body.get("current_class")

    if current:
        print(f"Class now: {current['course']} - {current['group']} - {current['teacher']} "
              f"({current['start_time'][:5]}-{current['end_time'][:5]})")
    else:
        print("No class in this room right now (check-ins will be refused).")

    return body


def scan(key, image):
    status, body = api("POST", "/attendance/device/scan", key, {"image": to_data_url(image)})
    recognized = bool(body.get("recognized"))
    return recognized, body.get("message", f"Erreur ({status})")


def run_single_image(key, path):
    image = cv2.imread(path)

    if image is None:
        raise SystemExit(f"Cannot read image: {path}")

    show_status(key)
    recognized, message = scan(key, image)
    print(("OK  " if recognized else "NO  ") + message)


def draw_banner(frame, text, color):
    height, width = frame.shape[:2]
    cv2.rectangle(frame, (0, height - 50), (width, height), color, -1)
    cv2.putText(frame, text, (12, height - 17), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)


def ascii_text(text):
    """OpenCV cannot draw accents: 'Présence' -> 'Presence'."""
    import unicodedata
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")


def run_camera(key, camera_index):
    box = show_status(key)

    camera = cv2.VideoCapture(camera_index)

    if not camera.isOpened():
        raise SystemExit(f"Cannot open camera {camera_index}")

    title = f"Smart Uni - {box['classroom']}"
    last_sent = 0.0
    last_status_check = time.time()
    result_text, result_color, result_until = "", (0, 0, 0), 0.0

    print("Camera running. Press Q in the window to quit.")

    try:
        while True:
            ok, frame = camera.read()

            if not ok:
                print("Camera read failed")
                break

            now = time.time()

            # Refresh the current class every minute
            if now - last_status_check > 60:
                box = show_status(key)
                last_status_check = now

            faces = face_engine.detect_faces(frame)
            close_face = faces[0] if faces and faces[0][2] >= MIN_FACE_WIDTH else None

            display = frame.copy()

            for face in faces:
                x, y, w, h = [int(v) for v in face[:4]]
                color = (0, 200, 255) if face is close_face else (160, 160, 160)
                cv2.rectangle(display, (x, y), (x + w, y + h), color, 2)

            if close_face is not None and now - last_sent >= SEND_INTERVAL and now >= result_until:
                last_sent = now
                recognized, message = scan(key, frame)
                print(("OK  " if recognized else "NO  ") + message)
                result_text = ascii_text(message)
                result_color = (60, 160, 40) if recognized else (40, 40, 200)
                result_until = now + RESULT_DISPLAY_SECONDS

            if now < result_until:
                draw_banner(display, result_text, result_color)
            else:
                current = box.get("current_class")
                text = f"{current['course']} - {current['group']}" if current else "Aucun cours en ce moment"
                draw_banner(display, ascii_text(text), (80, 80, 80))

            cv2.imshow(title, display)

            if cv2.waitKey(1) & 0xFF in (ord("q"), ord("Q")):
                break
    finally:
        camera.release()
        cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="Classroom door camera box")
    parser.add_argument("--key", default=config.DEVICE_KEY, help="device key of this box (or DEVICE_KEY in .env)")
    parser.add_argument("--camera", type=int, default=config.CAMERA_INDEX, help="camera number (default 0)")
    parser.add_argument("--image", help="send this photo once instead of using the camera")
    args = parser.parse_args()

    if not args.key:
        raise SystemExit("Device key missing: use --key or set DEVICE_KEY in .env")

    if args.image:
        run_single_image(args.key, args.image)
    else:
        run_camera(args.key, args.camera)


if __name__ == "__main__":
    main()
