const videoInput = document.getElementById('videoInput');
const sourceVideo = document.getElementById('sourceVideo');
const previewStage = document.getElementById('previewStage');
const captionOverlay = document.getElementById('captionOverlay');
const captionText = document.getElementById('captionText');
const fontFamily = document.getElementById('fontFamily');
const fontSize = document.getElementById('fontSize');
const fontColor = document.getElementById('fontColor');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const previewCutBtn = document.getElementById('previewCutBtn');
const playPauseBtn = document.getElementById('playPauseBtn');
const zoomRange = document.getElementById('zoomRange');
const downloadBtn = document.getElementById('downloadBtn');
const output = document.getElementById('output');
const exportCanvas = document.getElementById('exportCanvas');

let cutStart = 0;
let cutEnd = 0;
let videoScale = 1;
let videoOffsetX = 0;
let videoOffsetY = 0;
let isDraggingVideo = false;
let isDraggingCaption = false;
let dragStartX = 0;
let dragStartY = 0;
let captionPos = { xPct: 50, yPct: 82 };

function parseTimeToSeconds(value) {
  const v = value.trim();
  if (!v) return null;
  if (/^\d+$/.test(v)) return Number(v);
  const parts = v.split(':').map((p) => p.trim());
  if (parts.length === 2) {
    const mm = Number(parts[0]);
    const ss = Number(parts[1]);
    if (Number.isNaN(mm) || Number.isNaN(ss)) return null;
    return mm * 60 + ss;
  }
  return null;
}

function updateVideoTransform() {
  sourceVideo.style.transform = `translate(calc(-50% + ${videoOffsetX}px), calc(-50% + ${videoOffsetY}px)) scale(${videoScale})`;
}

function updateCaptionStyles() {
  captionOverlay.style.fontFamily = fontFamily.value;
  captionOverlay.style.fontSize = `${fontSize.value}px`;
  captionOverlay.style.color = fontColor.value;
  captionOverlay.style.left = `${captionPos.xPct}%`;
  captionOverlay.style.top = `${captionPos.yPct}%`;
  captionOverlay.textContent = captionText.value || ' ';
}

function syncCaptionToTextarea() {
  captionText.value = captionOverlay.textContent;
  renderState();
}

function setCutFromInputs() {
  const start = parseTimeToSeconds(startTimeInput.value);
  const end = parseTimeToSeconds(endTimeInput.value);

  if (start === null || end === null || end <= start) {
    output.textContent = 'Tempos inválidos. Exemplo: 00:10 até 00:40';
    return false;
  }

  cutStart = start;
  cutEnd = end;
  return true;
}

function renderState() {
  output.textContent = JSON.stringify({
    cut: { startSeconds: cutStart, endSeconds: cutEnd },
    videoFrame: { zoom: Number(videoScale.toFixed(2)), offsetX: Math.round(videoOffsetX), offsetY: Math.round(videoOffsetY) },
    caption: {
      text: captionOverlay.textContent,
      fontFamily: fontFamily.value,
      fontSize: `${fontSize.value}px`,
      color: fontColor.value,
      xPercent: Number(captionPos.xPct.toFixed(2)),
      yPercent: Number(captionPos.yPct.toFixed(2))
    }
  }, null, 2);
}

videoInput.addEventListener('change', () => {
  const file = videoInput.files?.[0];
  if (!file) return;
  sourceVideo.src = URL.createObjectURL(file);
  sourceVideo.onloadedmetadata = () => {
    sourceVideo.currentTime = 0;
    renderState();
  };
});

zoomRange.addEventListener('input', () => {
  videoScale = Number(zoomRange.value);
  updateVideoTransform();
  renderState();
});

previewCutBtn.addEventListener('click', () => {
  if (!setCutFromInputs()) return;
  sourceVideo.currentTime = cutStart;
  sourceVideo.play();
  renderState();
});

playPauseBtn.addEventListener('click', () => {
  if (sourceVideo.paused) sourceVideo.play();
  else sourceVideo.pause();
});

sourceVideo.addEventListener('timeupdate', () => {
  if (cutEnd > cutStart && sourceVideo.currentTime >= cutEnd) {
    sourceVideo.pause();
  }
});

captionText.addEventListener('input', updateCaptionStyles);
fontFamily.addEventListener('input', () => { updateCaptionStyles(); renderState(); });
fontSize.addEventListener('input', () => { updateCaptionStyles(); renderState(); });
fontColor.addEventListener('input', () => { updateCaptionStyles(); renderState(); });
captionOverlay.addEventListener('input', syncCaptionToTextarea);

previewStage.addEventListener('mousedown', (event) => {
  const targetIsCaption = event.target === captionOverlay;
  if (targetIsCaption && document.activeElement !== captionOverlay) {
    isDraggingCaption = true;
  } else if (!targetIsCaption) {
    isDraggingVideo = true;
  }
  dragStartX = event.clientX;
  dragStartY = event.clientY;
});

window.addEventListener('mousemove', (event) => {
  const dx = event.clientX - dragStartX;
  const dy = event.clientY - dragStartY;

  if (isDraggingVideo) {
    videoOffsetX += dx;
    videoOffsetY += dy;
    updateVideoTransform();
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    renderState();
  }

  if (isDraggingCaption) {
    const rect = previewStage.getBoundingClientRect();
    const xPx = (captionPos.xPct / 100) * rect.width + dx;
    const yPx = (captionPos.yPct / 100) * rect.height + dy;
    captionPos.xPct = Math.max(0, Math.min(100, (xPx / rect.width) * 100));
    captionPos.yPct = Math.max(0, Math.min(100, (yPx / rect.height) * 100));
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    updateCaptionStyles();
    renderState();
  }
});

window.addEventListener('mouseup', () => {
  isDraggingVideo = false;
  isDraggingCaption = false;
});

async function downloadClip916() {
  if (!setCutFromInputs()) return;
  if (!sourceVideo.src) {
    output.textContent = 'Carregue um vídeo antes de exportar.';
    return;
  }

  const ctx = exportCanvas.getContext('2d');
  const outW = exportCanvas.width;
  const outH = exportCanvas.height;

  sourceVideo.pause();
  sourceVideo.currentTime = cutStart;

  const fps = 30;
  const canvasStream = exportCanvas.captureStream(fps);
  const mixedStream = new MediaStream(canvasStream.getVideoTracks());

  const sourceStream = sourceVideo.captureStream?.();
  const audioTrack = sourceStream?.getAudioTracks?.()[0];
  if (audioTrack) mixedStream.addTrack(audioTrack);

  const recorder = new MediaRecorder(mixedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  const drawFrame = () => {
    ctx.clearRect(0, 0, outW, outH);
    const vw = sourceVideo.videoWidth || 1;
    const vh = sourceVideo.videoHeight || 1;

    const baseScale = Math.max(outW / vw, outH / vh);
    const finalScale = baseScale * videoScale;
    const drawW = vw * finalScale;
    const drawH = vh * finalScale;
    const dx = (outW - drawW) / 2 + (videoOffsetX * (outW / previewStage.clientWidth));
    const dy = (outH - drawH) / 2 + (videoOffsetY * (outH / previewStage.clientHeight));

    ctx.drawImage(sourceVideo, dx, dy, drawW, drawH);

    ctx.font = `700 ${Math.round((Number(fontSize.value) / previewStage.clientHeight) * outH)}px ${fontFamily.value}`;
    ctx.fillStyle = fontColor.value;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 16;

    const cx = (captionPos.xPct / 100) * outW;
    const cy = (captionPos.yPct / 100) * outH;
    const lines = (captionOverlay.textContent || '').split('\n');
    const lineHeight = Math.round((Number(fontSize.value) / previewStage.clientHeight) * outH * 1.15);
    lines.forEach((line, idx) => {
      ctx.fillText(line, cx, cy + idx * lineHeight);
    });
  };

  output.textContent = 'Renderizando e gravando corte 9:16...';
  recorder.start(200);
  await sourceVideo.play();

  await new Promise((resolve) => {
    const tick = () => {
      drawFrame();
      if (sourceVideo.currentTime >= cutEnd || sourceVideo.ended) {
        sourceVideo.pause();
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });

  recorder.stop();

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'corte-9x16.webm';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    output.textContent = 'Download concluído: corte-9x16.webm';
  };
}

downloadBtn.addEventListener('click', downloadClip916);

captionText.value = captionOverlay.textContent;
updateVideoTransform();
updateCaptionStyles();
renderState();
