// PCでは図録の写真を一枚ずつ送り、スマホでは従来のスワイプを使う。
document.querySelectorAll('.handout__photos').forEach((photos, index) => {
  const images = [...photos.querySelectorAll('img')];
  if (images.length < 2) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'catalog-carousel';
  photos.before(wrapper);
  wrapper.append(photos);
  photos.id = `catalog-photos-${index + 1}`;

  const controls = document.createElement('div');
  controls.className = 'catalog-carousel__controls';
  const previous = document.createElement('button');
  const next = document.createElement('button');
  const count = document.createElement('span');
  previous.type = next.type = 'button';
  previous.textContent = '←';
  next.textContent = '→';
  previous.setAttribute('aria-label', '前の図録写真');
  next.setAttribute('aria-label', '次の図録写真');
  previous.setAttribute('aria-controls', photos.id);
  next.setAttribute('aria-controls', photos.id);
  count.setAttribute('aria-live', 'polite');
  controls.append(previous, count, next);
  wrapper.append(controls);

  const currentIndex = () => {
    const left = photos.scrollLeft;
    return images.reduce((best, image, i) => Math.abs(image.offsetLeft - images[0].offsetLeft - left) < Math.abs(images[best].offsetLeft - images[0].offsetLeft - left) ? i : best, 0);
  };
  const update = () => {
    const i = currentIndex();
    count.textContent = `${i + 1} / ${images.length}`;
    controls.style.right = i === images.length - 1 ? '8px' : 'calc(14% + 8px)';
    previous.disabled = i === 0;
    next.disabled = i === images.length - 1;
  };
  const go = (direction) => {
    const i = Math.max(0, Math.min(images.length - 1, currentIndex() + direction));
    photos.scrollTo({ left: images[i].offsetLeft - images[0].offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  previous.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  photos.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
});
