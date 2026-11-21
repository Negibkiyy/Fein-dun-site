// Cookie consent + Audience ratings (localStorage based)

const CONSENT_KEY = 'souls_cookie_consent';
const RATINGS_KEY = 'souls_audience_ratings';

// Special bosses with non-standard ranges
const SPECIAL_BOSSES = {
  'centipede-demon': { min: -100, max: 10, stars: 110 }
};

// --- Consent ---
function getConsent() {
  return localStorage.getItem(CONSENT_KEY); // 'accepted' | 'declined' | null
}

function setConsent(value) {
  localStorage.setItem(CONSENT_KEY, value);
  updateBanner();
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
function renderStars(container, score, max = 10, min = 0) {
  if (!container) return;
  container.innerHTML = '';
  const range = max - min;
  const normalized = score - min; // 0 .. range
  const filledCount = Math.max(0, Math.min(range, Math.round(normalized)));

  for (let i = 1; i <= range; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.textContent = '★';
    star.dataset.value = min + i;
    if (i <= filledCount) {
      star.classList.add('filled');
    }
    container.appendChild(star);
  }
}

// --- Boss page rating logic ---
let selectedRating = 0;
let currentMin = 0;
let currentMax = 10;

function highlightStars(container, upToValue) {
  if (!container) return;
  const stars = container.querySelectorAll('.star');
  stars.forEach(star => {
    const val = parseInt(star.dataset.value);
    if (val <= upToValue) {
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

  // Determine range
  const special = SPECIAL_BOSSES[bossId];
  if (special) {
    currentMin = special.min;
    currentMax = special.max;
  } else {
    currentMin = 0;
    currentMax = 10;
  }

  const feynScore = parseFloat(document.body.dataset.feynScore) || 0;
  const feynScoreEl = document.getElementById('feyn-score');
  const audienceScoreEl = document.getElementById('audience-score');
  const audienceCountEl = document.getElementById('audience-count');
  const rateBtn = document.getElementById('rate-btn');
  const rateMsg = document.getElementById('rate-message');
  const interactiveContainer = document.getElementById('interactive-stars');

  // Numeric Feyn
  if (feynScoreEl) {
    feynScoreEl.textContent = `${feynScore}/10`;
  }

  // Numeric audience
  const { avg, count } = getAverageRating(bossId);
  if (audienceScoreEl) {
    audienceScoreEl.textContent = avg === 0 ? '0' : avg.toFixed(1);
  }
  if (audienceCountEl) {
    audienceCountEl.textContent = count > 0
      ? `(${count} ${count === 1 ? 'оценка' : 'оценок'})`
      : '(нет оценок)';
  }

  // Interactive stars
  const prev = getBossRatings(bossId);
  selectedRating = prev.length > 0 ? prev[0] : currentMin;
  const starCount = currentMax - currentMin;
  renderStars(interactiveContainer, selectedRating, currentMax, currentMin);

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
      if (rateMsg) rateMsg.textContent = selectedRating !== currentMin || prev.length
        ? `Текущая ваша оценка: ${selectedRating}`
        : '';
      if (interactiveContainer) {
        interactiveContainer.style.opacity = '1';
        interactiveContainer.style.pointerEvents = 'auto';
        interactiveContainer.classList.add('interactive-stars');
        bindInteractiveStars(interactiveContainer);
      }
    }
  }
}

function submitRating() {
  const bossId = document.body.dataset.bossId;
  if (!bossId) return;

  if (selectedRating < currentMin || selectedRating > currentMax) {
    const rateMsg = document.getElementById('rate-message');
    if (rateMsg) rateMsg.textContent = `Выберите оценку от ${currentMin} до ${currentMax}.`;
    return;
  }

  if (getConsent() !== 'accepted') {
    alert('Сначала примите использование cookies.');
    return;
  }

  const ok = addBossRating(bossId, selectedRating);
  if (ok) {
    const rateMsg = document.getElementById('rate-message');
    if (rateMsg) rateMsg.textContent = `Спасибо! Ваша оценка ${selectedRating} сохранена.`;
    initBossRating();
  }
}

// Init on load

// --- Update audience scores on list cards ---
function updateListAudienceScores() {
  document.querySelectorAll(".boss-list-item").forEach(card => {
    const href = card.getAttribute("href") || "";
    // extract boss id from path like bosses/ds1/asylum-demon.html
    const match = href.match(/\/([a-z0-9-]+)\.html$/);
    if (!match) return;
    const bossId = match[1];
    const { avg, count } = getAverageRating(bossId);

    // Find the audience score element inside this card
    const scoreEl = card.querySelector(".audience-score");
    if (scoreEl) {
      scoreEl.textContent = (avg === 0 ? "0" : avg.toFixed(1)) + "/10";
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateBanner();
  initBossRating();
  updateListAudienceScores();
});

