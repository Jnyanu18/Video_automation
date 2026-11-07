# Render worker image. NOT BUILT/TESTED in the authoring sandbox (no docker, blocked CDN/network).
# Build from the REPO ROOT:  docker build -f services/render/Dockerfile -t claude-editor-render .
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 python3-pip python3-venv ca-certificates fonts-liberation fonts-noto-color-emoji \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
      libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY app/package.json app/package-lock.json app/
RUN cd app && npm ci --omit=dev

# chrome-headless-shell enables HeadlessExperimental.beginFrame (Hyperframes' fast deterministic capture path).
# Regular Chrome silently falls back to slower screenshot capture. Hyperframes also auto-installs it into its
# cache on first run; installing here at build time avoids a network fetch at render time.
RUN npx --yes @puppeteer/browsers install chrome-headless-shell@stable --path /opt/chrome \
    && ln -sf "$(find /opt/chrome -name chrome-headless-shell -type f | head -1)" /usr/local/bin/chrome-headless-shell
ENV HYPERFRAMES_BROWSER_PATH=/usr/local/bin/chrome-headless-shell \
    HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_NO_UPDATE_CHECK=1

COPY services/render services/render
COPY tools tools
# GSAP is vendored in services/render/vendor (local file, no CDN).
ENV PYTHONPATH=/srv
# Usage: docker run -v $PWD/work:/work claude-editor-render python3 -m services.render.cli plan.json /work --final
ENTRYPOINT ["python3", "-m", "services.render.cli"]
