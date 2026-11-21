# Pixora Shield

Pixora Shield is a 24-hour hackathon MVP for automatically blurring
identifiable faces in uploaded videos before they are shared.

## MVP workflow

```text
Video upload
  -> OpenCV face detection
  -> Gaussian blur
  -> Protected MP4
  -> Preview and download
```

Face protection is enabled by default. License-plate protection is optional:
set `PIXORA_PLATE_MODEL=/path/to/verified-plate-model.pt` and install
Ultralytics. The MVP will not claim plate protection until that model loads
successfully.

## Run locally

Backend:

```bash
python -m venv .venv
source .venv/bin/activate
pip install flask flask-cors opencv-python-headless
python -m flask --app src.web.backend.wsgi_pixora:app --debug run --port 5000
```

Frontend:

```bash
cd src/web/frontend
npm ci
npm run dev
```

Open `http://localhost:3000`.

## API

- `GET /health`
- `POST /api/process-video` with multipart field `video`
- `GET /api/output/<job_id>`


