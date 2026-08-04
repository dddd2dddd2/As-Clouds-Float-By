// reader.js —— 诗词阅读器 Modal：打开/关闭、详情渲染
import { state, els } from './state.js';
import { conv } from './language.js';
import { clearCinematicTimers, formatPoemContentCinematic, triggerInkSplash } from './animation.js';
import { renderPoemImages } from './gallery.js';
import { resetReaderScrollPositions } from './layout.js';

  export function openReader() {
    els.poemModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  export function closeReader() {
    els.poemModal.classList.remove('active');
    document.body.style.overflow = '';
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
    if (els.poemDetailTitle) els.poemDetailTitle.textContent = conv(poem.title);
    if (els.poemGenreBadge) els.poemGenreBadge.textContent = conv(poem.cipai || poem.genre);
    const vol = state.volumes.find(v => String(v.id) === String(poem.volume));
    if (els.poemVolumeBadge) els.poemVolumeBadge.textContent = vol ? conv(vol.fullName) : '';
    if (els.poemEpigraph) els.poemEpigraph.textContent = poem.epigraph ? `“${conv(poem.epigraph)}”` : '';
    if (els.poemDateLocation) els.poemDateLocation.textContent = conv(poem.dateLocation || '');
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
    const lineCount = poem.content.split('\n').filter(l => l.trim()).length;
    const totalDelay = baseLineDelay + Math.max(0, lineCount - 1) * 0.75 + 1.1;
    state.cinematicTimers.push(setTimeout(() => {
      if (els.poemModal) els.poemModal.classList.add('skip-animation');
    }, totalDelay * 1000));
  }
