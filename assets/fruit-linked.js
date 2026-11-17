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
  if (heading) heading.textContent = 'ゼミの紹介';
  const all = root.querySelector('.seminar-links__all'); if (all) all.hidden = true;
  const panel = document.createElement('aside');
  panel.className = 'fruit-preview'; panel.setAttribute('aria-hidden', 'true');
  const image = document.createElement('img'); image.alt = '';
  const header = document.createElement('div'); header.className = 'fruit-preview__header';
  const number = document.createElement('span'); number.className = 'fruit-preview__number';
  const titleGroup = document.createElement('div'); titleGroup.className = 'fruit-preview__title-group';
  const title = document.createElement('h2'); const feature = document.createElement('div'); const featureLabel = document.createElement('span'); const featureText = document.createElement('p'); const description = document.createElement('p');
  const english = document.createElement('span'); english.className = 'fruit-preview__english';
  const englishTitles = { ishizuka: 'Seminarium ishizukae', ota: 'Seminarium otae', kitazaki: 'Seminarium kitazakiae', goto: 'Seminarium gotoi', sawada: 'Seminarium sawadae', shirai: 'Seminarium shiraii', terayama: 'Seminarium terayamae', nakano: 'Seminarium nakanoi', furugen: 'Seminarium furukatae', in: 'Seminarium graduate' };
  feature.className = 'fruit-preview__feature';
  description.className = 'fruit-preview__description';
  featureLabel.className = 'fruit-preview__feature-label'; featureLabel.textContent = '特徴';
  feature.append(featureLabel, featureText); titleGroup.append(title, english); header.append(number, titleGroup);
  panel.append(header, feature, image, description); document.body.append(panel);
  const getSlug = (el) => { const link = el && el.closest('.board a, .seminar-scatter a, .fruit-intro__fruit'); if (!link) return ''; if (link.dataset.fruit || link.dataset.fruitSlug) return link.dataset.fruit || link.dataset.fruitSlug; try { const value = new URL(link.href).searchParams.get('seminar') || ''; return ({ '石塚ゼミ': 'ishizuka', '白井ゼミ': 'shirai', '沢田ゼミ': 'sawada', '寺山ゼミ': 'terayama', '中野ゼミ': 'nakano', '後藤ゼミ': 'goto', '古堅ゼミ': 'furugen', '北崎ゼミ': 'kitazaki', '大田ゼミ': 'ota', '大学院': 'in' })[value] || value; } catch { return ''; } };
  if (['seminar', 'mobile'].includes(clickAction)) root.querySelectorAll('.board a, .seminar-scatter a').forEach((link) => {
    const slug = getSlug(link); if (!slug) return;
    const url = new URL('seminar.html', location.href); url.searchParams.set('seminar', slug);
    for (const key of ['bg', 'white']) if (params.has(key)) url.searchParams.set(key, params.get(key));
    link.dataset.fruitSlug = slug; link.href = url.href; link.target = '_self';
  });
  const intro = (slug) => document.querySelector(`.fruit-intro__fruit[data-fruit="${CSS.escape(slug)}"]`)?.closest('article');
  const show = (slug) => {
    const item = intro(slug); if (!item) return;
    image.src = `assets/img/seminars/normalized/seminar-${slug}.webp?v=20261118b`;
    const sourceTitle = item.querySelector('h3');
    number.textContent = sourceTitle.querySelector('.fruit-number')?.textContent || '';
    title.textContent = Array.from(sourceTitle.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
    english.textContent = englishTitles[slug] || '';
    featureText.textContent = window.fruitFeatures?.[slug] || '';
    feature.hidden = !featureText.textContent;
    description.textContent = item.querySelector('p').textContent;
    panel.classList.add('is-visible');
  };
  if (hoverAction === 'linked') {
    root.addEventListener('pointerover', (e) => { if (!matchMedia('(min-width: 1001px) and (hover: hover)').matches) return; const slug = getSlug(e.target); if (slug && slug !== getSlug(e.relatedTarget)) show(slug); });
    root.addEventListener('pointerout', (e) => { const slug = getSlug(e.target); if (slug && slug !== getSlug(e.relatedTarget)) panel.classList.remove('is-visible'); });
    root.addEventListener('focusin', (e) => { const slug = getSlug(e.target); if (slug && matchMedia('(min-width: 1001px)').matches) show(slug); });
    root.addEventListener('focusout', () => panel.classList.remove('is-visible'));
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
