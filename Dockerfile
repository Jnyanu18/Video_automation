# syntax=docker/dockerfile:1.7
#
# Render & Cloud Deployment Dockerfile for GrowthOS AI Video Studio
# Runs both Python FastAPI (FFmpeg + faster-whisper) and Node Dashboard

FROM node:22-bookworm-slim AS node_src

FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies: FFmpeg, fonts, and Chromium headless dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg ca-certificates curl git \
      fonts-dejavu-core fonts-liberation \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
      libpango-1.0-0 libcairo2 \
 && rm -rf /var/lib/apt/lists/*

# Install Node.js 22 from official Node image
COPY --from=node_src /usr/local/bin/node /usr/local/bin/node
COPY --from=node_src /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /app

# Install HyperFrames CLI
WORKDIR /app/editor/app
RUN npm init -y >/dev/null \
 && npm install --no-audit --no-fund hyperframes@0.9.72 \
 && test -x node_modules/.bin/hyperframes

# Install Python requirements
WORKDIR /app
COPY automation/editor/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Pre-cache whisper model weights into /opt/models
ENV HF_HOME=/opt/models
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('base', compute_type='int8')"

# Copy application files
COPY automation/package.json ./
COPY automation/server ./server
COPY automation/mock ./mock
COPY automation/lib ./lib
COPY automation/adapters ./adapters
COPY automation/web/dist ./web/dist
COPY automation/editor /app/editor
COPY automation/n8n/*.json /app/n8n/

# Copy startup script
COPY automation/deploy/huggingface/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Setup non-root user with UID 1000
RUN useradd -m -u 1000 user \
 && mkdir -p /tmp/storage /tmp/users /tmp/models \
 && chown -R user:user /app /tmp/storage /tmp/users /tmp/models /opt/models

USER user

ENV PORT=10000 \
    HOST=0.0.0.0 \
    HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

EXPOSE 10000 7860 8787

CMD ["/app/start.sh"]
