// Cookie consent + Audience ratings (localStorage based)

const CONSENT_KEY = 'souls_cookie_consent';
const RATINGS_KEY = 'souls_audience_ratings';

// --- Consent ---
function getConsent() {
  return localStorage.getItem(CONSENT_KEY); // 'accepted' | 'declined' | null
}

function setConsent(value) {
  localStorage.setItem(CONSENT_KEY, value);
  updateBanner();
  // Re-render ratings on all pages that need it
  if (typeof initBossRating === 'function') {
    initBossRating();
  }
}

function updateBanner() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  const consent = getConsent();
  if (consent === null) {
    banner.classList.add('visible');
  } else {
    banner.classList.remove('visible');
  }
}

function acceptCookies() {
  setConsent('accepted');
}

function declineCookies() {
  setConsent('declined');
}

// --- Ratings storage ---
function getAllRatings() {
  try {
    return JSON.parse(localStorage.getItem(RATINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function getBossRatings(bossId) {
  const all = getAllRatings();
  return all[bossId] || [];
}

function addBossRating(bossId, score) {
  if (getConsent() !== 'accepted') return false;

  const all = getAllRatings();
  // One rating per browser per boss (overwrite)
  all[bossId] = [score];

  localStorage.setItem(RATINGS_KEY, JSON.stringify(all));
  return true;
}

function getAverageRating(bossId) {
  const ratings = getBossRatings(bossId);
  if (ratings.length === 0) return { avg: 0, count: 0 };

  const sum = ratings.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / ratings.length) * 10) / 10;
  return { avg, count: ratings.length };
}

// --- UI helpers ---
function renderStars(container, score, max = 10) {
  if (!container) return;
  container.innerHTML = '';
  const fullStars = Math.floor(score);

  for (let i = 1; i <= max; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.textContent = '★';
    star.dataset.value = i;

    if (i <= fullStars) {
      star.classList.add('filled');
    }

    container.appendChild(star);
  }
}

// --- Boss page rating logic ---
let selectedRating = 0;

function highlightStars(container, upTo) {
  if (!container) return;
  const stars = container.querySelectorAll('.star');
  stars.forEach((star, idx) => {
    if (idx < upTo) {
      star.classList.add('filled');
    } else {
      star.classList.remove('filled');
    }
  });
}

function bindInteractiveStars(container) {
  if (!container) return;
  const stars = container.querySelectorAll('.star');

  stars.forEach(star => {
    star.addEventListener('mouseenter', () => {
      const val = parseInt(star.dataset.value);
      highlightStars(container, val);
    });

    star.addEventListener('mouseleave', () => {
      highlightStars(container, selectedRating);
    });

    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.value);
      highlightStars(container, selectedRating);
    });
  });
}

function initBossRating() {
  const bossId = document.body.dataset.bossId;
  if (!bossId) return;

  const feynScore = parseFloat(document.body.dataset.feynScore) || 0;
  const feynContainer = document.getElementById('feyn-stars');
  const audienceContainer = document.getElementById('audience-stars');
  const audienceScoreEl = document.getElementById('audience-score');
  const audienceCountEl = document.getElementById('audience-count');
  const rateBtn = document.getElementById('rate-btn');
  const rateMsg = document.getElementById('rate-message');
  const interactiveContainer = document.getElementById('interactive-stars');

  // Render Feyn (fixed)
  renderStars(feynContainer, feynScore);

  // Render current audience
  const { avg, count } = getAverageRating(bossId);
  renderStars(audienceContainer, avg);

  if (audienceScoreEl) {
    audienceScoreEl.textContent = avg === 0 ? '0' : avg.toFixed(1);
  }
  if (audienceCountEl) {
    audienceCountEl.textContent = count > 0 
      ? `(${count} ${count === 1 ? 'оценка' : 'оценок'})` 
      : '(нет оценок)';
  }

  // Interactive stars — always render
  const prev = getBossRatings(bossId);
  selectedRating = prev.length > 0 ? prev[0] : 0;
  renderStars(interactiveContainer, selectedRating);

  const consent = getConsent();

  if (rateBtn) {
    if (consent !== 'accepted') {
      rateBtn.disabled = true;
      rateBtn.textContent = 'Примите cookies';
      if (rateMsg) rateMsg.textContent = 'Чтобы оставить оценку, примите использование cookies.';
      if (interactiveContainer) {
        interactiveContainer.style.opacity = '0.4';
        interactiveContainer.style.pointerEvents = 'none';
      }
    } else {
      rateBtn.disabled = false;
      rateBtn.textContent = 'Отправить оценку';
      if (rateMsg) rateMsg.textContent = selectedRating > 0 ? `Текущая ваша оценка: ${selectedRating}/10` : '';
      if (interactiveContainer) {
        interactiveContainer.style.opacity = '1';
        interactiveContainer.style.pointerEvents = 'auto';
        // Make stars look interactive
        interactiveContainer.classList.add('interactive-stars');
        bindInteractiveStars(interactiveContainer);
      }
    }
  }
}

function submitRating() {
  const bossId = document.body.dataset.bossId;
  if (!bossId || selectedRating < 1) {
    const rateMsg = document.getElementById('rate-message');
    if (rateMsg) rateMsg.textContent = 'Выберите оценку от 1 до 10 звёзд.';
    return;
  }

  if (getConsent() !== 'accepted') {
    alert('Сначала примите использование cookies.');
    return;
  }

  const ok = addBossRating(bossId, selectedRating);
  if (ok) {
    const rateMsg = document.getElementById('rate-message');
    if (rateMsg) rateMsg.textContent = `Спасибо! Ваша оценка ${selectedRating}/10 сохранена.`;
    // Refresh displayed audience rating
    initBossRating();
  }
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  updateBanner();
  initBossRating();
});
