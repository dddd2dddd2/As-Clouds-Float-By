// script.js — 典藏书卷阅读引擎
(function() {
  // ===== State =====
  const state = {
    allPoems: [],
    volumes: [],
    currentPoemIndex: -1,
    filters: { volume: 'all', search: '' },
    isVertical: (localStorage.getItem('layout_vertical') === 'true') ||
                (localStorage.getItem('layout_vertical') === null && window.innerWidth >= 768),
    isCinematic: localStorage.getItem('mode_cinematic') !== 'false',
    cinematicTimers: [],
    db: null,
    lightbox: { images: [], currentIndex: 0 }
  };

  // ===== DOM Elements =====
  const els = {
    nav: document.getElementById('main-nav'),
    poemsContainer: document.getElementById('poems-container'),
    volumeTabs: document.getElementById('volume-tabs'),
    searchInput: document.getElementById('search-input'),
    btnToggleLayout: document.getElementById('btn-toggle-layout'),
    layoutIcon: document.querySelector('#btn-toggle-layout .layout-icon'),
    btnToggleCinematic: document.getElementById('btn-toggle-cinematic'),
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

  // ===== Utilities =====
  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // 判断是否为移动端屏幕
  function isMobileScreen() {
    return window.innerWidth <= 768;
  }

  // 竖排模式下：将滚动位置对齐到最右侧（诗词第一句的起始位置）。
  // 内容区为 direction: rtl，其水平滚动对应 inline 轴，inline-start 即最右（第一句）。
  function scrollVerticalToStart() {
    if (!els.poemContentArea || !els.poemText) return;
    requestAnimationFrame(() => {
      const firstLine = els.poemText.querySelector('.poem-line');
      if (firstLine) {
        firstLine.scrollIntoView({ inline: 'start' });
      }
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

  // 将诗词按标点切分为独立小句（分句），确保换行时不遗留单字
  function formatPoemContent(content) {
    if (!content) return '';
    return content.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<br>';
      const clauses = trimmed.match(/[^，。；？！、]+[，。；？！、]?/g) || [trimmed];
      return `<div class="poem-line">${clauses.map(c => `<span class="poem-clause">${c}</span>`).join('')}</div>`;
    }).join('');
  }

  // ===== 高级沉浸演播模式 (Cinematic Mode) =====
  function clearCinematicTimers() {
    state.cinematicTimers.forEach(t => clearTimeout(t));
    state.cinematicTimers = [];
  }

  // 演播正文排版：逐句添加动画延迟（每行依次浮现 0.75s）
  function formatPoemContentCinematic(content, baseDelay = 0) {
    if (!content) return '';
    let delay = baseDelay;
    return content.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<br>';
      const clauses = trimmed.match(/[^，。；？！、]+[，。；？！、]?/g) || [trimmed];
      const clausesHtml = clauses.map(c => `<span class="poem-clause">${c}</span>`).join('');
      const html = `<div class="poem-line cinematic-line" style="animation-delay: ${delay.toFixed(2)}s;">${clausesHtml}</div>`;
      delay += 0.75;
      return html;
    }).join('');
  }

  // 点击跳过动画：立即呈现全部内容
  function skipCinematicAnimation() {
    clearCinematicTimers();
    if (els.poemModal) els.poemModal.classList.add('skip-animation');
    if (els.poemCinematicBg) els.poemCinematicBg.className = 'poem-cinematic-bg phase-dim';
  }

  function updateCinematicToggleBtn() {
    if (els.btnToggleCinematic) els.btnToggleCinematic.classList.toggle('active', state.isCinematic);
  }

  // 轻提示（演播模式切换反馈）
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

  // ===== IndexedDB（本地图片持久化存储） =====
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

  // 图片自动压缩后转 dataURL
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

  // ===== 渲染诗词配图画廊 =====
  async function renderPoemImages(poemId) {
    if (!els.poemImagesGallery) return;
    els.poemImagesGallery.innerHTML = '';

    const poem = state.allPoems.find(p => p.id === poemId);
    const staticImages = (poem?.staticImages || []).map(path => `./云浮集_YunFuJi/${path}`);
    const dbImages = await getImages(poemId);
    const allUrls = [...staticImages, ...dbImages.map(img => img.dataUrl)];

    if (allUrls.length === 0) return [];

    // 渲染静态图片
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

    // 渲染本地上传图片（可删除）
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

    return allUrls;
  }

  // ===== 大图预览灯箱 (Lightbox) =====
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

  // ===== 目录渲染 =====
  function renderVolumeTabs() {
    if (!els.volumeTabs) return;
    els.volumeTabs.innerHTML = '<button class="volume-tab active" data-vol="all">全部卷次</button>';
    state.volumes.forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'volume-tab';
      btn.dataset.vol = v.id;
      btn.textContent = v.fullName;
      els.volumeTabs.appendChild(btn);
    });
  }

  function renderCollection(poems) {
    if (!els.poemsContainer) return;
    els.poemsContainer.innerHTML = '';

    if (poems.length === 0) {
      els.poemsContainer.innerHTML = '<p class="empty-state">未找到匹配的诗词</p>';
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

      // 卷序：像实体书一样，先呈现卷首语
      if (vol.preface) {
        const prefDiv = document.createElement('div');
        prefDiv.className = 'volume-preface-card';
        prefDiv.innerHTML = `
          <h3 class="volume-preface-title">${vol.fullName} · 卷序</h3>
          <p class="volume-preface-text">${vol.preface.replace(/\n/g, '<br>')}</p>
        `;
        volSection.appendChild(prefDiv);
      }

      // 作品网格
      const grid = document.createElement('div');
      grid.className = 'poems-grid';
      poemsInVol.forEach(poem => {
        const card = document.createElement('div');
        card.className = 'poem-card';
        card.innerHTML = `
          <span class="card-badge">${poem.cipai || poem.genre}</span>
          <h3 class="card-title">${poem.title}</h3>
          <p class="card-preview">${poem.content.split('\n').slice(0, 2).join('<br>')}</p>
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

  // ===== 阅读器 =====
  // 打开特定位置的诗词（支持连续翻页）
  async function openPoemDetail(index) {
    if (index < 0 || index >= state.allPoems.length) return;
    clearCinematicTimers();
    state.currentPoemIndex = index;
    const poem = state.allPoems[index];

    const modalContainer = els.poemModal.querySelector('.modal-container');
    if (modalContainer) {
      modalContainer.scrollTop = 0;
    }

    // 更新翻页按钮状态
    if (els.btnPrevPoem) els.btnPrevPoem.disabled = (index === 0);
    if (els.btnNextPoem) els.btnNextPoem.disabled = (index === state.allPoems.length - 1);

    // 填充元数据
    if (els.poemDetailTitle) els.poemDetailTitle.textContent = poem.title;
    if (els.poemGenreBadge) els.poemGenreBadge.textContent = poem.cipai || poem.genre;

    const vol = state.volumes.find(v => String(v.id) === String(poem.volume));
    if (els.poemVolumeBadge) els.poemVolumeBadge.textContent = vol ? vol.fullName : '';

    // 题记与时间地点
    if (els.poemEpigraph) els.poemEpigraph.textContent = poem.epigraph ? `“${poem.epigraph}”` : '';
    if (els.poemDateLocation) els.poemDateLocation.textContent = poem.dateLocation || '';

    // 双语文学翻译
    if (els.poemTranslationBlock && els.poemTranslationText) {
      if (poem.translation) {
        els.poemTranslationText.textContent = poem.translation;
        els.poemTranslationBlock.style.display = 'block';
      } else {
        els.poemTranslationBlock.style.display = 'none';
      }
    }

    // 作者按 / 后记（默认折叠）
    if (els.authorNotesDetails && els.authorNotesContent) {
      if (poem.notes) {
        els.authorNotesContent.textContent = poem.notes;
        els.authorNotesDetails.style.display = 'block';
        els.authorNotesDetails.open = false;
      } else {
        els.authorNotesDetails.style.display = 'none';
      }
    }

    // 渲染配图（静态 + 本地上传），返回全部图片 URL（演播背景取第一张）
    const allUrls = await renderPoemImages(poem.id);

    // ===== 高级沉浸演播模式 =====
    const headerEl = els.poemModal ? els.poemModal.querySelector('.poem-header') : null;
    let baseLineDelay = 0;

    if (state.isCinematic) {
      els.poemModal.classList.add('cinematic-mode');
      els.poemModal.classList.remove('skip-animation');

      // 取第一张配图作为沉浸背景：全屏 1200ms 后转暗模糊退为背景
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

      // 头部淡入动画（强制重排以重新触发）
      if (headerEl) {
        headerEl.classList.remove('cinematic-header');
        void headerEl.offsetWidth;
        headerEl.classList.add('cinematic-header');
        headerEl.style.animationDelay = `${Math.max(0, baseLineDelay - 0.3).toFixed(2)}s`;
      }
    } else {
      els.poemModal.classList.remove('cinematic-mode');
      els.poemModal.classList.remove('skip-animation');
      if (els.poemCinematicBg) {
        els.poemCinematicBg.style.backgroundImage = 'none';
        els.poemCinematicBg.className = 'poem-cinematic-bg';
      }
      if (headerEl) {
        headerEl.classList.remove('cinematic-header');
        headerEl.style.animationDelay = '';
      }
    }

    // 正文排版（演播模式逐句浮现 / 普通模式直接显示）
    if (els.poemText) {
      els.poemText.innerHTML = state.isCinematic
        ? formatPoemContentCinematic(poem.content, baseLineDelay)
        : formatPoemContent(poem.content);

      if (state.isVertical) {
        els.poemText.classList.add('vertical');
        if (els.poemContentArea) els.poemContentArea.classList.add('vertical-mode');
      } else {
        els.poemText.classList.remove('vertical');
        if (els.poemContentArea) els.poemContentArea.classList.remove('vertical-mode');
      }
    }

    // 激活弹窗
    openReader();

    // 竖排模式下：初始化水平滚动条到【最右侧】（即诗词第一句的起始位置）
    if (state.isVertical && els.poemContentArea) {
      scrollVerticalToStart();
    }

    // 演播动画全部结束后自动标记完成，此后点击直接关闭
    if (state.isCinematic) {
      const lineCount = poem.content.split('\n').filter(l => l.trim()).length;
      const totalDelay = baseLineDelay + Math.max(0, lineCount - 1) * 0.75 + 1.1;
      state.cinematicTimers.push(setTimeout(() => {
        if (els.poemModal) els.poemModal.classList.add('skip-animation');
      }, totalDelay * 1000));
    }
  }

  // ===== 布局切换 =====
  function updateLayoutToggleBtn() {
    if (els.layoutIcon) els.layoutIcon.textContent = state.isVertical ? '竖' : '横';
  }

  function toggleVertical() {
    // 移动端强制横排，禁止切换竖排
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

  // ===== 事件监听 =====
  function initEventListeners() {
    // 卷次筛选
    if (els.volumeTabs) {
      els.volumeTabs.addEventListener('click', (e) => {
        if (!e.target.classList.contains('volume-tab')) return;
        els.volumeTabs.querySelectorAll('.volume-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        state.filters.volume = e.target.dataset.vol;
        applyFilters();
      });
    }

    // 检索
    if (els.searchInput) {
      els.searchInput.addEventListener('input', debounce((e) => {
        state.filters.search = e.target.value.trim();
        applyFilters();
      }, 300));
    }

    // 横排 / 竖排切换
    if (els.btnToggleLayout) {
      els.btnToggleLayout.addEventListener('click', toggleVertical);
    }

    // 高级沉浸演播模式开关
    if (els.btnToggleCinematic) {
      els.btnToggleCinematic.addEventListener('click', () => {
        state.isCinematic = !state.isCinematic;
        localStorage.setItem('mode_cinematic', state.isCinematic);
        updateCinematicToggleBtn();
        showToast(state.isCinematic ? '已开启高级演播模式' : '已关闭高级演播模式');
        // 弹窗打开时立即以新模式重新排版
        if (els.poemModal.classList.contains('active') && state.currentPoemIndex !== -1) {
          openPoemDetail(state.currentPoemIndex);
        }
      });
    }

    // 上一首 / 下一首 / 目录 导航
    if (els.btnPrevPoem) {
      els.btnPrevPoem.addEventListener('click', () => openPoemDetail(state.currentPoemIndex - 1));
    }
    if (els.btnNextPoem) {
      els.btnNextPoem.addEventListener('click', () => openPoemDetail(state.currentPoemIndex + 1));
    }
    if (els.btnToc) {
      els.btnToc.addEventListener('click', closeReader);
    }

    // 点击弹窗内任意区域（除互动控件外）：演播模式先跳过动画，此后（及普通模式）直接关闭
    if (els.poemModal) {
      els.poemModal.addEventListener('click', (e) => {
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

    // 点击上传配图
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

    // 灯箱关闭与切换
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

    // 键盘：灯箱优先，其次阅读器切页/Esc
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

    // 竖排模式滚轮转水平
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

    // 监听页面滚动：离开 Hero 区域后为导航栏加深色遮罩背景
    window.addEventListener('scroll', () => {
      if (els.nav) {
        if (window.scrollY > 60) {
          els.nav.classList.add('scrolled');
        } else {
          els.nav.classList.remove('scrolled');
        }
      }
    }, { passive: true });
  }

  // ===== 初始化 =====
  async function init() {
    try {
      // 移动端强制横排；桌面端默认优先竖排（或读取用户设置）
      if (isMobileScreen()) {
        state.isVertical = false;
      } else if (localStorage.getItem('layout_vertical') === null) {
        state.isVertical = true;
      }

      const res = await fetch('./index.json');
      if (!res.ok) throw new Error('网络请求异常');
      const data = await res.json();

      state.volumes = data.volumes || [];
      state.allPoems = data.poems || [];

      // 初始化 IndexedDB（本地配图存储）
      await openDB();

      updateLayoutToggleBtn();
      updateCinematicToggleBtn();
      renderVolumeTabs();
      applyFilters();
      initEventListeners();
      // 初始同步一次导航栏状态（例如刷新时已滚动到中下部）
      if (els.nav) {
        els.nav.classList.toggle('scrolled', window.scrollY > 60);
      }
    } catch (e) {
      console.error('初始化失败:', e);
      if (els.poemsContainer) {
        els.poemsContainer.innerHTML = `<p class="error-msg">加载失败：${e.message}（本地打开请使用 python -m http.server 提供本地服务器）</p>`;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
