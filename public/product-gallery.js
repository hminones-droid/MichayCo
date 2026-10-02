/* Customer gallery: each presentation keeps its own photos and primary cover. */
function galleryPhotos(productId) {
  return images.filter(photo => String(photo.product_id) === String(productId))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) ||
      Number(a.display_order || 0) - Number(b.display_order || 0));
}

function openProductGallery(productId) {
  const product = products.find(p => String(p.id) === String(productId));
  const photos = galleryPhotos(productId);
  if (!product || !photos.length) return;
  let dialog = document.getElementById('productGallery');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'productGallery';
    dialog.className = 'product-gallery';
    dialog.setAttribute('aria-labelledby', 'galleryTitle');
    document.body.appendChild(dialog);
  }
  dialog.replaceChildren();
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const button = (label, className, action) => {
    const node = el('button', className, label);
    node.type = 'button';
    node.onclick = action;
    return node;
  };
  const header = el('div', 'gallery-header');
  const title = el('h2', '', product.name + (productMeta(product) ? ' · ' + productMeta(product) : ''));
  title.id = 'galleryTitle';
  header.append(title, button('Cerrar ×', 'gallery-close', () => dialog.close()));
  const stage = el('div', 'gallery-stage');
  const large = el('img', 'gallery-image');
  const error = el('p', 'gallery-error', 'No pudimos cargar esta foto. Podés elegir otra imagen.');
  error.hidden = true;
  large.onerror = () => { error.hidden = false; };
  const fitFrame = () => {
    if (!large.naturalWidth || !large.naturalHeight) return;
    const padding = window.innerWidth <= 600 ? 28 : 32;
    const height = Math.min(window.innerHeight * .58, 520);
    const photoWidth = height * large.naturalWidth / large.naturalHeight;
    dialog.style.width = Math.min(window.innerWidth - 24, Math.max(320, Math.min(900, photoWidth + padding + 2))) + 'px';
    stage.style.height = Math.min(height, (dialog.clientWidth - padding) * large.naturalHeight / large.naturalWidth) + 'px';
  };
  large.onload = () => { error.hidden = true; fitFrame(); };
  window.addEventListener('resize', fitFrame);
  const controls = el('div', 'gallery-controls');
  const counter = el('span', 'gallery-counter');
  counter.setAttribute('aria-live', 'polite');
  const thumbs = el('div', 'gallery-thumbnails');
  thumbs.setAttribute('aria-label', 'Fotos del producto');
  let current = 0;
  const url = photo => 'https://csabiejhaqmmwmafbdhy.supabase.co/storage/v1/object/public/product-images/' + encodeURI(photo.storage_path) + '?v=' + encodeURIComponent(photo.id + '-' + photo.storage_path);
  const show = index => {
    current = (index + photos.length) % photos.length;
    error.hidden = true;
    large.alt = product.name + (product.color ? ' · ' + product.color : '') + ' · Foto ' + (current + 1);
    large.src = url(photos[current]);
    counter.textContent = (current + 1) + ' de ' + photos.length;
    [...thumbs.children].forEach((thumb, index) => thumb.setAttribute('aria-pressed', String(index === current)));
  };
  const prev = button('←', 'gallery-arrow', () => show(current - 1));
  prev.setAttribute('aria-label', 'Foto anterior');
  const next = button('→', 'gallery-arrow', () => show(current + 1));
  next.setAttribute('aria-label', 'Foto siguiente');
  prev.hidden = next.hidden = thumbs.hidden = photos.length < 2;
  photos.forEach((photo, index) => {
    const thumb = button('', 'gallery-thumb', () => show(index));
    thumb.setAttribute('aria-label', 'Ver foto ' + (index + 1) + (photo.is_primary ? ', principal' : ''));
    const image = el('img', '');
    image.src = url(photo);
    image.alt = '';
    image.loading = 'lazy';
    thumb.append(image);
    thumbs.append(thumb);
  });
  stage.append(large, error);
  controls.append(prev, counter, next);
  dialog.append(header, stage, controls, thumbs);
  dialog.onkeydown = event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  };
  dialog.onclick = event => { if (event.target === dialog) dialog.close(); };
  dialog.onclose = () => {
    document.documentElement.classList.remove('gallery-is-open');
    window.removeEventListener('resize', fitFrame);
  };
  show(0);
  document.documentElement.classList.add('gallery-is-open');
  dialog.showModal();
}
