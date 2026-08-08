// script.js —— 入口：初始化流程与事件绑定（编排各功能模块）
import { state, els } from './state.js';
import { initConverter, updateStaticTexts, updateLangToggleBtn } from './language.js';
import { isMobileScreen, updateLayoutToggleBtn, toggleVertical } from './layout.js';
import { skipCinematicAnimation } from './animation.js';
import { openDB, saveImage, compressImage } from './database.js';
import { renderPoemImages, closeLightbox, updateLightboxImage } from './gallery.js';
import { renderVolumeSelect, renderGenreTabs, applyFilters } from './search.js';
import { closeReader, openPoemDetail } from './reader.js';
import { alignVerticalTitleAndContent } from './layout.js';


  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function syncViewModeToggle() {
    if (!els.viewModeToggle) return;
    els.viewModeToggle.querySelectorAll('.btn-view-mode').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === state.viewMode);
    });
  }

  function showToast(message, duration = 2500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  function initEventListeners() {
    // 自定义卷次下拉框事件逻辑
    const customSelect = document.getElementById('custom-volume-select');
    const customTrigger = document.getElementById('custom-select-trigger');
    const customMenu = document.getElementById('custom-select-menu');

    if (customTrigger && customSelect && customMenu) {
      customTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = customSelect.classList.toggle('open');
        customTrigger.setAttribute('aria-expanded', String(isOpen));
      });

      customMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.custom-select-item');
        if (!item) return;
        const value = item.dataset.value;
        state.filters.volume = value;
        if (els.volumeSelect) els.volumeSelect.value = value;

        customSelect.classList.remove('open');
        customTrigger.setAttribute('aria-expanded', 'false');

        renderVolumeSelect();
        applyFilters();

        const firstCard = els.poemsContainer.querySelector('.poem-card, .volume-preface-card, .timeline-node');
        if (firstCard) {
          firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      document.addEventListener('click', () => {
        customSelect.classList.remove('open');
        customTrigger.setAttribute('aria-expanded', 'false');
      });
    }

    // 切换模式（卷次目录 / 创作年谱）监听修复
    if (els.viewModeToggle) {
      els.viewModeToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-view-mode');
        if (!btn) return;

        els.viewModeToggle.querySelectorAll('.btn-view-mode').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        state.viewMode = btn.dataset.mode;
        localStorage.setItem('view_mode', state.viewMode);

        applyFilters();

        // 切换视图时平滑滚动到列表起始区域
        const collectionEl = document.getElementById('collection');
        if (collectionEl) {
          collectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    if (els.genreTabs) {
      els.genreTabs.addEventListener('click', (e) => {
        if (!e.target.classList.contains('genre-tab')) return;
        els.genreTabs.querySelectorAll('.genre-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        state.filters.genre = e.target.dataset.genre;
        applyFilters();
      });
    }
    if (els.searchInput) {
      els.searchInput.addEventListener('input', debounce((e) => {
        state.filters.search = e.target.value.trim();
        applyFilters();
      }, 300));
    }
    if (els.btnRandomPoem) {
      els.btnRandomPoem.addEventListener('click', () => {
        if (state.allPoems.length === 0) return;
        const randomIndex = Math.floor(Math.random() * state.allPoems.length);
        openPoemDetail(randomIndex);
      });
    }
    if (els.btnToggleLayout) {
      els.btnToggleLayout.addEventListener('click', toggleVertical);
    }
    if (els.btnToggleLang) {
      els.btnToggleLang.addEventListener('click', () => {
        state.isTraditional = !state.isTraditional;
        localStorage.setItem('lang_traditional', state.isTraditional);
        updateLangToggleBtn();
        updateStaticTexts();
        renderVolumeSelect();
        renderGenreTabs();
        applyFilters();
        if (els.poemModal.classList.contains('active') && state.currentPoemIndex !== -1) {
          openPoemDetail(state.currentPoemIndex);
        }
        showToast(state.isTraditional ? '已切换为繁体中文' : '已切换为简体中文');
      });
    }
    if (els.btnPrevPoem) {
      els.btnPrevPoem.addEventListener('click', () => openPoemDetail(state.currentPoemIndex - 1));
    }
    if (els.btnNextPoem) {
      els.btnNextPoem.addEventListener('click', () => openPoemDetail(state.currentPoemIndex + 1));
    }
    if (els.btnToc) {
      els.btnToc.addEventListener('click', closeReader);
    }
    if (els.poemModal) {
      let mouseDownX = 0;
      let mouseDownY = 0;
      let isDragging = false;
      els.poemModal.addEventListener('mousedown', (e) => {
        mouseDownX = e.clientX;
        mouseDownY = e.clientY;
        isDragging = false;
      });
      els.poemModal.addEventListener('mouseup', (e) => {
        const dx = Math.abs(e.clientX - mouseDownX);
        const dy = Math.abs(e.clientY - mouseDownY);
        if (dx > 5 || dy > 5) {
          isDragging = true;
        }
      });
      els.poemModal.addEventListener('click', (e) => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
          return;
        }
        if (isDragging) {
          isDragging = false;
          return;
        }
        const isInteractive = e.target.closest('#btn-add-image, .gallery-item, #image-upload, .gallery-delete, .author-notes-details, .book-pagination, .poem-genre-badge');
        if (!isInteractive) {
          if (els.poemModal.classList.contains('cinematic-mode') && !els.poemModal.classList.contains('skip-animation')) {
            skipCinematicAnimation();
          } else {
            closeReader();
          }
        }
      });
    }
    if (els.btnAddImage && els.imageUpload) {
      els.btnAddImage.addEventListener('click', () => els.imageUpload.click());
      els.imageUpload.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const currentPoem = state.allPoems[state.currentPoemIndex];
        if (!currentPoem) return;
        for (let i = 0; i < files.length; i++) {
          const dataUrl = await compressImage(files[i]);
          await saveImage(currentPoem.id, dataUrl);
        }
        await renderPoemImages(currentPoem.id);
        els.imageUpload.value = '';
      });
    }
    if (els.lightbox) {
      const lbOverlay = els.lightbox.querySelector('.lightbox-overlay');
      const lbClose = els.lightbox.querySelector('.lightbox-close');
      const lbPrev = els.lightbox.querySelector('.lightbox-prev');
      const lbNext = els.lightbox.querySelector('.lightbox-next');
      if (lbOverlay) lbOverlay.addEventListener('click', closeLightbox);
      if (lbClose) lbClose.addEventListener('click', closeLightbox);
      if (lbPrev) {
        lbPrev.addEventListener('click', () => {
          if (state.lightbox.images.length === 0) return;
          state.lightbox.currentIndex = (state.lightbox.currentIndex - 1 + state.lightbox.images.length) % state.lightbox.images.length;
          updateLightboxImage();
        });
      }
      if (lbNext) {
        lbNext.addEventListener('click', () => {
          if (state.lightbox.images.length === 0) return;
          state.lightbox.currentIndex = (state.lightbox.currentIndex + 1) % state.lightbox.images.length;
          updateLightboxImage();
        });
      }
    }
    document.addEventListener('keydown', (e) => {
      if (els.lightbox && els.lightbox.classList.contains('active')) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') {
          if (state.lightbox.images.length === 0) return;
          state.lightbox.currentIndex = (state.lightbox.currentIndex - 1 + state.lightbox.images.length) % state.lightbox.images.length;
          updateLightboxImage();
        }
        if (e.key === 'ArrowRight') {
          if (state.lightbox.images.length === 0) return;
          state.lightbox.currentIndex = (state.lightbox.currentIndex + 1) % state.lightbox.images.length;
          updateLightboxImage();
        }
        return;
      }
      if (!els.poemModal.classList.contains('active')) return;
      if (e.key === 'ArrowLeft') openPoemDetail(state.currentPoemIndex - 1);
      if (e.key === 'ArrowRight') openPoemDetail(state.currentPoemIndex + 1);
      if (e.key === 'Escape') closeReader();
    });
    if (els.poemContentArea) {
      els.poemContentArea.addEventListener('wheel', (e) => {
        if (state.isVertical || els.poemContentArea.classList.contains('vertical-mode')) {
          if (e.deltaY !== 0) {
            e.preventDefault();
            els.poemContentArea.scrollLeft -= e.deltaY;
          }
        }
      }, { passive: false });
    }
    window.addEventListener('scroll', () => {
      if (els.nav) {
        if (window.scrollY > 60) {
          els.nav.classList.add('scrolled');
        } else {
          els.nav.classList.remove('scrolled');
        }
      }
    }, { passive: true });
    const heroTitleEl = document.querySelector('.hero-title');
    if (heroTitleEl && 'IntersectionObserver' in window) {
      const brandObserver = new IntersectionObserver(
        ([entry]) => {
          els.nav.classList.toggle('show-brand', !entry.isIntersecting);
        },
        { threshold: 0 }
      );
      brandObserver.observe(heroTitleEl);
    }
    function syncStickyOffset() {
      const navH = els.nav?.offsetHeight || 0;
      const filterSection = document.getElementById('filter-section');
      const filterH = filterSection?.offsetHeight || 0;
      document.documentElement.style.setProperty('--sticky-offset', `${navH + filterH}px`);
    }
    syncStickyOffset();
    window.addEventListener('resize', debounce(() => {
      syncStickyOffset();
      alignVerticalTitleAndContent();
    }, 150));
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(syncStickyOffset);
      const filterSection = document.getElementById('filter-section');
      if (filterSection) ro.observe(filterSection);
      if (els.nav) ro.observe(els.nav);
    }
    if (els.navToggle && els.navLinks) {
      els.navToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = els.navLinks.classList.toggle('open');
        els.navToggle.classList.toggle('open', open);
        els.navToggle.setAttribute('aria-expanded', String(open));
      });
      els.navLinks.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-link')) {
          els.navLinks.classList.remove('open');
          els.navToggle.classList.remove('open');
          els.navToggle.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('click', (e) => {
        const isOpen = els.navLinks.classList.contains('open');
        if (!isOpen) return;
        if (els.navToggle.contains(e.target) || els.navLinks.contains(e.target)) return;
        els.navLinks.classList.remove('open');
        els.navToggle.classList.remove('open');
        els.navToggle.setAttribute('aria-expanded', 'false');
      });
    }
  }

  async function init() {
    try {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      if (window.location.hash) {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
      window.scrollTo(0, 0);
      initConverter();
      if (isMobileScreen()) {
        state.isVertical = false;
      } else if (localStorage.getItem('layout_vertical') === null) {
        state.isVertical = true;
      }
      const startApp = () => {
        if (document.body.classList.contains('fonts-loaded')) return;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              document.body.classList.add('fonts-loaded');
            }, 120); 
          });
        });
      };
      const fontTimeout = setTimeout(startApp, 1800);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          clearTimeout(fontTimeout);
          startApp();
        });
      } else {
        clearTimeout(fontTimeout);
        startApp();
      }
      const res = await fetch('./index.json');
      if (!res.ok) throw new Error('网络请求异常');
      const data = await res.json();
      state.volumes = data.volumes || [];
      state.genres = data.genres || [];
      state.allPoems = data.poems || [];
      await openDB();
      updateLayoutToggleBtn();
      updateLangToggleBtn();
      updateStaticTexts();
      syncViewModeToggle();
      renderVolumeSelect();
      renderGenreTabs();
      applyFilters();
      initEventListeners();
      if (els.nav) {
        els.nav.classList.toggle('scrolled', window.scrollY > 60);
      }
    } catch (e) {
      console.error('初始化失败:', e);
      if (els.poemsContainer) {
        els.poemsContainer.innerHTML = `<p class="error-msg">加载失败：${e.message}</p>`;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
