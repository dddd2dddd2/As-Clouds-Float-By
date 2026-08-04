// animation.js —— 电影感排版动画、计时器、水墨飞溅效果
import { state, els } from './state.js';

  export function formatPoemContent(content) {
    if (!content) return '';
    return content.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<br>';
      const clauses = trimmed.match(/[^，。；？！、]+[，。；？！、]?/g) || [trimmed];
      return `<div class="poem-line">${clauses.map(c => `<span class="poem-clause">${c}</span>`).join('')}</div>`;
    }).join('');
  }

  export function clearCinematicTimers() {
    state.cinematicTimers.forEach(t => clearTimeout(t));
    state.cinematicTimers = [];
  }

  export function formatPoemContentCinematic(content, baseDelay = 0) {
    if (!content) return '';
    let delay = baseDelay;
    const punctRegex = /([，。；？！、：,.;?!:])/g;
    return content.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<br>';
      const clauses = trimmed.match(/[^，。；？！、：,.;?!:]+[，。；？！、：,.;?!:]?/g) || [trimmed];
      const clausesHtml = clauses.map(c => {
        const formattedClause = c.replace(punctRegex, '<span class="poem-punct">$1</span>');
        return `<span class="poem-clause">${formattedClause}</span>`;
      }).join('');
      const html = `<div class="poem-line cinematic-line" style="animation-delay: ${delay.toFixed(2)}s;">${clausesHtml}</div>`;
      delay += 0.75;
      return html;
    }).join('');
  }

  export function skipCinematicAnimation() {
    clearCinematicTimers();
    if (els.poemModal) els.poemModal.classList.add('skip-animation');
    if (els.poemCinematicBg) els.poemCinematicBg.className = 'poem-cinematic-bg phase-dim';
  }

  export function triggerInkSplash() {
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
