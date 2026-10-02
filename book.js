'use strict';

// Drag-following page-curl geometry adapted from lixp185/bookfx for this static web page.
// See LICENSE.bookfx for the upstream BSD 3-Clause license notice.

/* ============================================================
   内容配置（改这里就能增删书页、换内容）
   ============================================================ */

// 纸条图片：翻页用 assets/notes/，点开放大用 assets/notes/full/（同名文件）
const NOTE_DIR = 'assets/book/notes/';
const NOTE_FULL_DIR = 'assets/book/notes/full/';

const NOTES = [
  'IMG_4057', 'IMG_4058', 'IMG_4059', 'IMG_4060', 'IMG_4061', 'IMG_4062',
  'IMG_4063', 'IMG_4065', 'IMG_4066', 'IMG_4067', 'IMG_4068',
  'IMG_4069', 'IMG_4070', 'IMG_4071', 'IMG_4072', 'IMG_4073', 'IMG_4075',
  'IMG_4077', 'IMG_4078', 'IMG_4079', 'IMG_4080',
];

// 右页字条：同样分书页图 / 放大图两份
const SLIP_DIR = 'assets/book/slips/';
const SLIP_FULL_DIR = 'assets/book/slips/full/';

// 第 i 个对开页右页放第几号字条（'17-19' = 17、19 两张合成一张）；超出部分（最后两页）留空白可书写
const SLIPS = [21, 9, 10, 11, 12, 13, 14, 2, 1, 3, 6, 4, 5, 8, 7, 16, 18, '17-19', 20];

// 每一项 = 一个对开页（左页 + 右页）。增删项目即可改变页数。
//   id          : 唯一标识，右页输入的文字按它保存在本机
//   left.image  : 左页纸条图片文件名（位于 NOTE_DIR）
//   right.image : 右页字条图片文件名（位于 SLIP_DIR）
//   *.html      : 可选，自定义 HTML（文字 / 图片），设置后替代图片
//   右页既没有 image 也没有 html 时，是可点击输入的空白羊皮纸
//   第 0 项是封面：合上的书只露出右半边封面，左半边空着
const SPREADS = [
  { id: 'cover', left: { empty: true }, right: { cover: true } },
  ...NOTES.map((name, i) => ({
    id: name,
    left: { image: `${name}.jpg` },
    right: SLIPS[i] ? { image: `slip-${String(SLIPS[i]).padStart(2, '0')}.jpg` } : {},
  })),
];

const IMAGE_DIRS = {
  left: { dir: NOTE_DIR, full: NOTE_FULL_DIR, label: '纸条' },
  right: { dir: SLIP_DIR, full: SLIP_FULL_DIR, label: '字条' },
};

const STORAGE_KEY = 'flipbook-text-v1';

/* ============================================================
   DOM
   ============================================================ */
const $ = (sel) => document.querySelector(sel);
const book = $('#book');
const slotLeft = $('#slotLeft');
const slotRight = $('#slotRight');
const flipEl = $('#flip');
const flipUnder = $('#flipUnder');
const flipFront = $('#flipFront');
const flipBack = $('#flipBack');
const flipBackPage = $('#flipBackPage');
const prevBtn = $('#prevBtn');
const nextBtn = $('#nextBtn');
const counter = $('#counter');
const viewer = $('#viewer');
const viewerImg = $('#viewerImg');
const viewerZoom = $('#viewerZoom');
const viewerClose = $('#viewerClose');
const bookRoot = $('#bookOverlay');
const bookBack = $('#bookBack');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let current = 0;        // 当前对开页序号
let animating = false;  // 动画进行中时忽略新的输入
let rendered = false;   // 书本隐藏时不提前创建和解码书页图片
let texts = {};

try { texts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { texts = {}; }

function saveTexts() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(texts)); } catch { /* 隐私模式下忽略 */ }
}

/* ============================================================
   书页生成
   live = true：真实可交互的页；false：翻页动画里用的静态副本
   ============================================================ */
function buildPage(index, side, live) {
  const page = document.createElement('div');
  page.className = `page page--${side}`;
  const spread = SPREADS[index];
  if (!spread) return page;
  const cfg = spread[side] || {};

  if (cfg.empty) {
    page.classList.add('page--empty');
    return page;
  }

  if (cfg.cover) {
    page.classList.add('page--cover');
    if (live) {
      page.setAttribute('role', 'img');
      page.setAttribute('aria-label', '封面：Memoir 回忆录');
    }
    return page;
  }

  if (cfg.html) {
    const box = document.createElement('div');
    box.className = 'page__custom';
    box.innerHTML = cfg.html;
    page.append(box);
    return page;
  }

  if (cfg.image) {
    const { dir, full, label } = IMAGE_DIRS[side];
    const note = document.createElement(live ? 'button' : 'div');
    note.className = side === 'right' ? 'note note--slip' : 'note';
    if (live) {
      note.type = 'button';
      note.dataset.full = full + cfg.image;
      note.setAttribute('aria-label', `放大查看第 ${index} 张${label}`);
    }
    const img = new Image();
    img.src = dir + cfg.image;
    img.alt = live ? `第 ${index} 张手写${label}` : '';
    img.decoding = 'async';
    img.draggable = false;
    note.append(img);
    page.append(note);
    return page;
  }

  if (side === 'right') {
    const value = texts[spread.id] || '';
    if (live) {
      const area = document.createElement('textarea');
      area.className = 'writer';
      area.value = value;
      area.dataset.key = spread.id;
      area.spellcheck = false;
      area.setAttribute('aria-label', `第 ${index} 页右侧书写区`);
      page.append(area);
    } else if (value) {
      const text = document.createElement('div');
      text.className = 'writer writer--static';
      text.textContent = value;
      page.append(text);
    }
  }
  return page;
}

function preload(index) {
  const spread = SPREADS[index];
  if (!spread) return;
  ['left', 'right'].forEach((side) => {
    const cfg = spread[side];
    if (cfg && cfg.image) new Image().src = IMAGE_DIRS[side].dir + cfg.image;
  });
}

function renderSpread() {
  slotLeft.replaceChildren(buildPage(current, 'left', true));
  slotRight.replaceChildren(buildPage(current, 'right', true));
  book.classList.toggle('is-closed', current === 0);
  counter.textContent = current === 0 ? '封面' : `${current} / ${SPREADS.length - 1}`;
  prevBtn.disabled = current === 0;
  nextBtn.disabled = current === SPREADS.length - 1;
  preload(current + 1);
  preload(current - 1);
}

function openBook() {
  bookRoot.hidden = false;
  document.body.classList.add('book-is-open');
  // 每次从信件进来都先看到合着的封面
  if (!rendered || current !== 0) {
    current = 0;
    renderSpread();
    rendered = true;
  }
  requestAnimationFrame(() => bookRoot.classList.add('is-visible'));
  nextBtn.focus({ preventScroll: true });
}

function closeBook() {
  bookRoot.classList.remove('is-visible');
  window.setTimeout(() => {
    bookRoot.hidden = true;
    document.body.classList.remove('book-is-open');
    $('#continueButton').focus({ preventScroll: true });
  }, 180);
}

/* ============================================================
   翻页引擎
   坐标系：书本左上角为原点，单页宽 W、高 H，书脊在 x = W。
   向前翻时拖动右页外侧角 C；向后翻时整层镜像（.is-back），
   用同一套几何把左页当作“右页”来算。
   手指点 P 与角点 C 的垂直平分线就是折痕：
   折痕外侧那块纸被翻起、沿折痕镜像过去，露出背面（下一张的左页）。
   ============================================================ */
let W = 0, H = 0, DIAG = 0;
let flip = null;   // { dir, cy, P }

function v(x, y) { return { x, y }; }

function beginFlip(dir, cy) {
  W = book.clientWidth / 2;
  H = book.clientHeight;
  DIAG = Math.hypot(W, H);
  const target = current + dir;
  if (dir > 0) {
    flipFront.replaceChildren(buildPage(current, 'right', false));
    flipUnder.replaceChildren(buildPage(target, 'right', false));
    flipBackPage.replaceChildren(buildPage(target, 'left', false));
  } else {
    flipFront.replaceChildren(buildPage(current, 'left', false));
    flipUnder.replaceChildren(buildPage(target, 'left', false));
    flipBackPage.replaceChildren(buildPage(target, 'right', false));
  }
  flipEl.classList.toggle('is-back', dir < 0);
  // 翻开封面时书本同时滑到居中；合回封面时左页要逐渐露出空白，先藏起底下的真实左页
  if (current === 0) book.classList.remove('is-closed');
  if (target === 0) slotLeft.style.visibility = 'hidden';
  flipEl.hidden = false;
  if (document.activeElement && document.activeElement.classList.contains('writer')) {
    document.activeElement.blur();
  }
  flip = { dir, cy, P: v(2 * W, cy) };
  drawFlip(flip.P);
}

function endFlip(done) {
  if (done) {
    current += flip.dir;
    renderSpread();
  }
  // 等新页面画出来再撤掉翻页层，避免图片解码时闪一下
  requestAnimationFrame(() => requestAnimationFrame(() => hideFlip()));
}

function hideFlip() {
  flipEl.hidden = true;
  flipEl.classList.remove('is-back');
  flipFront.replaceChildren();
  flipUnder.replaceChildren();
  flipBackPage.replaceChildren();
  slotLeft.style.visibility = '';
  book.classList.toggle('is-closed', current === 0);
  flip = null;
  animating = false;
}

// 纸张一边粘在书脊上：限制 P 到两个书脊端点的距离，避免纸被“撕下来”
function constrain(p, cy) {
  const near = v(W, cy);
  const far = v(W, H - cy);
  let d = Math.hypot(p.x - near.x, p.y - near.y);
  if (d > W) p = v(near.x + (p.x - near.x) * W / d, near.y + (p.y - near.y) * W / d);
  d = Math.hypot(p.x - far.x, p.y - far.y);
  if (d > DIAG) p = v(far.x + (p.x - far.x) * DIAG / d, far.y + (p.y - far.y) * DIAG / d);
  return p;
}

// 用半平面裁剪矩形（Sutherland–Hodgman）
function clip(poly, side) {
  const out = [];
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push(v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));
    }
  }
  return out;
}

function polygon(pts, map) {
  if (pts.length < 3) return 'polygon(0 0, 0 0, 0 0)';
  return `polygon(${pts.map((p) => { const q = map(p); return `${q.x.toFixed(2)}px ${q.y.toFixed(2)}px`; }).join(',')})`;
}

function drawFlip(P) {
  const { cy } = flip;
  const C = v(2 * W, cy);
  const dx = C.x - P.x;
  const dy = C.y - P.y;
  const dist = Math.hypot(dx, dy);
  const page = [v(W, 0), v(2 * W, 0), v(2 * W, H), v(W, H)];

  if (dist < 0.5) {
    flipFront.style.clipPath = 'none';
    flipBack.style.visibility = 'hidden';
    return;
  }
  flipBack.style.visibility = 'visible';

  const n = v(dx / dist, dy / dist);              // 折痕法线，指向角点 C
  const M = v((C.x + P.x) / 2, (C.y + P.y) / 2);  // 折痕经过的点
  const side = (p) => (p.x - M.x) * n.x + (p.y - M.y) * n.y;

  // 未翻起的部分（靠书脊一侧）
  const front = clip(page, (p) => -side(p));
  flipFront.style.clipPath = polygon(front, (p) => v(p.x - W, p.y));

  // 翻起的部分：背面页先以书脊镜像，再沿折痕镜像，两次镜像 = 旋转，内容不会反
  const flap = clip(page, side);
  const T = (p) => {
    const q = v(2 * W - p.x, p.y);
    const s = side(q);
    return v(q.x - 2 * s * n.x, q.y - 2 * s * n.y);
  };
  const o = T(v(0, 0));
  const ex = T(v(1, 0));
  const ey = T(v(0, 1));
  flipBack.style.transform = `matrix(${ex.x - o.x},${ex.y - o.y},${ey.x - o.x},${ey.y - o.y},${o.x},${o.y})`;
  flipBack.style.clipPath = polygon(flap, (p) => v(2 * W - p.x, p.y));

}

function setP(P) {
  flip.P = constrain(P, flip.cy);
  drawFlip(flip.P);
}

const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// 从当前 P 动画到终点；lift 让按钮翻页时纸角先抬起再落下
function animateTo(done, { duration, ease = easeOut, lift = 0 }) {
  animating = true;
  const from = { ...flip.P };
  const to = done ? v(0, flip.cy) : v(2 * W, flip.cy);
  const liftDir = flip.cy > H / 2 ? -1 : 1;
  if (reduceMotion.matches) { endFlip(done); return; }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const e = ease(t);
    const y = from.y + (to.y - from.y) * e + Math.sin(Math.PI * t) * lift * liftDir;
    setP(v(from.x + (to.x - from.x) * e, y));
    if (t < 1) requestAnimationFrame(step);
    else endFlip(done);
  };
  requestAnimationFrame(step);
}

function turn(dir) {
  const target = current + dir;
  if (animating || flip || target < 0 || target >= SPREADS.length) return;
  if (reduceMotion.matches) { current = target; renderSpread(); return; }
  animating = true;
  beginFlip(dir, book.clientHeight);
  animateTo(true, { duration: 760, ease: easeInOut, lift: H * 0.2 });
}

/* ============================================================
   手势：拖动书角 / 左右滑动
   手指移动超过阈值才开始翻页，所以轻点纸条、轻点右页输入都不受影响。
   ============================================================ */
const DRAG_START = 8;     // px，判定开始拖动
const FLICK_SPEED = 0.45; // px/ms，快速甩动直接翻页

let gesture = null;
let suppressClick = false;

book.addEventListener('pointerdown', (e) => {
  if (animating || flip || !e.isPrimary || e.button > 0) return;
  // 正在打字时，右页内的拖动留给文字选择 / 滚动
  if (e.target.classList.contains('writer') && document.activeElement === e.target) return;
  const r = book.getBoundingClientRect();
  gesture = {
    id: e.pointerId,
    x0: e.clientX,
    y0: e.clientY,
    yRel: e.clientY - r.top,
    lastX: e.clientX,
    lastT: e.timeStamp,
    vx: 0,
    started: false,
  };
});

document.addEventListener('pointermove', (e) => {
  if (!gesture || e.pointerId !== gesture.id) return;
  const dx = e.clientX - gesture.x0;
  const dy = e.clientY - gesture.y0;

  if (!gesture.started) {
    if (Math.abs(dx) < DRAG_START || Math.abs(dx) < Math.abs(dy)) return;
    const dir = dx < 0 ? 1 : -1;
    const target = current + dir;
    if (target < 0 || target >= SPREADS.length) { gesture = null; return; }
    gesture.started = true;
    gesture.dir = dir;
    const h = book.clientHeight;
    // 按下位置靠上就拎上角，靠下就拎下角
    beginFlip(dir, gesture.yRel < h / 2 ? 0 : h);
  }

  e.preventDefault();
  const dt = e.timeStamp - gesture.lastT;
  if (dt > 0) gesture.vx = 0.7 * gesture.vx + 0.3 * ((e.clientX - gesture.lastX) / dt);
  gesture.lastX = e.clientX;
  gesture.lastT = e.timeStamp;

  const mx = gesture.dir > 0 ? dx : -dx;  // 换算到“向前翻”的坐标
  setP(v(2 * W + mx, flip.cy + dy * 0.6));
});

function releaseGesture(e, cancelled) {
  if (!gesture || e.pointerId !== gesture.id) return;
  const g = gesture;
  gesture = null;
  if (!g.started || !flip) return;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);

  const speed = g.dir > 0 ? -g.vx : g.vx;  // 朝书脊方向的速度
  let done = flip.P.x < W;
  if (speed > FLICK_SPEED) done = true;
  if (speed < -FLICK_SPEED) done = false;
  if (cancelled) done = false;

  const remaining = done ? flip.P.x : 2 * W - flip.P.x;
  animateTo(done, { duration: 220 + 360 * Math.min(1, Math.abs(remaining) / (2 * W)) });
}

document.addEventListener('pointerup', (e) => releaseGesture(e, false));
document.addEventListener('pointercancel', (e) => releaseGesture(e, true));

// iOS Safari 需要在 touchmove 里阻止默认行为才能完全锁住页面
document.addEventListener('touchmove', (e) => {
  if (gesture && gesture.started) e.preventDefault();
  else if (!e.target.closest('.writer, .viewer__scroll')) e.preventDefault();
}, { passive: false });

/* ============================================================
   右页书写 / 纸条放大 / 按钮 / 键盘
   ============================================================ */
book.addEventListener('input', (e) => {
  const area = e.target;
  if (!area.classList.contains('writer')) return;
  texts[area.dataset.key] = area.value;
  saveTexts();
});

book.addEventListener('click', (e) => {
  if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
  const note = e.target.closest('.note');
  if (note && note.dataset.full) openViewer(note.dataset.full);
  else if (e.target.closest('.page--cover')) turn(1);  // 轻点封面也能翻开
}, true);

function openViewer(src) {
  viewerImg.src = src;
  viewerImg.alt = '纸条大图';
  viewer.classList.remove('is-zoomed');
  viewerZoom.setAttribute('aria-pressed', 'false');
  viewerZoom.textContent = '放大';
  viewer.showModal();
}

viewerZoom.addEventListener('click', () => {
  const zoomed = viewer.classList.toggle('is-zoomed');
  viewerZoom.setAttribute('aria-pressed', String(zoomed));
  viewerZoom.textContent = zoomed ? '缩小' : '放大';
});

bookBack.addEventListener('click', closeBook);
viewerClose.addEventListener('click', () => viewer.close());
viewer.addEventListener('close', () => { viewerImg.removeAttribute('src'); });

prevBtn.addEventListener('click', () => turn(-1));
nextBtn.addEventListener('click', () => turn(1));

document.addEventListener('keydown', (e) => {
  if (viewer.open || e.target.classList.contains('writer')) return;
  if (!bookRoot.hidden && e.key === 'Escape') { closeBook(); return; }
  if (e.key === 'ArrowRight') turn(1);
  if (e.key === 'ArrowLeft') turn(-1);
});

window.giftBook = { open: openBook, close: closeBook };
