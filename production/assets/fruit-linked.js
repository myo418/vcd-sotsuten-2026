// 散らしたゼ実を、左の紹介とスマホの個別ページにつなぐ。
(() => {
  const params = new URLSearchParams(location.search);
  const hoverAction = document.documentElement.dataset.fruitHover;
  const clickAction = document.documentElement.dataset.fruitClick;
  if (hoverAction !== 'linked' && !['seminar', 'mobile'].includes(clickAction)) return;
  const board = document.querySelector('#student-works .board');
  const root = document.querySelector('#student-works');
  if (!root || !board) return;
  const heading = root.querySelector('.section__title .works-heading');
  if (heading) heading.textContent = 'ゼ実の紹介';
  root.querySelectorAll('.board a.label, .seminar-scatter__label').forEach(label => {
    label.textContent = label.textContent.replace(/ゼミ$/, 'ゼ実');
  });
  const all = root.querySelector('.seminar-links__all'); if (all) all.hidden = true;
  const panel = document.createElement('aside');
  panel.className = 'fruit-preview'; panel.setAttribute('aria-hidden', 'true');
  const image = document.createElement('img'); image.alt = '';
  const art = document.createElement('div'); art.className = 'fruit-preview__art'; art.append(image);
  const header = document.createElement('div'); header.className = 'fruit-preview__header';
  const number = document.createElement('span'); number.className = 'fruit-preview__number';
  const titleGroup = document.createElement('div'); titleGroup.className = 'fruit-preview__title-group';
  const title = document.createElement('h2'); const feature = document.createElement('div'); const featureLabel = document.createElement('span'); const featureText = document.createElement('p'); const description = document.createElement('p');
  const english = document.createElement('span'); english.className = 'fruit-preview__english';
  const englishTitles = { ishizuka: 'Seminarium ishizukae', ota: 'Seminarium otae', kitazaki: 'Seminarium kitazakiae', goto: 'Seminarium gotoi', sawada: 'Seminarium sawadae', shirai: 'Seminarium shiraii', terayama: 'Seminarium terayamae', nakano: 'Seminarium nakanoi', furugen: 'Seminarium furukatae', in: 'Seminarium graduate' };
  // 一覧の画像幅に対する、透明余白を除いた実の長辺の比率。
  const artworkRatios = { ishizuka: 861 / 850, ota: 826 / 640, kitazaki: 558 / 749, goto: 699 / 695, sawada: 843 / 900, shirai: 686 / 708, terayama: 856 / 900, nakano: 841 / 680, furugen: 761 / 798, in: 848 / 900 };
  feature.className = 'fruit-preview__feature';
  description.className = 'fruit-preview__description';
  featureLabel.className = 'fruit-preview__feature-label'; featureLabel.textContent = '特徴';
  feature.append(featureLabel, featureText); titleGroup.append(title, english); header.append(number, titleGroup);
  panel.append(header, feature, art, description); document.body.append(panel);
  // 最も長い解説に高さを合わせ、ゼミを切り替えても中央位置を保つ。
  const measureDescription = () => {
    const style = getComputedStyle(panel);
    const width = panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    if (width <= 0) return;
    const measure = description.cloneNode();
    Object.assign(measure.style, { position: 'absolute', visibility: 'hidden', top: '0', width: `${width}px`, minHeight: '0' });
    panel.append(measure);
    let height = 0;
    root.querySelectorAll('.fruit-intro__item').forEach(item => {
      measure.textContent = item.querySelector('p')?.textContent || '';
      height = Math.max(height, measure.getBoundingClientRect().height);
    });
    measure.remove();
    panel.style.setProperty('--preview-description-height', `${Math.ceil(height)}px`);
    const labelWidth = featureLabel.getBoundingClientRect().width;
    const featureMeasure = featureText.cloneNode();
    Object.assign(featureMeasure.style, { position: 'absolute', visibility: 'hidden', top: '0', width: `${Math.max(1, width - labelWidth)}px` });
    panel.append(featureMeasure);
    let featureHeight = 0;
    for (const value of Object.values(window.fruitFeatures || {})) {
      featureMeasure.textContent = value;
      featureHeight = Math.max(featureHeight, featureMeasure.getBoundingClientRect().height);
    }
    featureMeasure.remove();
    panel.style.setProperty('--preview-feature-height', `${Math.ceil(featureHeight)}px`);
    const margin = el => parseFloat(getComputedStyle(el).marginBottom) || 0;
    const remaining = panel.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      - header.getBoundingClientRect().height - margin(header) - featureHeight - margin(feature) - height - margin(art);
    panel.style.setProperty('--preview-art-size', `${Math.max(100, Math.min(390, innerHeight * .43, remaining))}px`);
  };
  new ResizeObserver(measureDescription).observe(panel);
  document.fonts.ready.then(measureDescription);
  let request = 0;
  const imageCache = Object.fromEntries(Object.keys(englishTitles).map(slug => {
    const img = new Image(); img.src = `assets/img/seminars/normalized/seminar-${slug}.webp?v=20261118c`;
    return [slug, { img, ready: img.decode().catch(() => {}) }];
  }));
  const getSlug = (el) => { const link = el && el.closest('.board a, .seminar-scatter a, .fruit-intro__fruit'); if (!link) return ''; if (link.dataset.fruit || link.dataset.fruitSlug) return link.dataset.fruit || link.dataset.fruitSlug; try { const value = new URL(link.href).searchParams.get('seminar') || ''; return ({ '石塚ゼミ': 'ishizuka', '白井ゼミ': 'shirai', '沢田ゼミ': 'sawada', '寺山ゼミ': 'terayama', '中野ゼミ': 'nakano', '後藤ゼミ': 'goto', '古堅ゼミ': 'furugen', '北崎ゼミ': 'kitazaki', '大田ゼミ': 'ota', '大学院': 'in' })[value] || value; } catch { return ''; } };
  if (['seminar', 'mobile'].includes(clickAction)) root.querySelectorAll('.board a, .seminar-scatter a').forEach((link) => {
    const slug = getSlug(link); if (!slug) return;
    const url = new URL('seminar.html', location.href); url.searchParams.set('seminar', slug);
    for (const key of ['bg', 'white']) if (params.has(key)) url.searchParams.set(key, params.get(key));
    link.dataset.fruitSlug = slug; link.href = url.href; link.target = '_self';
  });
  const intro = (slug) => document.querySelector(`.fruit-intro__fruit[data-fruit="${CSS.escape(slug)}"]`)?.closest('article');
  const show = async (slug) => {
    const item = intro(slug); if (!item) return;
    const current = ++request;
    const cached = imageCache[slug]; if (!cached) return;
    const changing = panel.classList.contains('is-visible');
    if (changing) panel.classList.add('is-changing');
    const fadeOut = changing && !matchMedia('(prefers-reduced-motion: reduce)').matches
      ? new Promise(resolve => setTimeout(resolve, 160)) : Promise.resolve();
    await Promise.all([cached.ready, fadeOut]);
    if (current !== request) return;
    image.src = cached.img.src;
    const sizes = [...board.querySelectorAll('a')].filter(a => a.querySelector('img')).map(a => {
      const key = getSlug(a);
      return { slug: key, size: a.querySelector('img').offsetWidth * (artworkRatios[key] || 1) };
    });
    const largest = Math.max(...sizes.map(entry => entry.size), 1);
    const selected = sizes.find(entry => entry.slug === slug);
    image.style.setProperty('--preview-scale', selected ? selected.size / largest : 1);
    const sourceTitle = item.querySelector('h3');
    number.textContent = sourceTitle.querySelector('.fruit-number')?.textContent || '';
    title.textContent = Array.from(sourceTitle.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
    english.textContent = englishTitles[slug] || '';
    featureText.textContent = window.fruitFeatures?.[slug] || '';
    feature.hidden = !featureText.textContent;
    description.textContent = item.querySelector('p').textContent;
    measureDescription();
    panel.classList.add('is-visible');
    panel.classList.remove('is-changing');
  };
  if (hoverAction === 'linked') {
    let hoverSlug = '';
    board.addEventListener('pointermove', (e) => {
      if (!matchMedia('(min-width: 1001px) and (hover: hover)').matches || e.pointerType === 'touch') return;
      let slug = getSlug(e.target);
      if (!slug) {
        let nearest = Infinity;
        board.querySelectorAll('a').forEach(a => {
          const img = a.querySelector('img'); if (!img) return;
          const r = img.getBoundingClientRect(); if (!r.width || !r.height) return;
          const distance = Math.hypot(e.clientX - (r.left + r.right) / 2, e.clientY - (r.top + r.bottom) / 2);
          if (distance < nearest) { nearest = distance; slug = getSlug(a); }
        });
      }
      if (slug && slug !== hoverSlug) { hoverSlug = slug; show(slug); }
    });
    board.addEventListener('pointerleave', () => { hoverSlug = ''; request++; panel.classList.remove('is-visible', 'is-changing'); });
    root.addEventListener('focusin', (e) => { const slug = getSlug(e.target); if (slug && matchMedia('(min-width: 1001px)').matches) show(slug); });
    root.addEventListener('focusout', () => { request++; panel.classList.remove('is-visible'); });
  }
  if (['seminar', 'mobile'].includes(clickAction)) root.addEventListener('click', (e) => {
    const slug = getSlug(e.target); if (!slug) return;
    e.preventDefault(); e.stopPropagation();
    if (clickAction === 'mobile' && matchMedia('(min-width: 1001px) and (hover: hover)').matches) return;
    const url = new URL('seminar.html', location.href); url.searchParams.set('seminar', slug);
    for (const key of ['bg', 'white']) if (params.has(key)) url.searchParams.set(key, params.get(key));
    location.href = url.href;
  }, true);
})();
