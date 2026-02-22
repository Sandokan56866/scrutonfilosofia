const durationChips = document.querySelectorAll('.chip');
const selectedDuration = document.getElementById('selectedDuration');
const captionPreview = document.getElementById('captionPreview');
const captionToggle = document.getElementById('captionToggle');
const captionPosition = document.getElementById('captionPosition');
const captionFont = document.getElementById('captionFont');
const captionColor = document.getElementById('captionColor');
const captionSize = document.getElementById('captionSize');
const analyzeBtn = document.getElementById('analyzeBtn');
const exportBtn = document.getElementById('exportBtn');
const resultBox = document.getElementById('resultBox');
const githubRepo = document.getElementById('githubRepo');
const repoLink = document.getElementById('repoLink');

let currentDuration = '30s';

durationChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    durationChips.forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    currentDuration = chip.dataset.duration;
    selectedDuration.textContent = currentDuration;
  });
});

function updateCaptionPreview() {
  captionPreview.style.display = captionToggle.value === 'off' ? 'none' : 'block';
  captionPreview.style.color = captionColor.value;
  captionPreview.style.fontSize = `${captionSize.value}px`;
  captionPreview.style.fontFamily = captionFont.value;

  const positions = {
    top: { top: '10%', bottom: 'auto' },
    center: { top: '50%', bottom: 'auto' },
    bottom: { top: 'auto', bottom: '12%' }
  };

  captionPreview.style.top = positions[captionPosition.value].top;
  captionPreview.style.bottom = positions[captionPosition.value].bottom;
  captionPreview.style.transform = captionPosition.value === 'center'
    ? 'translate(-50%, -50%)'
    : 'translateX(-50%)';
}

[captionToggle, captionPosition, captionFont, captionColor, captionSize].forEach((el) => {
  el.addEventListener('input', updateCaptionPreview);
});

function updateRepoLink() {
  const url = githubRepo.value.trim();
  const isGithub = /^https:\/\/github\.com\/.+/i.test(url);
  repoLink.href = isGithub ? url : '#';
  repoLink.style.opacity = isGithub ? '1' : '0.45';
  repoLink.style.pointerEvents = isGithub ? 'auto' : 'none';
}

githubRepo.addEventListener('input', updateRepoLink);

async function askGemini(youtubeUrl, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `Você é um editor de vídeos shorts. Dado este vídeo do YouTube: ${youtubeUrl}, sugira 3 cortes virais com duração de ${currentDuration}. Retorne JSON no formato [{"titulo":"","inicio":"mm:ss","fim":"mm:ss","motivo":""}]`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error('Falha ao consultar Gemini. Verifique API key e permissões.');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Gemini não retornou conteúdo.';
}

analyzeBtn.addEventListener('click', async () => {
  const youtubeUrl = document.getElementById('youtubeUrl').value.trim();
  const apiKey = document.getElementById('geminiKey').value.trim();

  if (!youtubeUrl) {
    resultBox.textContent = 'Informe uma URL do YouTube.';
    return;
  }

  if (!apiKey) {
    resultBox.textContent = 'Informe a Gemini API Key para análise real.';
    return;
  }

  resultBox.textContent = 'Analisando com Gemini...';

  try {
    const aiResult = await askGemini(youtubeUrl, apiKey);
    resultBox.textContent = aiResult;
  } catch (error) {
    resultBox.textContent = `${error.message}\n\nDica: para testes sem API, você pode usar o botão de gerar configuração.`;
  }
});

exportBtn.addEventListener('click', () => {
  const payload = {
    source: document.getElementById('youtubeUrl').value || 'não informado',
    duration: currentDuration,
    subtitle: {
      enabled: captionToggle.value === 'on',
      position: captionPosition.value,
      font: captionFont.value,
      color: captionColor.value,
      size: `${captionSize.value}px`
    },
    layout: 'mobile-first bento minimalista',
    repository: githubRepo.value.trim() || 'não informado'
  };

  resultBox.textContent = JSON.stringify(payload, null, 2);
});

updateCaptionPreview();
updateRepoLink();
