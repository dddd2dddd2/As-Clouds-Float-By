import { state, els } from './state.js';
import { conv } from './language.js';
import { clearCinematicTimers, formatPoemContentCinematic, triggerInkSplash } from './animation.js';
import { renderPoemImages } from './gallery.js';
import { resetReaderScrollPositions, alignVerticalTitleAndContent } from './layout.js';
import { CIPAI_DB } from './cipai_db.js';

export function openReader() {
  els.poemModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeReader() {
  els.poemModal.classList.remove('active');
  document.body.style.overflow = '';
}

export function showCipaiModal(cipaiName) {
  const info = CIPAI_DB[cipaiName];
  if (!info) return;

  const popover = document.createElement('div');
  popover.className = 'cipai-popover-modal';
  popover.innerHTML = `
    <div class="cipai-popover-card">
      <button class="cipai-popover-close">&times;</button>
      <h3 class="cipai-title">${conv(cipaiName)} <span class="cipai-alias">${info.alias ? '（又名：' + conv(info.alias) + '）' : ''}</span></h3>
      <p class="cipai-tune"><strong>【体格律调】</strong>${conv(info.tune)}</p>
      <p class="cipai-desc"><strong>【牌名释意】</strong>${conv(info.desc)}</p>
      <div class="cipai-pattern"><strong>【经典平仄例】</strong><code>${conv(info.pattern)}</code></div>
    </div>
  `;

  document.body.appendChild(popover);
  requestAnimationFrame(() => popover.classList.add('active'));

  const dismiss = () => {
    popover.classList.remove('active');
    setTimeout(() => popover.remove(), 300);
  };
  popover.querySelector('.cipai-popover-close').onclick = dismiss;
  popover.addEventListener('click', (e) => {
    if (e.target === popover) dismiss();
  });
  document.addEventListener('keydown', function escHandler(ev) {
    if (ev.key === 'Escape') {
      dismiss();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

export async function openPoemDetail(index) {
  if (index < 0 || index >= state.allPoems.length) return;
  clearCinematicTimers();
  triggerInkSplash(); 
  state.currentPoemIndex = index;
  const poem = state.allPoems[index];
  const modalContainer = els.poemModal.querySelector('.modal-container');
  if (modalContainer) {
    modalContainer.scrollTop = 0;
  }
  if (els.btnPrevPoem) els.btnPrevPoem.disabled = (index === 0);
  if (els.btnNextPoem) els.btnNextPoem.disabled = (index === state.allPoems.length - 1);

  // 格式化标题 DOM 结构，便于定位测量
  if (els.poemDetailTitle) {
    const rawTitle = conv(poem.title);
    if (rawTitle.includes('·')) {
      const parts = rawTitle.split('·');
      els.poemDetailTitle.innerHTML = `<span class="title-cipai">${parts[0]}·</span><span class="title-sub">${parts.slice(1).join('·')}</span>`;
    } else {
      els.poemDetailTitle.innerHTML = `<span class="title-main">${rawTitle}</span>`;
    }
  }

  if (els.poemGenreBadge) {
    const badgeText = poem.cipai || poem.genre;
    els.poemGenreBadge.textContent = conv(badgeText);
    els.poemGenreBadge.classList.toggle('has-cipai', !!CIPAI_DB[badgeText]);
    els.poemGenreBadge.onclick = null;
    if (CIPAI_DB[badgeText]) {
      els.poemGenreBadge.onclick = () => showCipaiModal(badgeText);
    }
  }
  const vol = state.volumes.find(v => String(v.id) === String(poem.volume));
  if (els.poemVolumeBadge) els.poemVolumeBadge.textContent = vol ? conv(vol.fullName) : '';
  if (els.poemEpigraph) els.poemEpigraph.textContent = poem.epigraph ? `“${conv(poem.epigraph)}”` : '';
  if (els.poemDateLocation) els.poemDateLocation.textContent = conv(poem.lunarDate || poem.dateLocation || '');

  if (els.poemTranslationBlock && els.poemTranslationText) {
    if (poem.translation) {
      els.poemTranslationText.textContent = poem.translation;
      els.poemTranslationBlock.style.display = 'block';
    } else {
      els.poemTranslationBlock.style.display = 'none';
    }
  }

  if (els.authorNotesDetails && els.authorNotesContent) {
    if (poem.notes) {
      els.authorNotesContent.textContent = conv(poem.notes);
      els.authorNotesDetails.style.display = 'block';
      els.authorNotesDetails.open = false;
    } else {
      els.authorNotesDetails.style.display = 'none';
    }
  }

  const allUrls = await renderPoemImages(poem.id);
  const headerEl = els.poemModal ? els.poemModal.querySelector('.poem-header') : null;
  let baseLineDelay = 0;
  els.poemModal.classList.add('cinematic-mode');
  els.poemModal.classList.remove('skip-animation');
  const firstImageUrl = allUrls[0] || null;

  if (firstImageUrl && els.poemCinematicBg) {
    els.poemCinematicBg.style.backgroundImage = `url("${firstImageUrl}")`;
    els.poemCinematicBg.className = 'poem-cinematic-bg phase-full';
    state.cinematicTimers.push(setTimeout(() => {
      els.poemCinematicBg.className = 'poem-cinematic-bg phase-dim';
    }, 1200));
    baseLineDelay = 1.8;
  } else if (els.poemCinematicBg) {
    els.poemCinematicBg.style.backgroundImage = 'none';
    els.poemCinematicBg.className = 'poem-cinematic-bg';
    baseLineDelay = 0.4;
  }

  if (headerEl) {
    headerEl.classList.remove('cinematic-header');
    void headerEl.offsetWidth;
    headerEl.classList.add('cinematic-header');
    headerEl.style.animationDelay = `${Math.max(0, baseLineDelay - 0.3).toFixed(2)}s`;
  }

  if (els.poemText) {
    const formattedContent = conv(poem.content);
    els.poemText.style.transform = '';
    els.poemText.style.transition = '';
    els.poemText.style.setProperty('margin-left', '', 'important');
    els.poemText.style.setProperty('margin-right', '', 'important');
    els.poemText.innerHTML = formatPoemContentCinematic(formattedContent, baseLineDelay);
    if (state.isVertical) {
      els.poemText.classList.add('vertical');
      if (els.poemContentArea) els.poemContentArea.classList.add('vertical-mode');
    } else {
      els.poemText.classList.remove('vertical');
      if (els.poemContentArea) els.poemContentArea.classList.remove('vertical-mode');
    }
  }

  openReader();
  resetReaderScrollPositions();

  // 延迟 100ms 避开动画初始帧，触发绝对中轴线对齐
  setTimeout(() => {
    alignVerticalTitleAndContent();
  }, 100);

  const lineCount = poem.content.split('\n').filter(l => l.trim()).length;
  const totalDelay = baseLineDelay + Math.max(0, lineCount - 1) * 0.75 + 1.1;
  state.cinematicTimers.push(setTimeout(() => {
    if (els.poemModal) els.poemModal.classList.add('skip-animation');
  }, totalDelay * 1000));
}