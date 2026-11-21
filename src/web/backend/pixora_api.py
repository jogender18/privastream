import os
import uuid
from pathlib import Path

import cv2
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS


BASE_DIR = Path(__file__).resolve().parents[3]
UPLOAD_DIR = BASE_DIR / "data" / "pixora" / "uploads"
OUTPUT_DIR = BASE_DIR / "data" / "pixora" / "outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
CORS(
    app,
    origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ALLOWED_ORIGINS", "http://localhost:3000"
        ).split(",")
        if origin.strip()
    ],
)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv"}


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "Pixora Shield"})


@app.post("/api/process-video")
def process_video():
    video = request.files.get("video")
    if video is None or not video.filename:
        return jsonify({"error": "A video file is required"}), 400

    suffix = Path(video.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Unsupported video format"}), 400

    job_id = uuid.uuid4().hex
    input_path = UPLOAD_DIR / f"{job_id}{suffix}"
    video.save(input_path)

    output_path = OUTPUT_DIR / f"{job_id}.mp4"
    capture = cv2.VideoCapture(str(input_path))
    if not capture.isOpened():
        input_path.unlink(missing_ok=True)
        return jsonify({"error": "Could not open the uploaded video"}), 400

    fps = capture.get(cv2.CAP_PROP_FPS) or 24.0
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_skip = max(1, int(round(fps / 12)))

    writer = cv2.VideoWriter(
        str(output_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )
    if not writer.isOpened():
        capture.release()
        input_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)
        return jsonify({"error": "Could not initialize video output"}), 500

    face_detections = 0
    processed_frames = 0
    frame_number = 0
    last_faces = []

    while True:
        ok, frame = capture.read()
        if not ok:
            break

        if frame_number % frame_skip == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            detected = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.12,
                minNeighbors=5,
                minSize=(24, 24),
            )
            last_faces = []
            for x, y, box_width, box_height in detected:
                padding = max(6, int(box_height * 0.12))
                x1 = max(0, x - padding)
                y1 = max(0, y - padding)
                x2 = min(width, x + box_width + padding)
                y2 = min(height, y + box_height + padding)
                last_faces.append((x1, y1, x2, y2))
                face_detections += 1

        for x1, y1, x2, y2 in last_faces:
            region = frame[y1:y2, x1:x2]
            if region.size:
                blurred = cv2.GaussianBlur(region, (99, 99), 30)
                frame[y1:y2, x1:x2] = blurred

        writer.write(frame)
        processed_frames += 1
        frame_number += 1

    capture.release()
    writer.release()

    if processed_frames == 0:
        input_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)
        return jsonify({"error": "The uploaded video contains no readable frames"}), 400

    return jsonify(
        {
            "job_id": job_id,
            "output_url": f"/api/output/{job_id}",
            "faces_detected": face_detections,
            "processed_frames": processed_frames,
            "total_frames": total_frames,
        }
    )


@app.get("/api/output/<job_id>")
def get_output(job_id):
    if not job_id.isalnum():
        return jsonify({"error": "Invalid job ID"}), 400

    output_path = OUTPUT_DIR / f"{job_id}.mp4"
    if not output_path.is_file():
        return jsonify({"error": "Processed video not found"}), 404

    return send_file(output_path, mimetype="video/mp4", as_attachment=False)
