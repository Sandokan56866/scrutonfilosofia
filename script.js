const videoInput = document.getElementById('videoInput');
const video = document.getElementById('video');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const previewCutBtn = document.getElementById('previewCutBtn');
const captionText = document.getElementById('captionText');
const fontFamily = document.getElementById('fontFamily');
const fontSize = document.getElementById('fontSize');
const captionX = document.getElementById('captionX');
const captionY = document.getElementById('captionY');
const generateBtn = document.getElementById('generateBtn');
const output = document.getElementById('output');

const wrapper = document.createElement('div');
wrapper.className = 'video-wrap';
video.parentNode.insertBefore(wrapper, video);
wrapper.appendChild(video);

const overlay = document.createElement('div');
overlay.className = 'caption-overlay';
overlay.textContent = '';
wrapper.appendChild(overlay);

let cutEndSeconds = null;

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

function updateCaptionOverlay() {
  overlay.textContent = captionText.value;
  overlay.style.fontFamily = fontFamily.value;
  overlay.style.fontSize = `${fontSize.value}px`;
  overlay.style.left = `${captionX.value}%`;
  overlay.style.top = `${captionY.value}%`;
}

videoInput.addEventListener('change', () => {
  const file = videoInput.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  video.src = url;
  output.textContent = 'Vídeo carregado com sucesso.';
});

previewCutBtn.addEventListener('click', () => {
  const start = parseTimeToSeconds(startTimeInput.value);
  const end = parseTimeToSeconds(endTimeInput.value);

  if (start === null || end === null || end <= start) {
    output.textContent = 'Tempos inválidos. Use início e fim válidos (ex: 00:10 e 00:35).';
    return;
  }

  cutEndSeconds = end;
  video.currentTime = start;
  video.play();
  output.textContent = `Prévia do corte iniciada: ${start}s até ${end}s.`;
});

video.addEventListener('timeupdate', () => {
  if (cutEndSeconds !== null && video.currentTime >= cutEndSeconds) {
    video.pause();
  }
});

[captionText, fontFamily, fontSize, captionX, captionY].forEach((el) => {
  el.addEventListener('input', updateCaptionOverlay);
});

generateBtn.addEventListener('click', () => {
  const start = parseTimeToSeconds(startTimeInput.value);
  const end = parseTimeToSeconds(endTimeInput.value);

  if (start === null || end === null || end <= start) {
    output.textContent = 'Não foi possível gerar JSON: tempos de corte inválidos.';
    return;
  }

  const payload = {
    cut: { startSeconds: start, endSeconds: end },
    caption: {
      text: captionText.value,
      fontFamily: fontFamily.value,
      fontSize: `${fontSize.value}px`,
      xPercent: Number(captionX.value),
      yPercent: Number(captionY.value)
    }
  };

  output.textContent = JSON.stringify(payload, null, 2);
});

updateCaptionOverlay();
