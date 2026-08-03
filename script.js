(function() {
  const state = {
    allPoems: [],
    volumes: [],
    currentPoemIndex: -1,
    filters: { volume: 'all', search: '' },
    isVertical: (localStorage.getItem('layout_vertical') === 'true') ||
                (localStorage.getItem('layout_vertical') === null && window.innerWidth >= 768),
    isCinematic: true, 
    isTraditional: localStorage.getItem('lang_traditional') === 'true', 
    cinematicTimers: [],
    db: null,
    lightbox: { images: [], currentIndex: 0 }
  };

  const els = {
    nav: document.getElementById('main-nav'),
    navToggle: document.getElementById('nav-toggle'),
    navLinks: document.querySelector('.nav-links'),
    poemsContainer: document.getElementById('poems-container'),
    volumeTabs: document.getElementById('volume-tabs'),
    searchInput: document.getElementById('search-input'),
    btnRandomPoem: document.getElementById('btn-random-poem'),
    randomText: document.getElementById('random-text'),
    btnToggleLayout: document.getElementById('btn-toggle-layout'),
    btnToggleLang: document.getElementById('btn-toggle-lang'),
    poemModal: document.getElementById('poem-modal'),
    poemCinematicBg: document.getElementById('poem-cinematic-bg'),
    btnPrevPoem: document.getElementById('btn-prev-poem'),
    btnNextPoem: document.getElementById('btn-next-poem'),
    btnToc: document.getElementById('btn-toc'),
    poemDetailTitle: document.querySelector('#poem-modal .poem-detail-title'),
    poemGenreBadge: document.querySelector('#poem-modal .poem-genre-badge'),
    poemVolumeBadge: document.querySelector('#poem-modal .poem-volume-badge'),
    poemEpigraph: document.getElementById('poem-epigraph'),
    poemDateLocation: document.getElementById('poem-date-location'),
    poemText: document.querySelector('#poem-modal .poem-text'),
    poemContentArea: document.querySelector('#poem-modal .poem-content-area'),
    poemTranslationBlock: document.getElementById('poem-translation-block'),
    poemTranslationText: document.getElementById('poem-translation-text'),
    authorNotesDetails: document.getElementById('author-notes-details'),
    authorNotesContent: document.getElementById('author-notes-content'),
    poemImagesGallery: document.getElementById('poem-images-gallery'),
    btnAddImage: document.getElementById('btn-add-image'),
    imageUpload: document.getElementById('image-upload'),
    lightbox: document.getElementById('lightbox'),
    lightboxImage: document.getElementById('lightbox-image')
  };

  let s2tConverter = null;

  function initConverter() {
    if (window.OpenCC && typeof window.OpenCC.Converter === 'function') {
      try {
        s2tConverter = window.OpenCC.Converter({ from: 'cn', to: 'hk' });
      } catch (e) {
        console.warn('OpenCC 加载异常:', e);
      }
    }
  }

  function conv(str) {
    if (!str) return str;
    if (!state.isTraditional) return str;
    if (s2tConverter) return s2tConverter(str);
    return fallbackS2T(str);
  }

  function fallbackS2T(str) {
    const s = "云迟归节问怀隐尽浅别话梦楼离观潮寒阳风独语诉乱伤临绝卷凤忆惊柳絮罗阴玉箏风敲孤漫残冷秋舟枕衾凄余温踏冰流客从遗尺素裾归望高蔽临浦朝斜日叫换笑觉后残寒";
    const t = "雲遲歸節問懷隱盡淺別話夢樓離觀潮寒陽風獨語訴亂傷臨絕卷鳳憶驚柳絮羅陰玉箏風敲孤漫殘冷秋舟枕衾悽餘溫踏冰流客從遺尺素裾歸望高蔽臨浦朝斜日叫換笑覺後殘寒";
    let res = "";
    for (let char of str) {
      let idx = s.indexOf(char);
      res += (idx !== -1) ? t[idx] : char;
    }
    return res;
  }

  function updateStaticTexts() {
    const heroTitle = document.querySelector('.hero-title');
    const heroQuote = document.querySelector('.hero-quote');
    const heroSubQuote = document.querySelector('.hero-sub-quote');
    const heroCta = document.querySelector('.hero-cta');
    const footerTitle = document.querySelector('.footer-title');
    const footerSub = document.querySelector('.footer-sub');
    const navLinks = document.querySelectorAll('.nav-link');

    if (heroTitle) heroTitle.textContent = ('云 浮 集');
    if (heroQuote) heroQuote.textContent = conv('莫问春迟，且看云浮');
    if (heroSubQuote) heroSubQuote.textContent = conv('浮云也有归时节');
    if (heroCta) heroCta.textContent = conv('翻阅诗集');
    if (els.randomText) els.randomText.textContent = conv('随缘');
    if (footerTitle) footerTitle.innerHTML = '<span class="brand-cn">云浮集</span> · As Clouds Float By';
    if (footerSub) footerSub.textContent = conv('莫问春迟，且看云浮');

    if (navLinks.length >= 3) {
      navLinks[0].textContent = conv('卷首');
      navLinks[1].textContent = conv('目录');
      navLinks[2].textContent = conv('关于');
    }
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function isMobileScreen() {
    return window.innerWidth <= 768;
  }

  function scrollVerticalToStart() {
    if (!els.poemContentArea) return;
    requestAnimationFrame(() => {
      if (state.isVertical && !isMobileScreen()) {
        els.poemContentArea.scrollLeft = els.poemContentArea.scrollWidth;
      } else {
        els.poemContentArea.scrollLeft = 0;
      }
    });
  }

  function resetReaderScrollPositions() {
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

  function openReader() {
    els.poemModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeReader() {
    els.poemModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function formatPoemContent(content) {
    if (!content) return '';
    return content.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<br>';
      const clauses = trimmed.match(/[^，。；？！、]+[，。；？！、]?/g) || [trimmed];
      return `<div class="poem-line">${clauses.map(c => `<span class="poem-clause">${c}</span>`).join('')}</div>`;
    }).join('');
  }

  function clearCinematicTimers() {
    state.cinematicTimers.forEach(t => clearTimeout(t));
    state.cinematicTimers = [];
  }

  function formatPoemContentCinematic(content, baseDelay = 0) {
    if (!content) return '';
    let delay = baseDelay;
    // 匹配常见的中文与英文标点符号
    const punctRegex = /([，。；？！、：,.;?!:])/g;

    return content.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<br>';
      
      const clauses = trimmed.match(/[^，。；？！、：,.;?!:]+[，。；？！、：,.;?!:]?/g) || [trimmed];
      
      const clausesHtml = clauses.map(c => {
        // 将句子中的标点符号包裹在 <span class="poem-punct"> 中
        const formattedClause = c.replace(punctRegex, '<span class="poem-punct">$1</span>');
        return `<span class="poem-clause">${formattedClause}</span>`;
      }).join('');

      const html = `<div class="poem-line cinematic-line" style="animation-delay: ${delay.toFixed(2)}s;">${clausesHtml}</div>`;
      delay += 0.75;
      return html;
    }).join('');
  }

  function skipCinematicAnimation() {
    clearCinematicTimers();
    if (els.poemModal) els.poemModal.classList.add('skip-animation');
    if (els.poemCinematicBg) els.poemCinematicBg.className = 'poem-cinematic-bg phase-dim';
  }

  function triggerInkSplash() {
    const d1 = document.getElementById('ink-drop-1');
    const d2 = document.getElementById('ink-drop-2');
    if (d1 && d2) {
      d1.classList.remove('animate');
      d2.classList.remove('animate');
      void d1.offsetWidth; 
      d1.classList.add('animate');
      d2.classList.add('animate');
    }
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
          const store = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
          store.createIndex('poemId', 'poemId', { unique: false });
        }
      };
    });
  }

  async function saveImage(poemId, dataUrl) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').add({ poemId, dataUrl, createdAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getImages(poemId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readonly');
      const index = tx.objectStore('images').index('poemId');
      const request = index.getAll(poemId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteImage(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL(file.type, quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function renderPoemImages(poemId) {
    if (!els.poemImagesGallery) return [];
    els.poemImagesGallery.innerHTML = '';
    const poem = state.allPoems.find(p => p.id === poemId);
    const staticImages = (poem?.staticImages || []).map(path => `./云浮集_YunFuJi/${path}`);
    const dbImages = await getImages(poemId);
    const allUrls = [...staticImages, ...dbImages.map(img => img.dataUrl)];

    if (allUrls.length === 0) return [];

    staticImages.forEach((url, idx) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      const imgEl = document.createElement('img');
      imgEl.src = url;
      imgEl.alt = '配图';
      imgEl.addEventListener('click', () => openLightbox(allUrls, idx));
      item.appendChild(imgEl);
      els.poemImagesGallery.appendChild(item);
    });

    dbImages.forEach((img, idx) => {
      const globalIdx = staticImages.length + idx;
      const item = document.createElement('div');
      item.className = 'gallery-item';
      const imgEl = document.createElement('img');
      imgEl.src = img.dataUrl;
      imgEl.alt = '配图';
      imgEl.addEventListener('click', () => openLightbox(allUrls, globalIdx));
      const delBtn = document.createElement('button');
      delBtn.className = 'gallery-delete';
      delBtn.textContent = '×';
      delBtn.title = '删除图片';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('确定要删除这张本地配图吗？')) {
          await deleteImage(img.id);
          renderPoemImages(poemId);
        }
      });
      item.appendChild(imgEl);
      item.appendChild(delBtn);
      els.poemImagesGallery.appendChild(item);
    });

    const imageElements = Array.from(els.poemImagesGallery.querySelectorAll('img'));
    await Promise.all(imageElements.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));

    return allUrls;
  }

  function openLightbox(images, index) {
    if (!els.lightbox || images.length === 0) return;
    state.lightbox.images = images;
    state.lightbox.currentIndex = index;
    updateLightboxImage();
    els.lightbox.classList.add('active');
  }

  function closeLightbox() {
    if (els.lightbox) els.lightbox.classList.remove('active');
  }

  function updateLightboxImage() {
    if (els.lightboxImage && state.lightbox.images.length > 0) {
      els.lightboxImage.src = state.lightbox.images[state.lightbox.currentIndex];
    }
  }

  function renderVolumeTabs() {
    if (!els.volumeTabs) return;
    els.volumeTabs.innerHTML = `<button class="volume-tab active" data-vol="all">${conv('全部卷次')}</button>`;
    state.volumes.forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'volume-tab';
      btn.dataset.vol = v.id;
      btn.textContent = conv(v.fullName);
      els.volumeTabs.appendChild(btn);
    });
  }

  function renderCollection(poems) {
    if (!els.poemsContainer) return;
    els.poemsContainer.innerHTML = '';

    if (poems.length === 0) {
      els.poemsContainer.innerHTML = `<p class="empty-state">${conv('未找到匹配的诗词')}</p>`;
      return;
    }

    const grouped = {};
    poems.forEach(p => {
      if (!grouped[p.volume]) grouped[p.volume] = [];
      grouped[p.volume].push(p);
    });

    state.volumes.forEach(vol => {
      const poemsInVol = grouped[vol.id];
      if (!poemsInVol || poemsInVol.length === 0) return;

      const volSection = document.createElement('section');
      volSection.className = 'volume-section';

      if (vol.preface) {
        const prefDiv = document.createElement('div');
        prefDiv.className = 'volume-preface-card';
        prefDiv.innerHTML = `
          <h3 class="volume-preface-title">${conv(vol.fullName)} · ${conv('卷序')}</h3>
          <p class="volume-preface-text">${conv(vol.preface).replace(/\n/g, '<br>')}</p>
        `;
        volSection.appendChild(prefDiv);
      }

      const grid = document.createElement('div');
      grid.className = 'poems-grid';

      poemsInVol.forEach(poem => {
        const card = document.createElement('div');
        card.className = 'poem-card';
        card.innerHTML = `
          <span class="card-badge">${conv(poem.cipai || poem.genre)}</span>
          <h3 class="card-title">${conv(poem.title)}</h3>
          <p class="card-preview">${conv(poem.content.split('\n').slice(0, 2).join('\n')).replace(/\n/g, '<br>')}</p>
        `;
        card.addEventListener('click', () => {
          const globalIdx = state.allPoems.findIndex(p => p.id === poem.id);
          openPoemDetail(globalIdx);
        });
        grid.appendChild(card);
      });

      volSection.appendChild(grid);
      els.poemsContainer.appendChild(volSection);
    });
  }

  function applyFilters() {
    let filtered = state.allPoems;
    if (state.filters.volume !== 'all') {
      filtered = filtered.filter(p => String(p.volume) === String(state.filters.volume));
    }
    if (state.filters.search) {
      const q = state.filters.search.toLowerCase();
      filtered = filtered.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.content || '').toLowerCase().includes(q) ||
        (p.cipai || '').toLowerCase().includes(q)
      );
    }
    renderCollection(filtered);
  }

  async function openPoemDetail(index) {
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

  function updateLayoutToggleBtn() {
    if (!els.btnToggleLayout) return;
    const vert = els.btnToggleLayout.querySelector('.opt-layout-vertical');
    const horiz = els.btnToggleLayout.querySelector('.opt-layout-horizontal');
    if (vert) vert.classList.toggle('active', !!state.isVertical);
    if (horiz) horiz.classList.toggle('active', !state.isVertical);
  }

  function updateLangToggleBtn() {
    if (!els.btnToggleLang) return;
    const simp = els.btnToggleLang.querySelector('.opt-lang-simplified');
    const trad = els.btnToggleLang.querySelector('.opt-lang-traditional');
    if (simp) simp.classList.toggle('active', !state.isTraditional);
    if (trad) trad.classList.toggle('active', !!state.isTraditional);
  }

  function toggleVertical() {
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

  function initEventListeners() {
    if (els.volumeTabs) {
      els.volumeTabs.addEventListener('click', (e) => {
        if (!e.target.classList.contains('volume-tab')) return;
        els.volumeTabs.querySelectorAll('.volume-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        state.filters.volume = e.target.dataset.vol;
        applyFilters();

        const firstCard = els.poemsContainer.querySelector('.poem-card');
        if (firstCard) {
          firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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
        renderVolumeTabs();
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
        // 1. 如果用户划选/选中了文本，不处理退出
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
          return;
        }

        // 2. 如果存在划拽/拖选动作，不处理退出
        if (isDragging) {
          isDragging = false;
          return;
        }

        // 3. 判断是否点击了按钮、图库、顶部控制栏等交互元素
        const isInteractive = e.target.closest('#btn-add-image, .gallery-item, #image-upload, .gallery-delete, .author-notes-details, .book-pagination');
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
      // === 1. 强制刷新后重置回卷首主页（禁用浏览器记忆位置） ===
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      // 如果 URL 带有锚点（如 #collection），清除它防止页面跳动
      if (window.location.hash) {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
      // 强制滚动到顶部卷首
      window.scrollTo(0, 0);

      initConverter();
      if (isMobileScreen()) {
        state.isVertical = false;
      } else if (localStorage.getItem('layout_vertical') === null) {
        state.isVertical = true;
      }

      // === 2. 解决 GitHub Pages 移动端缓存导致跳过动画的问题 ===
      const startApp = () => {
        if (document.body.classList.contains('fonts-loaded')) return;

        // 强制浏览器先绘制初始隐藏帧（Frame 1），再在下一帧触发动画（Frame 2）
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              document.body.classList.add('fonts-loaded');
            }, 120); // 给予 120ms 延时，确保移动端 GPU 渲染准备就绪
          });
        });
      };

      // 兜底机制：最长等待 1.8 秒
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

      // === 3. 加载诗词数据 ===
      const res = await fetch('./index.json');
      if (!res.ok) throw new Error('网络请求异常');
      const data = await res.json();
      state.volumes = data.volumes || [];
      state.allPoems = data.poems || [];
      await openDB();
      updateLayoutToggleBtn();
      updateLangToggleBtn();
      updateStaticTexts();
      renderVolumeTabs();
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
})();