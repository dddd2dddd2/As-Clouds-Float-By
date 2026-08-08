// state.js —— 全局共享状态与 DOM 元素引用
// 说明：为控制重构风险，沿用原 script.js 中单一 state/els 结构的写法，
// 各模块通过 `import { state, els } from './state.js'` 拿到同一份引用后直接读写属性，
// 数组/对象是按引用共享的，因此某个模块内的修改，其它模块都能看到。

export const state = {

    allPoems: [],
    volumes: [],
    genres: [],
    currentPoemIndex: -1,
    viewMode: localStorage.getItem('view_mode') || 'volume',
    filters: { volume: 'all', genre: 'all', search: '' },
    isVertical: (localStorage.getItem('layout_vertical') === 'true') ||
                (localStorage.getItem('layout_vertical') === null && window.innerWidth >= 768),
    isCinematic: true, 
    isTraditional: localStorage.getItem('lang_traditional') === 'true', 
    cinematicTimers: [],
    db: null,
    lightbox: { images: [], currentIndex: 0 }
};

export const els = {

    nav: document.getElementById('main-nav'),
    navToggle: document.getElementById('nav-toggle'),
    navLinks: document.querySelector('.nav-links'),
    poemsContainer: document.getElementById('poems-container'),
    volumeSelect: document.getElementById('volume-select'),
    genreTabs: document.getElementById('genre-tabs'),
    viewModeToggle: document.getElementById('view-mode-toggle'),
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
