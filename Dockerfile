# One container for hosting (e.g. Render): the Node.js API + the Python face service.
# The face service listens only inside the container (127.0.0.1:8000);
# the API is the public part, on the port given by the platform ($PORT).
#
# The React frontend is deployed separately (e.g. Vercel).

FROM node:20-bookworm-slim

# Python for the face service
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Face service ---
COPY ai-service/ ./ai-service/
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir flask numpy opencv-python-headless gunicorn \
    && cd ai-service && /opt/venv/bin/python download_models.py

# --- API ---
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend/ ./backend/

COPY start.sh ./start.sh
RUN chmod +x ./start.sh

ENV NODE_ENV=production \
    AI_SERVICE_URL=http://127.0.0.1:8000

EXPOSE 5000

CMD ["./start.sh"]
