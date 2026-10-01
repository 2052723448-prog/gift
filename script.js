const envelope = document.querySelector('#envelope');
const envelopeWrap = document.querySelector('#envelopeWrap');
const sealButton = document.querySelector('#sealButton');
const replayButton = document.querySelector('#replayButton');
const continueButton = document.querySelector('#continueButton');
const openImage = document.querySelector('.envelope-art__image--open');
const sparkles = document.querySelector('#sparkles');
const hint = document.querySelector('#hint');
const mailStage = document.querySelector('.mail-stage');
const bookOverlay = document.querySelector('#bookOverlay');
const backgroundMusic = document.querySelector('#backgroundMusic');
const defaultLetterImage = openImage.dataset.src;
const defaultLetterAlt = openImage.getAttribute('alt');
let revealTimer;
let sparkleTimer;

function playBackgroundMusic() {
  if (!backgroundMusic) return;
  const playAttempt = backgroundMusic.play();
  if (playAttempt && typeof playAttempt.catch === 'function') {
    playAttempt.catch(() => {
      // Browsers may still reject playback in unusual embedded contexts.
      // The next user gesture will call this function again.
    });
  }
}

function stopBackgroundMusic() {
  if (!backgroundMusic) return;
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
}

function burst() {
  window.clearTimeout(sparkleTimer);
  sparkles.replaceChildren();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const count = window.matchMedia('(max-width: 700px)').matches ? 18 : 30;
  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'sparkle';
    dot.style.left = `${50 + (Math.random() - 0.5) * 28}%`;
    dot.style.top = `${53 + (Math.random() - 0.5) * 11}%`;
    dot.style.setProperty('--dx', `${(Math.random() - 0.5) * 300}px`);
    dot.style.setProperty('--dy', `${-50 - Math.random() * 190}px`);
    dot.style.animationDelay = `${Math.random() * .22}s`;
    dot.style.width = `${2 + Math.random() * 4}px`;
    dot.style.height = dot.style.width;
    sparkles.append(dot);
  }
  sparkleTimer = window.setTimeout(() => sparkles.replaceChildren(), 2200);
}

function openLetter() {
  if (envelope.classList.contains('is-open')) return;
  playBackgroundMusic();
  // Load the large open-letter artwork only after the seal is activated.
  openImage.src = defaultLetterImage;
  envelope.classList.add('is-open');
  mailStage.classList.add('is-open');
  envelopeWrap.setAttribute('aria-expanded', 'true');
  sealButton.setAttribute('aria-expanded', 'true');
  sealButton.tabIndex = -1;
  hint.setAttribute('aria-hidden', 'true');
  window.clearTimeout(revealTimer);
  revealTimer = window.setTimeout(() => {
    replayButton.classList.add('is-visible');
    replayButton.disabled = false;
    replayButton.tabIndex = 0;
    replayButton.removeAttribute('aria-hidden');
    continueButton.classList.add('is-visible');
    continueButton.disabled = false;
    continueButton.tabIndex = 0;
    continueButton.removeAttribute('aria-hidden');
    if (document.activeElement === sealButton) replayButton.focus({ preventScroll: true });
  }, 720);
  burst();
}

function continueLetter() {
  if (!envelope.classList.contains('is-open') || !window.giftBook) return;
  window.giftBook.open();
}

function closeLetter() {
  window.clearTimeout(revealTimer);
  window.clearTimeout(sparkleTimer);
  stopBackgroundMusic();
  sparkles.replaceChildren();
  const restoreFocus = document.activeElement === replayButton;
  envelope.classList.remove('is-open');
  mailStage.classList.remove('is-open');
  envelopeWrap.setAttribute('aria-expanded', 'false');
  sealButton.setAttribute('aria-expanded', 'false');
  sealButton.tabIndex = 0;
  replayButton.classList.remove('is-visible');
  replayButton.disabled = true;
  replayButton.tabIndex = -1;
  replayButton.setAttribute('aria-hidden', 'true');
  continueButton.classList.remove('is-visible', 'is-selected');
  continueButton.disabled = true;
  continueButton.tabIndex = -1;
  continueButton.setAttribute('aria-hidden', 'true');
  openImage.removeAttribute('src');
  openImage.alt = defaultLetterAlt;
  hint.removeAttribute('aria-hidden');
  if (restoreFocus) sealButton.focus({ preventScroll: true });
}

sealButton.addEventListener('click', openLetter);
replayButton.addEventListener('click', closeLetter);
continueButton.addEventListener('click', continueLetter);

document.addEventListener('keydown', (event) => {
  if (!bookOverlay.hidden) return;
  if (event.key === 'Escape' && envelope.classList.contains('is-open')) closeLetter();
});
