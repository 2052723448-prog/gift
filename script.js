const envelope = document.querySelector('#envelope');
const envelopeWrap = document.querySelector('#envelopeWrap');
const sealButton = document.querySelector('#sealButton');
const replayButton = document.querySelector('#replayButton');
const sparkles = document.querySelector('#sparkles');
const hint = document.querySelector('#hint');
const mailStage = document.querySelector('.mail-stage');
let revealTimer;
let sparkleTimer;

function burst() {
  window.clearTimeout(sparkleTimer);
  sparkles.replaceChildren();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const count = window.matchMedia('(max-width: 700px)').matches ? 18 : 30;
  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'sparkle';
    const x = 50 + (Math.random() - 0.5) * 28;
    const y = 53 + (Math.random() - 0.5) * 11;
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
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
    if (document.activeElement === sealButton) replayButton.focus({ preventScroll: true });
  }, 720);
  burst();
}

function closeLetter() {
  window.clearTimeout(revealTimer);
  window.clearTimeout(sparkleTimer);
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
  hint.removeAttribute('aria-hidden');
  if (restoreFocus) sealButton.focus({ preventScroll: true });
}

sealButton.addEventListener('click', openLetter);
replayButton.addEventListener('click', closeLetter);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && envelope.classList.contains('is-open')) closeLetter();
});
