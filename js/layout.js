// layout.js —— 横排 / 竖排布局切换
import { state, els } from './state.js';

  export function isMobileScreen() {
    return window.innerWidth <= 768;
  }

  export function scrollVerticalToStart() {
    if (!els.poemContentArea) return;
    requestAnimationFrame(() => {
      if (state.isVertical && !isMobileScreen()) {
        els.poemContentArea.scrollLeft = els.poemContentArea.scrollWidth;
      } else {
        els.poemContentArea.scrollLeft = 0;
      }
    });
  }

  export function resetReaderScrollPositions() {
    const modalContainer = els.poemModal ? els.poemModal.querySelector('.modal-container') : null;
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (modalContainer) {
          modalContainer.scrollTop = 0;
        }
        if (els.poemContentArea) {
          if (state.isVertical && !isMobileScreen()) {
            els.poemContentArea.scrollLeft = els.poemContentArea.scrollWidth;
          } else {
            els.poemContentArea.scrollLeft = 0;
          }
        }
      }, 60);
    });
  }

  export function updateLayoutToggleBtn() {
    if (!els.btnToggleLayout) return;
    const vert = els.btnToggleLayout.querySelector('.opt-layout-vertical');
    const horiz = els.btnToggleLayout.querySelector('.opt-layout-horizontal');
    if (vert) vert.classList.toggle('active', !!state.isVertical);
    if (horiz) horiz.classList.toggle('active', !state.isVertical);
  }

  export function toggleVertical() {
    if (isMobileScreen()) {
      state.isVertical = false;
      updateLayoutToggleBtn();
      return;
    }
    state.isVertical = !state.isVertical;
    localStorage.setItem('layout_vertical', state.isVertical);
    updateLayoutToggleBtn();
    if (!els.poemModal.classList.contains('active') || !els.poemText) return;
    if (state.isVertical) {
      els.poemText.classList.add('vertical');
      if (els.poemContentArea) {
        els.poemContentArea.classList.add('vertical-mode');
        scrollVerticalToStart();
      }
    } else {
      els.poemText.classList.remove('vertical');
      if (els.poemContentArea) {
        els.poemContentArea.classList.remove('vertical-mode');
        els.poemContentArea.scrollLeft = 0;
      }
    }
  }
