// search.js —— 卷次筛选、关键词搜索、诗词列表渲染
import { state, els } from './state.js';
import { conv } from './language.js';
import { openPoemDetail } from './reader.js';

  export function renderVolumeTabs() {
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
