FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y chromium \
    fonts-liberation fonts-noto-cjk \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY backend ./backend
COPY frontend ./frontend

EXPOSE 3000
CMD ["node", "backend/server.js"]