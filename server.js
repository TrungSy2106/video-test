'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

const port = Number(process.env.PORT || 10000);

const videoPath = path.join(
  __dirname,
  'public',
  'test-40mbps.mp4'
);

app.disable('x-powered-by');

app.get('/health', (_req, res) => {
  res.type('text/plain').send('ok');
});

app.get('/info', (_req, res) => {
  res.set('Cache-Control', 'no-store');

  res.json({
    configuredRegion: 'Oregon, USA',
    testVideo: '1080p60 H.264, 40 Mbps, 45 seconds',
    cache: 'disabled'
  });
});

app.get('/video.mp4', (req, res) => {
  let stat;

  try {
    stat = fs.statSync(videoPath);
  } catch (error) {
    console.error(error);

    res
      .status(503)
      .type('text/plain')
      .send('Video chưa được tạo. Kiểm tra Render build log.');

    return;
  }

  const fileSize = stat.size;
  const range = req.headers.range;

  const headers = {
    'Accept-Ranges': 'bytes',
    'Cache-Control':
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    'Content-Type': 'video/mp4'
  };

  if (!range) {
    res.writeHead(200, {
      ...headers,
      'Content-Length': fileSize
    });

    fs.createReadStream(videoPath).pipe(res);
    return;
  }

  const match = /^bytes=(\d+)-(\d*)$/.exec(range.trim());

  if (!match) {
    res
      .status(416)
      .set('Content-Range', `bytes */${fileSize}`)
      .end();

    return;
  }

  const start = Number(match[1]);

  let end = match[2]
    ? Number(match[2])
    : fileSize - 1;

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    res
      .status(416)
      .set('Content-Range', `bytes */${fileSize}`)
      .end();

    return;
  }

  end = Math.min(end, fileSize - 1);

  const chunkSize = end - start + 1;

  res.writeHead(206, {
    ...headers,
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Content-Length': chunkSize
  });

  fs
    .createReadStream(videoPath, { start, end })
    .pipe(res);
});

app.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store');

  res.type('html').send(`
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>Oregon Video Test</title>

  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 1000px;
      margin: 24px auto;
      padding: 0 16px;
      line-height: 1.45;
    }

    video {
      width: 100%;
      background: #111;
    }

    .grid {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      margin: 14px 0;
    }

    .card {
      border: 1px solid #aaa;
      border-radius: 8px;
      padding: 12px;
    }

    .value {
      font-size: 1.5rem;
      font-weight: 700;
    }

    button,
    .button {
      display: inline-block;
      margin: 8px 6px 8px 0;
      padding: 9px 13px;
      border: 1px solid #777;
      border-radius: 6px;
      background: white;
      color: black;
      text-decoration: none;
      cursor: pointer;
    }
  </style>
</head>

<body>
  <h1>Video streaming test — Oregon, USA</h1>

  <p>
    Video thử nghiệm:
    <strong>1080p60, H.264, 40 Mbps, 45 giây</strong>.
  </p>

  <video
    id="video"
    controls
    playsinline
    preload="auto"
  >
    <source src="/video.mp4" type="video/mp4">
  </video>

  <div>
    <button id="restart">
      Chạy lại bài test
    </button>

    <a
      class="button"
      href="/video.mp4"
      download="oregon-test-40mbps.mp4"
    >
      Tải cùng file video
    </a>
  </div>

  <div class="grid">
    <div class="card">
      <div>Buffering events</div>
      <div class="value" id="waiting">0</div>
    </div>

    <div class="card">
      <div>Stalled events</div>
      <div class="value" id="stalled">0</div>
    </div>

    <div class="card">
      <div>Dropped frames</div>
      <div class="value" id="dropped">0</div>
    </div>

    <div class="card">
      <div>Thời gian video</div>
      <div class="value" id="time">0.0 giây</div>
    </div>
  </div>

  <p>
    Nếu mạng không tải kịp 40 Mbps, video có thể dừng,
    chờ dữ liệu hoặc số Buffering/Stalled tăng.
  </p>

  <script>
    const video =
      document.getElementById('video');

    const waitingElement =
      document.getElementById('waiting');

    const stalledElement =
      document.getElementById('stalled');

    const droppedElement =
      document.getElementById('dropped');

    const timeElement =
      document.getElementById('time');

    let waitingCount = 0;
    let stalledCount = 0;

    video.addEventListener('waiting', () => {
      waitingCount += 1;
      waitingElement.textContent =
        String(waitingCount);
    });

    video.addEventListener('stalled', () => {
      stalledCount += 1;
      stalledElement.textContent =
        String(stalledCount);
    });

    video.addEventListener('timeupdate', () => {
      timeElement.textContent =
        video.currentTime.toFixed(1) + ' giây';
    });

    setInterval(() => {
      if (
        typeof video.getVideoPlaybackQuality ===
        'function'
      ) {
        const quality =
          video.getVideoPlaybackQuality();

        droppedElement.textContent =
          String(
            quality.droppedVideoFrames || 0
          );
      }
    }, 500);

    document
      .getElementById('restart')
      .addEventListener('click', () => {
        waitingCount = 0;
        stalledCount = 0;

        waitingElement.textContent = '0';
        stalledElement.textContent = '0';
        droppedElement.textContent = '0';

        video.pause();
        video.currentTime = 0;
        video.load();

        video.play().catch(() => {});
      });
  </script>
</body>
</html>
  `);
});

app.listen(port, '0.0.0.0', () => {
  console.log(
    `Server running at 0.0.0.0:${port}`
  );
});