// script.js
(function() {
  // ===== State =====
  const state = {
    allPoems: [],
    volumes: [],
    genres: [],
    cipaiList: [],
    filters: {
      genre: 'all',
      volume: 'all',
      minRating: 0,
      search: ''
    },
    lightbox: {
      images: [],
      currentIndex: 0
    },
    isVertical: localStorage.getItem('layout_vertical') !== 'false' && window.innerWidth >= 768,
    db: null
  };

  // ===== DOM Elements =====
  const els = {
    nav: document.getElementById('main-nav'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    navLinks: document.getElementById('nav-links'),
    heroCta: document.querySelector('.hero-cta'),
    
    poemsContainer: document.getElementById('poems-container'),
    loading: document.getElementById('loading'),
    
    filterGenre: document.getElementById('filter-genre'),
    filterRating: document.getElementById('filter-rating'),
    searchInput: document.getElementById('search-input'),
    btnToggleLayout: document.getElementById('btn-toggle-layout'),
    volumeTabs: document.getElementById('volume-tabs'),
    filterStats: document.getElementById('filter-stats'),
    
    poemModal: document.getElementById('poem-modal'),
    poemModalTitle: document.querySelector('#poem-modal .poem-detail-title'),
    poemModalGenre: document.querySelector('#poem-modal .poem-genre-badge'),
    poemModalVolume: document.querySelector('#poem-modal .poem-volume-badge'),
    poemModalRating: document.getElementById('poem-rating'),
    poemModalText: document.querySelector('#poem-modal .poem-text'),
    poemImagesGallery: document.getElementById('poem-images-gallery'),
    btnAddImage: document.getElementById('btn-add-image'),
    imageUpload: document.getElementById('image-upload'),
    
    createModal: document.getElementById('create-modal'),
    btnCreate: document.getElementById('btn-create'),
    createForm: document.getElementById('create-form'),
    createGenre: document.getElementById('create-genre'),
    createGenreCustom: document.getElementById('create-genre-custom'),
    createImages: document.getElementById('create-images'),
    createImagesPreview: document.getElementById('create-images-preview'),
    btnCancelCreate: document.getElementById('btn-cancel-create'),
    
    lightbox: document.getElementById('lightbox'),
    lightboxImage: document.getElementById('lightbox-image'),
    lightboxPrev: document.querySelector('.lightbox-prev'),
    lightboxNext: document.querySelector('.lightbox-next'),
    
    toastContainer: document.getElementById('toast-container')
  };

  // ===== Utilities =====
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function showToast(message, duration = 3000) {
    if (!els.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    els.toastContainer.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }, duration);
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ===== IndexedDB (Image & User Poems Management) =====
  function openDB() {
    return new Promise((resolve, reject) => {
      if (state.db) return resolve(state.db);
      const request = indexedDB.open('YunFuJiDB', 1);
      request.onerror = (e) => reject(e.target.error);
      request.onsuccess = (e) => {
        state.db = e.target.result;
        resolve(state.db);
      };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('images')) {
          const imagesStore = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
          imagesStore.createIndex('poemId', 'poemId', { unique: false });
        }
        if (!db.objectStoreNames.contains('userPoems')) {
          db.createObjectStore('userPoems', { keyPath: 'id' });
        }
      };
    });
  }

  async function saveImage(poemId, dataUrl) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      const request = store.add({ poemId, dataUrl, createdAt: Date.now() });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getImages(poemId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readonly');
      const store = tx.objectStore('images');
      const index = store.index('poemId');
      const request = index.getAll(poemId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteImage(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function hasImages(poemId) {
    const images = await getImages(poemId);
    return images.length > 0;
  }

  function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(file.type, quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function saveUserPoem(poem) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('userPoems', 'readwrite');
      const store = tx.objectStore('userPoems');
      const request = store.put(poem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function getUserPoems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('userPoems', 'readonly');
      const store = tx.objectStore('userPoems');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== Star Rating System =====
  function getRating(poemId) {
    return parseInt(localStorage.getItem(`rating_${poemId}`)) || 0;
  }

  function setRating(poemId, value) {
    localStorage.setItem(`rating_${poemId}`, value);
  }

  function renderStarRating(poemId, container, interactive = false) {
    container.innerHTML = '';
    const currentRating = getRating(poemId);
    
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.className = 'star';
      star.textContent = '★';
      star.dataset.value = i;
      
      if (i <= currentRating) {
        star.classList.add('filled');
      }
      
      if (interactive) {
        star.style.cursor = 'pointer';
        
        star.addEventListener('mouseover', () => {
          const stars = container.querySelectorAll('.star');
          stars.forEach((s, idx) => {
            if (idx < i) s.classList.add('hover');
            else s.classList.remove('hover');
          });
        });
        
        star.addEventListener('mouseout', () => {
          const stars = container.querySelectorAll('.star');
          stars.forEach(s => s.classList.remove('hover'));
        });
        
        star.addEventListener('click', () => {
          setRating(poemId, i);
          renderStarRating(poemId, container, true);
          showToast('评分已保存');
          // Re-render cards if rating filter is active
          if (state.filters.minRating > 0) {
            applyFilters();
          } else {
            // Update the specific card's mini rating silently
            const cardRatingDisplay = document.querySelector(`.poem-card[data-id="${poemId}"] .card-rating-display`);
            if (cardRatingDisplay) {
              cardRatingDisplay.innerHTML = renderMiniRating(poemId);
            }
          }
        });
      }
      
      container.appendChild(star);
    }
  }

  function renderMiniRating(poemId) {
    const rating = getRating(poemId);
    if (rating === 0) return '';
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        html += '<span class="star filled">★</span>';
      } else {
        html += '<span class="star">★</span>';
      }
    }
    return html;
  }

  // ===== Data Loading & Init =====
  async function init() {
    try {
      if (window.innerWidth < 768) {
        state.isVertical = false;
      }
      updateLayoutToggleBtn();
      
      let data = {};
      try {
        const res = await fetch('./index.json');
        if (!res.ok) throw new Error('Network response was not ok');
        data = await res.json();
      } catch (e) {
        console.warn('Could not fetch index.json, using empty dataset:', e);
        data = { volumes: [], genres: [], cipaiList: [], poems: [] };
        if (els.loading) els.loading.innerHTML = '<p class="error-msg">提示：无法加载 index.json。如果您在本地打开（file://），请使用本地服务器（如 python -m http.server）以支持数据加载。</p>';
        return; // Early return to avoid breaking
      }

      state.volumes = data.volumes || [];
      state.genres = data.genres || [];
      state.cipaiList = data.cipaiList || [];
      
      // Init IndexedDB and load user poems
      await openDB();
      const userPoems = await getUserPoems();
      
      state.allPoems = [...(data.poems || []), ...userPoems];
      
      populateFilters();
      generateVolumeTabs();
      
      if (els.loading) {
        els.loading.style.display = 'none';
      }
      
      applyFilters();
      initScrollAnimations();
      initNavigation();
      initEventListeners();
      
    } catch (e) {
      console.error('Initialization error:', e);
      if (els.poemsContainer) {
        els.poemsContainer.innerHTML = `<p class="error-msg">加载失败: ${e.message}</p>`;
      }
    }
  }

  function populateFilters() {
    if (!els.filterGenre) return;
    
    // Combine genres and cipai for the dropdown, remove duplicates
    const allGenres = new Set();
    state.allPoems.forEach(p => {
      if (p.genre) allGenres.add(p.genre);
      if (p.cipai) allGenres.add(p.cipai);
    });
    
    // Also add to create form
    if (els.createGenre) {
      els.createGenre.innerHTML = '<option value="" disabled selected>选择体裁/词牌</option>';
      Array.from(allGenres).sort().forEach(g => {
        els.createGenre.add(new Option(g, g));
      });
      els.createGenre.add(new Option('自定义...', 'custom'));
    }

    els.filterGenre.innerHTML = '<option value="all">全部体裁</option>';
    Array.from(allGenres).sort().forEach(g => {
      els.filterGenre.add(new Option(g, g));
    });
    
    if (els.createVolume) {
      els.createVolume.innerHTML = '<option value="" disabled selected>选择收录卷</option>';
      state.volumes.forEach(v => {
        els.createVolume.add(new Option(v.fullName, v.id));
      });
    }
  }

  function generateVolumeTabs() {
    if (!els.volumeTabs) return;
    els.volumeTabs.innerHTML = '';
    
    const allBtn = document.createElement('button');
    allBtn.className = 'volume-tab active';
    allBtn.dataset.volume = 'all';
    allBtn.textContent = '全部';
    els.volumeTabs.appendChild(allBtn);
    
    state.volumes.forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'volume-tab';
      btn.dataset.volume = v.id;
      btn.textContent = v.fullName;
      els.volumeTabs.appendChild(btn);
    });
  }

  // ===== Poem Rendering =====
  async function renderPoems(filteredPoems) {
    if (!els.poemsContainer) return;
    els.poemsContainer.innerHTML = '';
    
    if (filteredPoems.length === 0) {
      els.poemsContainer.innerHTML = '<p class="empty-state">没有找到匹配的诗词</p>';
      return;
    }

    // Group by volume
    const grouped = {};
    filteredPoems.forEach(p => {
      const volId = p.volume;
      if (!grouped[volId]) grouped[volId] = [];
      grouped[volId].push(p);
    });

    for (const vol of state.volumes) {
      const poemsInVol = grouped[vol.id];
      if (!poemsInVol || poemsInVol.length === 0) continue;
      
      const volSection = document.createElement('div');
      volSection.className = 'volume-section';
      volSection.dataset.volume = vol.id;
      
      const volHeader = document.createElement('div');
      volHeader.className = 'volume-header';
      volHeader.innerHTML = `<h2>${vol.fullName}</h2>`;
      volSection.appendChild(volHeader);
      
      const grid = document.createElement('div');
      grid.className = 'poems-grid';
      
      // Sequential rendering to handle async hasImages correctly
      for (let i = 0; i < poemsInVol.length; i++) {
        const poem = poemsInVol[i];
        const card = document.createElement('div');
        card.className = 'poem-card reveal';
        card.dataset.id = poem.id;
        card.dataset.genre = poem.genre;
        card.dataset.volume = poem.volume;
        card.style.setProperty('--i', i);
        
        let headerHtml = '';
        if (poem.isUserCreated) {
          headerHtml += `<span class="user-badge">新</span>`;
        }
        
        const hasImg = await hasImages(poem.id);
        if (hasImg) {
          headerHtml += `<span class="card-images-indicator">🖼️</span>`;
        }
        
        // Truncate content for preview (first 2 lines)
        const previewText = poem.content.split('\n').slice(0, 2).join('\n') + '...';
        
        card.innerHTML = `
          <div class="card-badges">
            <span class="card-badge">${poem.cipai || poem.genre}</span>
            ${headerHtml}
          </div>
          <h3 class="card-title">${poem.title}</h3>
          <p class="card-preview">${previewText.replace(/\n/g, '<br>')}</p>
          <div class="card-rating-display">${renderMiniRating(poem.id)}</div>
        `;
        
        card.addEventListener('click', () => openPoemDetail(poem));
        grid.appendChild(card);
      }
      
      volSection.appendChild(grid);
      els.poemsContainer.appendChild(volSection);
    }
    
    initScrollAnimations();
    
    if (els.filterStats) {
      els.filterStats.textContent = `显示 ${filteredPoems.length} / ${state.allPoems.length} 首`;
    }
  }

  // ===== Filtering =====
  function applyFilters() {
    let filtered = state.allPoems.filter(p => {
      // Genre match
      if (state.filters.genre !== 'all') {
        if (p.genre !== state.filters.genre && p.cipai !== state.filters.genre) return false;
      }
      
      // Volume match
      if (state.filters.volume !== 'all') {
        if (p.volume.toString() !== state.filters.volume.toString()) return false;
      }
      
      // Rating match
      if (state.filters.minRating > 0) {
        if (getRating(p.id) < state.filters.minRating) return false;
      }
      
      // Search match
      if (state.filters.search) {
        const q = state.filters.search.toLowerCase();
        const t = (p.title || '').toLowerCase();
        const c = (p.content || '').toLowerCase();
        const cp = (p.cipai || '').toLowerCase();
        if (!t.includes(q) && !c.includes(q) && !cp.includes(q)) return false;
      }
      
      return true;
    });
    
    renderPoems(filtered);
  }

  // ===== Poem Detail Modal =====
  async function openPoemDetail(poem) {
    if (!els.poemModal) return;
    
    els.poemModal.dataset.currentPoemId = poem.id;
    
    if (els.poemModalTitle) els.poemModalTitle.textContent = poem.title;
    if (els.poemModalGenre) els.poemModalGenre.textContent = poem.cipai || poem.genre;
    
    if (els.poemModalVolume) {
      const vol = state.volumes.find(v => v.id.toString() === poem.volume.toString());
      els.poemModalVolume.textContent = vol ? vol.fullName : '';
    }
    
    if (els.poemModalRating) {
      renderStarRating(poem.id, els.poemModalRating, true);
    }
    
    if (els.poemModalText) {
      els.poemModalText.innerHTML = poem.content.replace(/\n/g, '<br>');
      if (state.isVertical) {
        els.poemModalText.classList.add('vertical');
      } else {
        els.poemModalText.classList.remove('vertical');
      }
    }
    
    await renderPoemImages(poem.id);
    
    openModal(els.poemModal);
    
    if (state.isVertical && els.poemModalText) {
      setTimeout(() => {
        // scrollLeft is sometimes negative for RTL or vertical-rl in some browsers.
        // We set both to cover all browser engines.
        const maxScroll = els.poemModalText.scrollWidth;
        els.poemModalText.scrollLeft = -maxScroll; // For browsers where right is negative
        if (els.poemModalText.scrollLeft === 0) {
            els.poemModalText.scrollLeft = maxScroll; // For browsers where right is positive
        }
      }, 50);
    }
  }

  async function renderPoemImages(poemId) {
    if (!els.poemImagesGallery) return;
    els.poemImagesGallery.innerHTML = '';
    
    const images = await getImages(poemId);
    if (images.length === 0) return;
    
    images.forEach((img, idx) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      
      const imgEl = document.createElement('img');
      imgEl.src = img.dataUrl;
      imgEl.addEventListener('click', () => openLightbox(images.map(i => i.dataUrl), idx));
      
      const delBtn = document.createElement('button');
      delBtn.className = 'gallery-delete';
      delBtn.innerHTML = '×';
      delBtn.title = '删除图片';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('确定要删除这张图片吗？')) {
          await deleteImage(img.id);
          showToast('图片已删除');
          renderPoemImages(poemId);
          // Re-render cards to update indicator
          applyFilters(); 
        }
      });
      
      item.appendChild(imgEl);
      item.appendChild(delBtn);
      els.poemImagesGallery.appendChild(item);
    });
  }

  // ===== Lightbox =====
  function openLightbox(images, index) {
    if (!els.lightbox) return;
    state.lightbox.images = images;
    state.lightbox.currentIndex = index;
    updateLightboxImage();
    els.lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!els.lightbox) return;
    els.lightbox.classList.remove('active');
    if (!els.poemModal.classList.contains('active')) {
      document.body.style.overflow = '';
    }
  }

  function updateLightboxImage() {
    if (!els.lightboxImage || state.lightbox.images.length === 0) return;
    els.lightboxImage.src = state.lightbox.images[state.lightbox.currentIndex];
  }

  function lightboxPrev() {
    if (state.lightbox.images.length === 0) return;
    state.lightbox.currentIndex = (state.lightbox.currentIndex - 1 + state.lightbox.images.length) % state.lightbox.images.length;
    updateLightboxImage();
  }

  function lightboxNext() {
    if (state.lightbox.images.length === 0) return;
    state.lightbox.currentIndex = (state.lightbox.currentIndex + 1) % state.lightbox.images.length;
    updateLightboxImage();
  }

  // ===== Create Poem =====
  function detectGenreCategory(cipai) {
    const ciList = ['一剪梅', '临江仙', '蝶恋花', '水调歌头', '沁园春', '念奴娇', '菩萨蛮', '青玉案']; // Common ci patterns
    if (ciList.includes(cipai) || state.cipaiList.includes(cipai)) return '词';
    if (cipai.includes('古')) return '古诗';
    if (cipai.includes('律')) return '律诗';
    if (cipai.includes('绝')) return '绝句';
    if (cipai.includes('乐府')) return '乐府';
    return '诗';
  }

  // ===== Layout Toggle =====
  function updateLayoutToggleBtn() {
    if (!els.btnToggleLayout) return;
    const icon = els.btnToggleLayout.querySelector('.layout-icon');
    if (icon) {
      icon.textContent = state.isVertical ? '竖' : '横';
    }
  }

  // ===== Scroll Animations =====
  function initScrollAnimations() {
    const reveals = document.querySelectorAll('.reveal:not(.active)');
    if (reveals.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    reveals.forEach(el => observer.observe(el));
  }

  // ===== Navigation =====
  function initNavigation() {
    window.addEventListener('scroll', debounce(() => {
      if (els.nav) {
        if (window.scrollY > 80) {
          els.nav.classList.add('scrolled');
        } else {
          els.nav.classList.remove('scrolled');
        }
      }
    }, 50));
    
    // Smooth scroll for nav links
    document.querySelectorAll('.nav-link, .hero-cta').forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            if (els.navLinks && els.navLinks.classList.contains('open')) {
              els.navLinks.classList.remove('open');
            }
          }
        }
      });
    });
  }

  // ===== Event Listeners =====
  function initEventListeners() {
    // Mobile menu
    if (els.mobileMenuBtn && els.navLinks) {
      els.mobileMenuBtn.addEventListener('click', () => {
        els.navLinks.classList.toggle('open');
      });
    }

    // Filters
    if (els.filterGenre) {
      els.filterGenre.addEventListener('change', (e) => {
        state.filters.genre = e.target.value;
        applyFilters();
      });
    }
    
    if (els.filterRating) {
      els.filterRating.addEventListener('change', (e) => {
        state.filters.minRating = parseInt(e.target.value) || 0;
        applyFilters();
      });
    }
    
    if (els.searchInput) {
      els.searchInput.addEventListener('input', debounce((e) => {
        state.filters.search = e.target.value;
        applyFilters();
      }, 300));
    }
    
    if (els.volumeTabs) {
      els.volumeTabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('volume-tab')) {
          els.volumeTabs.querySelectorAll('.volume-tab').forEach(t => t.classList.remove('active'));
          e.target.classList.add('active');
          state.filters.volume = e.target.dataset.volume;
          applyFilters();
        }
      });
    }

    // Layout Toggle
    if (els.btnToggleLayout) {
      els.btnToggleLayout.addEventListener('click', () => {
        state.isVertical = !state.isVertical;
        localStorage.setItem('layout_vertical', state.isVertical);
        updateLayoutToggleBtn();
        if (els.poemModal && els.poemModalText) {
          if (state.isVertical) els.poemModalText.classList.add('vertical');
          else els.poemModalText.classList.remove('vertical');
        }
      });
    }

    // Modals Close
    document.querySelectorAll('.modal-overlay, .modal-close').forEach(el => {
      el.addEventListener('click', (e) => {
        const modal = e.target.closest('.active');
        if (modal) closeModal(modal);
      });
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (els.lightbox && els.lightbox.classList.contains('active')) {
          closeLightbox();
        } else {
          const activeModal = document.querySelector('.active');
          if (activeModal) closeModal(activeModal);
        }
      }
      
      if (els.lightbox && els.lightbox.classList.contains('active')) {
        if (e.key === 'ArrowLeft') lightboxPrev();
        if (e.key === 'ArrowRight') lightboxNext();
      }
    });

    // Poem Image Upload
    if (els.btnAddImage && els.imageUpload) {
      els.btnAddImage.addEventListener('click', () => els.imageUpload.click());
      
      els.imageUpload.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        const poemId = els.poemModal.dataset.currentPoemId;
        if (!poemId) return;

        showToast('处理图片中...', 1000);
        
        try {
          for (let i = 0; i < files.length; i++) {
            const dataUrl = await compressImage(files[i]);
            await saveImage(poemId, dataUrl);
          }
          showToast('图片上传成功');
          await renderPoemImages(poemId);
          applyFilters(); // Re-render to update indicators
        } catch (err) {
          console.error(err);
          showToast('图片上传失败');
        }
        
        els.imageUpload.value = '';
      });
    }

    // Lightbox Controls
    if (els.lightboxPrev) els.lightboxPrev.addEventListener('click', lightboxPrev);
    if (els.lightboxNext) els.lightboxNext.addEventListener('click', lightboxNext);
    if (els.lightbox) {
      const lbOverlay = els.lightbox.querySelector('.lightbox-overlay');
      const lbClose = els.lightbox.querySelector('.lightbox-close');
      if (lbOverlay) lbOverlay.addEventListener('click', closeLightbox);
      if (lbClose) lbClose.addEventListener('click', closeLightbox);
    }

    // Create Poem Form
    if (els.btnCreate && els.createModal) {
      els.btnCreate.addEventListener('click', () => {
        openModal(els.createModal);
      });
    }
    
    if (els.btnCancelCreate && els.createModal) {
      els.btnCancelCreate.addEventListener('click', () => {
        closeModal(els.createModal);
        els.createForm.reset();
        if (els.createGenreCustom) els.createGenreCustom.classList.add('hidden');
        if (els.createImagesPreview) els.createImagesPreview.innerHTML = '';
      });
    }
    
    if (els.createGenre && els.createGenreCustom) {
      els.createGenre.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          els.createGenreCustom.classList.remove('hidden');
          els.createGenreCustom.required = true;
        } else {
          els.createGenreCustom.classList.add('hidden');
          els.createGenreCustom.required = false;
        }
      });
    }
    
    if (els.createImages && els.createImagesPreview) {
      els.createImages.addEventListener('change', (e) => {
        els.createImagesPreview.innerHTML = '';
        const files = Array.from(e.target.files);
        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = '60px';
            img.style.height = '60px';
            img.style.objectFit = 'cover';
            img.style.marginRight = '8px';
            img.style.borderRadius = '4px';
            els.createImagesPreview.appendChild(img);
          };
          reader.readAsDataURL(file);
        });
      });
    }
    
    if (els.createForm) {
      els.createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('create-title').value.trim();
        let genre = els.createGenre.value;
        if (genre === 'custom') {
          genre = els.createGenreCustom.value.trim();
        }
        const volume = document.getElementById('create-volume').value;
        const content = document.getElementById('create-content').value.trim();
        
        if (!title || !content || !genre || !volume) {
          showToast('请填写完整信息');
          return;
        }
        
        const newPoemId = 'user-' + Date.now();
        const poem = {
          id: newPoemId,
          title,
          cipai: genre,
          genre: detectGenreCategory(genre),
          volume: parseInt(volume),
          content,
          isUserCreated: true,
          createdAt: new Date().toISOString()
        };
        
        try {
          await saveUserPoem(poem);
          
          if (els.createImages.files && els.createImages.files.length > 0) {
            for (let i = 0; i < els.createImages.files.length; i++) {
              const dataUrl = await compressImage(els.createImages.files[i]);
              await saveImage(newPoemId, dataUrl);
            }
          }
          
          state.allPoems.push(poem);
          
          closeModal(els.createModal);
          els.createForm.reset();
          els.createGenreCustom.classList.add('hidden');
          els.createImagesPreview.innerHTML = '';
          
          // Re-populate genres filter in case a new custom genre was added
          populateFilters();
          applyFilters();
          
          showToast('作品已保存');
        } catch (err) {
          console.error(err);
          showToast('保存失败');
        }
      });
    }
  }

  // ===== Startup =====
  document.addEventListener('DOMContentLoaded', init);
})();
