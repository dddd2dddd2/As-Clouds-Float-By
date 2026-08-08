// search.js —— 卷次筛选、关键词搜索、诗词列表渲染
import { state, els } from './state.js';
import { conv } from './language.js';
import { openPoemDetail, showCipaiModal } from './reader.js';
import { CIPAI_DB } from './cipai_db.js';

export function renderVolumeSelect() {
  if (!els.volumeSelect) return;
  const currentVal = state.filters.volume || 'all';

  // 更新原生 select (作降级与状态同步)
  els.volumeSelect.innerHTML = `<option value="all">${conv('全部卷次')}</option>`;
  state.volumes.forEach(v => {
    const opt = document.createElement('option');
    opt.value = String(v.id);
    opt.textContent = conv(v.fullName);
    els.volumeSelect.appendChild(opt);
  });
  els.volumeSelect.value = currentVal;

  // 渲染自定义下拉框 Custom Dropdown
  const customMenu = document.getElementById('custom-select-menu');
  const customLabel = document.getElementById('custom-select-label');
  if (!customMenu || !customLabel) return;

  customMenu.innerHTML = '';

  const allOption = document.createElement('div');
  allOption.className = `custom-select-item${currentVal === 'all' ? ' selected' : ''}`;
  allOption.dataset.value = 'all';
  allOption.textContent = conv('全部卷次');
  customMenu.appendChild(allOption);

  if (currentVal === 'all') customLabel.textContent = conv('全部卷次');

  state.volumes.forEach(v => {
    const item = document.createElement('div');
    const isSelected = String(v.id) === String(currentVal);
    item.className = `custom-select-item${isSelected ? ' selected' : ''}`;
    item.dataset.value = String(v.id);
    item.textContent = conv(v.fullName);
    if (isSelected) customLabel.textContent = conv(v.fullName);
    customMenu.appendChild(item);
  });
}

export function renderGenreTabs() {
  if (!els.genreTabs) return;
  els.genreTabs.innerHTML = `<button class="genre-tab${state.filters.genre === 'all' ? ' active' : ''}" data-genre="all">${conv('全部体裁')}</button>`;
  state.genres.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'genre-tab' + (state.filters.genre === g ? ' active' : '');
    btn.dataset.genre = g;
    btn.textContent = conv(g);
    els.genreTabs.appendChild(btn);
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
    if (poem.dateSort) {
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
  if (state.filters.volume !== 'all') {
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
