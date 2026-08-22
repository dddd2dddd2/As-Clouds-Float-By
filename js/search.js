// search.js —— 视图切换、卷次筛选、体裁筛选、关键词搜索、诗词列表渲染
import { state, els } from './state.js';
import { conv } from './language.js';
import { openPoemDetail, showCipaiModal } from './reader.js';
import { CIPAI_DB } from './cipai_db.js';

export function createCustomSelect({ containerId, labelId, menuId, options, currentValue, onSelect }) {
  const container = document.getElementById(containerId);
  const labelEl = document.getElementById(labelId);
  const menuEl = document.getElementById(menuId);
  if (!container || !labelEl || !menuEl) return;

  menuEl.innerHTML = '';

  // 记录当前生效值（实时更新，避免闭包捕获过期值）
  let current = currentValue;

  const setActive = (value) => {
    const activeOpt = options.find(o => String(o.value) === String(value)) || options[0];
    if (!activeOpt) return;
    labelEl.textContent = activeOpt.label;
    menuEl.querySelectorAll('.custom-select-item').forEach(item => {
      item.classList.toggle('selected', String(item.dataset.value) === String(activeOpt.value));
    });
  };

  setActive(current);

  options.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'custom-select-item';
    item.dataset.value = String(opt.value);
    item.textContent = opt.label;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      container.classList.remove('open');
      const trigger = container.querySelector('.custom-select-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');

      // 与实时值比较，而不是渲染时捕获的旧值
      if (String(opt.value) !== String(current)) {
        current = opt.value;
        setActive(current);
        onSelect(opt.value);
      }
    });

    menuEl.appendChild(item);
  });
}

export function renderViewModeSelect() {
  const options = [
    { value: 'volume', label: conv('卷次目录') },
    { value: 'timeline', label: conv('创作年谱') }
  ];

  if (els.volumeSelectWrapper) {
    els.volumeSelectWrapper.style.display = (state.viewMode === 'volume') ? '' : 'none';
  }

  createCustomSelect({
    containerId: 'custom-view-select',
    labelId: 'custom-view-label',
    menuId: 'custom-view-menu',
    options,
    currentValue: state.viewMode,
    onSelect: (val) => {
      state.viewMode = val;
      localStorage.setItem('view_mode', val);

      if (els.volumeSelectWrapper) {
        els.volumeSelectWrapper.style.display = (val === 'volume') ? '' : 'none';
      }

      applyFilters();

      const collectionEl = document.getElementById('collection');
      if (collectionEl) {
        collectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
}

export function renderVolumeSelect() {
  const options = [
    { value: 'all', label: conv('全部卷次') },
    ...state.volumes.map(v => ({ value: String(v.id), label: conv(v.fullName) }))
  ];

  if (els.volumeSelect) {
    els.volumeSelect.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    els.volumeSelect.value = state.filters.volume || 'all';
  }

  createCustomSelect({
    containerId: 'custom-volume-select',
    labelId: 'custom-volume-label',
    menuId: 'custom-volume-menu',
    options,
    currentValue: state.filters.volume || 'all',
    onSelect: (val) => {
      state.filters.volume = val;
      if (els.volumeSelect) els.volumeSelect.value = val;
      applyFilters();

      const firstCard = els.poemsContainer?.querySelector('.poem-card, .volume-preface-card, .timeline-node');
      if (firstCard) {
        firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
}

export function renderGenreSelect() {
  const options = [
    { value: 'all', label: conv('全部体裁') },
    ...state.genres.map(g => ({ value: g, label: conv(g) }))
  ];

  if (els.genreSelect) {
    els.genreSelect.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    els.genreSelect.value = state.filters.genre || 'all';
  }

  createCustomSelect({
    containerId: 'custom-genre-select',
    labelId: 'custom-genre-label',
    menuId: 'custom-genre-menu',
    options,
    currentValue: state.filters.genre || 'all',
    onSelect: (val) => {
      state.filters.genre = val;
      if (els.genreSelect) els.genreSelect.value = val;
      applyFilters();
    }
  });
}

function renderVolumeView(poems) {
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
        <span class="card-badge${CIPAI_DB[poem.cipai] ? ' has-cipai' : ''}" ${CIPAI_DB[poem.cipai] ? 'title="点击查看词牌格律"' : ''}>${conv(poem.cipai || poem.genre)}</span>
        <h3 class="card-title">${conv(poem.title)}</h3>
        <p class="card-preview">${conv(poem.content.split('\n').slice(0, 2).join('\n')).replace(/\n/g, '<br>')}</p>
      `;

      const badge = card.querySelector('.card-badge');
      if (CIPAI_DB[poem.cipai]) {
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          showCipaiModal(poem.cipai);
        });
      }

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

function formatTimelineDate(dateSort) {
  if (!dateSort) return conv('未载具体公历');
  const parts = dateSort.split('-');
  if (parts.length < 3) return dateSort;
  const y = parts[0], mo = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
  const month = conv('月');
  const day = conv('日');
  return `${y} ${mo}${month}${d}${day}`;
}

function renderTimelineView(poems) {
  // 按照日期倒序排列，无具体日期的排在后面
  const sorted = [...poems].sort((a, b) => {
    const da = a.dateSort || '';
    const db = b.dateSort || '';
    if (da && db) return db.localeCompare(da);
    if (da && !db) return -1;
    if (!da && db) return 1;
    return 0;
  });

  const container = document.createElement('div');
  container.className = 'timeline-container';

  let currentYearGroup = null;

  sorted.forEach(poem => {
    let yearDisplay = '';
    if (poem.dateSort && poem.dateSort.length >= 4) {
      yearDisplay = poem.dateSort.substring(0, 4) + conv(' 年');
    } else {
      yearDisplay = conv('漫漫岁月 · 待定年谱');
    }

    if (yearDisplay !== currentYearGroup) {
      currentYearGroup = yearDisplay;
      const yearHeader = document.createElement('div');
      yearHeader.className = 'timeline-year-header';
      yearHeader.innerHTML = `<span>${yearDisplay}</span>`;
      container.appendChild(yearHeader);
    }

    const node = document.createElement('div');
    node.className = 'timeline-node';
    const vol = state.volumes.find(v => String(v.id) === String(poem.volume));

    let dateText = '';
    if (poem.lunarDate) {
      dateText = conv(poem.lunarDate);
    } else if (poem.dateSort) {
      dateText = formatTimelineDate(poem.dateSort);
    } else if (poem.dateLocation) {
      dateText = conv(poem.dateLocation);
    } else {
      dateText = conv('未记录创作时间');
    }

    node.innerHTML = `
      <div class="timeline-date">
        <span class="timeline-date-val">${dateText}</span>
        <span class="timeline-vol-tag">${conv(vol ? vol.fullName : '')}</span>
      </div>
      <div class="timeline-card">
        <span class="card-badge${CIPAI_DB[poem.cipai] ? ' has-cipai' : ''}" ${CIPAI_DB[poem.cipai] ? 'title="点击查看词牌格律"' : ''}>${conv(poem.cipai || poem.genre)}</span>
        <h3 class="card-title">${conv(poem.title)}</h3>
        <p class="card-preview">${conv(poem.content.split('\n').slice(0, 2).join('\n')).replace(/\n/g, '<br>')}</p>
      </div>
    `;

    const badge = node.querySelector('.card-badge');
    if (CIPAI_DB[poem.cipai]) {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        showCipaiModal(poem.cipai);
      });
    }

    node.addEventListener('click', () => {
      const globalIdx = state.allPoems.findIndex(p => p.id === poem.id);
      openPoemDetail(globalIdx);
    });

    container.appendChild(node);
  });

  els.poemsContainer.appendChild(container);
}

function renderCollection(poems) {
  if (!els.poemsContainer) return;
  els.poemsContainer.innerHTML = '';
  if (poems.length === 0) {
    els.poemsContainer.innerHTML = `<p class="empty-state">${conv('未找到匹配的诗词')}</p>`;
    return;
  }

  if (state.viewMode === 'timeline') {
    renderTimelineView(poems);
  } else {
    renderVolumeView(poems);
  }
}

export function applyFilters() {
  let filtered = state.allPoems;
  if (state.viewMode === 'volume' && state.filters.volume !== 'all') {
    filtered = filtered.filter(p => String(p.volume) === String(state.filters.volume));
  }
  if (state.filters.genre !== 'all') {
    filtered = filtered.filter(p => (p.genre || '') === state.filters.genre);
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
