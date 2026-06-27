FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./

RUN mkdir -p /app/public \
    && ffmpeg \
      -hide_banner \
      -loglevel error \
      -f lavfi \
      -i "testsrc2=size=1920x1080:rate=60" \
      -f lavfi \
      -i "sine=frequency=880:sample_rate=48000" \
      -t 45 \
      -c:v libx264 \
      -preset ultrafast \
      -pix_fmt yuv420p \
      -b:v 40M \
      -minrate 40M \
      -maxrate 40M \
      -bufsize 80M \
      -x264-params "nal-hrd=cbr:force-cfr=1:filler=1" \
      -g 120 \
      -keyint_min 120 \
      -sc_threshold 0 \
      -c:a aac \
      -b:a 192k \
      -shortest \
      -movflags +faststart \
      /app/public/test-40mbps.mp4 \
    && ls -lh /app/public/test-40mbps.mp4

ENV PORT=10000

EXPOSE 10000

CMD ["npm", "start"]