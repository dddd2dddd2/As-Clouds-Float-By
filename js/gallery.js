// gallery.js —— 诗词配图（含本地上传图片）与 Lightbox
import { state, els } from './state.js';
import { getImages, deleteImage } from './database.js';

  export async function renderPoemImages(poemId) {
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
      imgEl.loading = 'lazy';
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
      imgEl.loading = 'lazy';
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
    const firstImg = els.poemImagesGallery.querySelector('img');
    if (firstImg && !firstImg.complete) {
      await new Promise(resolve => {
        firstImg.addEventListener('load', resolve, { once: true });
        firstImg.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 2000);
      });
    }
    return allUrls;
  }

  export function openLightbox(images, index) {
    if (!els.lightbox || images.length === 0) return;
    state.lightbox.images = images;
    state.lightbox.currentIndex = index;
    updateLightboxImage();
    els.lightbox.classList.add('active');
  }

  export function closeLightbox() {
    if (els.lightbox) els.lightbox.classList.remove('active');
  }

  export function updateLightboxImage() {
    if (els.lightboxImage && state.lightbox.images.length > 0) {
      els.lightboxImage.src = state.lightbox.images[state.lightbox.currentIndex];
    }
  }
