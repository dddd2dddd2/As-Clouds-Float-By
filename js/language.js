// language.js —— 简繁转换 + 静态文案（页头/页脚/导航）
import { state, els } from './state.js';

  let s2tConverter = null;
  export function initConverter() {
    if (window.OpenCC && typeof window.OpenCC.Converter === 'function') {
      try {
        s2tConverter = window.OpenCC.Converter({ from: 'cn', to: 'hk' });
      } catch (e) {
        console.warn('OpenCC 加载异常:', e);
      }
    }
  }

  export function conv(str) {
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

  export function updateStaticTexts() {
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
    const viewModeBtns = document.querySelectorAll('.btn-view-mode');
    viewModeBtns.forEach(btn => {
      if (btn.dataset.mode === 'volume') btn.textContent = conv('卷次目录');
      if (btn.dataset.mode === 'timeline') btn.textContent = conv('创作年谱');
    });
    if (footerTitle) footerTitle.innerHTML = '<span class="brand-cn">云浮集</span> · As Clouds Float By';
    if (footerSub) footerSub.textContent = conv('莫问春迟，且看云浮');
    if (navLinks.length >= 3) {
      navLinks[0].textContent = conv('卷首');
      navLinks[1].textContent = conv('目录');
      navLinks[2].textContent = conv('关于');
    }
  }

  export function updateLangToggleBtn() {
    if (!els.btnToggleLang) return;
    const simp = els.btnToggleLang.querySelector('.opt-lang-simplified');
    const trad = els.btnToggleLang.querySelector('.opt-lang-traditional');
    if (simp) simp.classList.toggle('active', !state.isTraditional);
    if (trad) trad.classList.toggle('active', !!state.isTraditional);
  }
