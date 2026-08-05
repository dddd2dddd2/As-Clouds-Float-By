import { state, els } from './state.js';

export function isMobileScreen() {
  return window.innerWidth <= 768;
}

/**
 * 竖排模式下：过滤换行空列，按正文“第一字”（首列）到“最后一字”（尾列）精确计算物理轴线
 * 使正文首列（如“酒满深瓯色更浓”）的中轴线与标题副标题/首句 100% 垂直重合
 */
export function alignVerticalTitleAndContent() {
  if (!state.isVertical || isMobileScreen() || !els.poemModal || !els.poemModal.classList.contains('active')) {
    if (els.poemText) {
      els.poemText.style.marginRight = '';
      els.poemText.style.marginLeft = '';
      els.poemText.style.transform = '';
    }
    return;
  }

  if (!els.poemDetailTitle || !els.poemText || !els.poemContentArea) return;

  // 1. 严格过滤所有空行/空列，仅保留包含实际文字的有效正文列
  const textLines = Array.from(els.poemText.querySelectorAll('.poem-line'))
    .filter(line => line.textContent.trim().length > 0);

  if (textLines.length === 0) return;

  const realFirstLine = textLines[0]; // 包含正文“第一字”的绝对首列
  const realLastLine = textLines[textLines.length - 1]; // 包含正文“最后一字”的绝对尾列

  // 2. 禁用样式并重置，强制 DOM 同步重绘，读取纯净自然布局下的物理绝对坐标
  const origTransition = els.poemText.style.transition;
  els.poemText.style.transition = 'none';
  els.poemText.style.transform = 'none';
  els.poemText.style.marginRight = '0px';
  els.poemText.style.marginLeft = 'auto';

  // 强制同步重绘 (Force Synchronous Reflow)
  void els.poemText.offsetWidth;

  const containerRect = els.poemContentArea.getBoundingClientRect();
  const containerWidth = containerRect.width;
  if (containerWidth === 0) return;

  // 获取目标对齐标题元素（优先副标题/首句，其次为主标题）
  const targetEl = els.poemDetailTitle.querySelector('.title-sub') ||
                   els.poemDetailTitle.querySelector('.title-main') ||
                   els.poemDetailTitle;

  const targetRect = targetEl.getBoundingClientRect();
  const realFirstRect = realFirstLine.getBoundingClientRect();
  const realLastRect = realLastLine.getBoundingClientRect();

  if (targetRect.width === 0 || realFirstRect.width === 0) {
    els.poemText.style.transition = origTransition;
    return;
  }

  // 3. 标题目标的绝对 X 中心坐标
  const targetCenterX = targetRect.left + targetRect.width / 2;

  // 正文首列（包含第一个字）自然状态下的绝对 X 中心坐标
  const realFirstCenterX = realFirstRect.left + realFirstRect.width / 2;

  // 4. 计算所需右边距 M，使得平移后 realFirstCenterX - M = targetCenterX
  let requiredMarginRight = realFirstCenterX - targetCenterX;

  // 5. 左侧边界保护：确保正文尾列（包含最后一个字）不会超出容器左边界被裁剪
  const minAllowedLeft = containerRect.left + 24; // 至少留出 24px 左边距
  const projectedLastLeft = realLastRect.left - requiredMarginRight;
  if (projectedLastLeft < minAllowedLeft) {
    requiredMarginRight = realLastRect.left - minAllowedLeft;
  }

  // 6. 右侧边界保护：确保右边距不为负数
  requiredMarginRight = Math.max(0, requiredMarginRight);

  // 7. 应用精确 CSS Margin 布局
  els.poemText.style.marginRight = `${requiredMarginRight.toFixed(2)}px`;
  els.poemText.style.marginLeft = '0px';
  els.poemText.style.transform = 'none';

  // 恢复 transition 避免影响后续交互
  requestAnimationFrame(() => {
    if (els.poemText) els.poemText.style.transition = origTransition;
  });
}

export function scrollVerticalToStart() {
  if (!els.poemContentArea) return;
  requestAnimationFrame(() => {
    if (state.isVertical && !isMobileScreen()) {
      els.poemContentArea.scrollLeft = els.poemContentArea.scrollWidth;
    } else {
      els.poemContentArea.scrollLeft = 0;
    }
  });
}

export function resetReaderScrollPositions() {
  const modalContainer = els.poemModal ? els.poemModal.querySelector('.modal-container') : null;
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (modalContainer) {
        modalContainer.scrollTop = 0;
      }
      alignVerticalTitleAndContent();
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

export function updateLayoutToggleBtn() {
  if (!els.btnToggleLayout) return;
  const vert = els.btnToggleLayout.querySelector('.opt-layout-vertical');
  const horiz = els.btnToggleLayout.querySelector('.opt-layout-horizontal');
  if (vert) vert.classList.toggle('active', !!state.isVertical);
  if (horiz) horiz.classList.toggle('active', !state.isVertical);
}

export function toggleVertical() {
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
    setTimeout(() => alignVerticalTitleAndContent(), 60);
  } else {
    els.poemText.classList.remove('vertical');
    els.poemText.style.marginRight = '';
    els.poemText.style.marginLeft = '';
    els.poemText.style.transform = '';
    if (els.poemContentArea) {
      els.poemContentArea.classList.remove('vertical-mode');
      els.poemContentArea.scrollLeft = 0;
    }
  }
}