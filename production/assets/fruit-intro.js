// ゼ実紹介の絵も、トップのゼミボタンと同じスイッチで揺らす。
(() => {
  if (document.documentElement.dataset.fruitLayout === 'longshort') {
    document.querySelectorAll('.fruit-intro__fruit').forEach((button) => {
      const feature = window.fruitFeatures?.[button.dataset.fruit];
      const content = button.closest('.fruit-intro__item')?.querySelector('div');
      if (!feature || !content) return;
      const short = document.createElement('p');
      short.className = 'fruit-intro__short';
      short.textContent = feature;
      content.append(short);
    });
  }
  // 図録「ゼミ扉.pdf」の各ゼ実の「特徴」を短文として使用。
  const hoverAction = document.documentElement.dataset.fruitHover;
  const clickAction = document.documentElement.dataset.fruitClick;
  if (hoverAction === 'short' || clickAction === 'short') {
    const features = window.fruitFeatures || {};
    const root = document.querySelector('#student-works');
    const heading = root?.querySelector('.works-heading');
    if (heading) heading.textContent = 'ゼ実の紹介';
    const overlay = document.createElement('div');
    overlay.className = 'fruit-short-overlay'; overlay.hidden = true;
    overlay.setAttribute('role', 'tooltip');
    const text = document.createElement('span');
    overlay.append(text); document.body.append(overlay);
    let active = null;
    const findLink = (target) => target?.closest?.('.board a, .seminar-scatter a, .fruit-intro__fruit');
    const slugOf = (link) => {
      if (link.dataset.fruit) return link.dataset.fruit;
      try { const id = new URL(link.href).searchParams.get('seminar') || '';
        return ({ '石塚ゼミ': 'ishizuka', '白井ゼミ': 'shirai', '沢田ゼミ': 'sawada', '寺山ゼミ': 'terayama', '中野ゼミ': 'nakano', '後藤ゼミ': 'goto', '古堅ゼミ': 'furugen', '北崎ゼミ': 'kitazaki', '大田ゼミ': 'ota', '大学院': 'in' })[id] || id;
      } catch { return ''; }
    };
    const hide = () => { overlay.hidden = true; active = null; };
    const show = (link) => {
      const slug = slugOf(link), item = root.querySelector('.fruit-intro__fruit[data-fruit="' + slug + '"]')?.closest('article');
      if (!item || !features[slug]) return;
      text.textContent = features[slug];
      overlay.hidden = false; active = link;
      const board = link.closest('.board');
      const imageLink = board && [...board.querySelectorAll('a')].find((a) => a.querySelector('img') && slugOf(a) === slug);
      const label = board ? [...board.querySelectorAll('a.label')].find((a) => slugOf(a) === slug) : link.querySelector('.seminar-scatter__label');
      const r = (imageLink || link).getBoundingClientRect(), w = overlay.offsetWidth;
      const labelBottom = label ? label.getBoundingClientRect().bottom : r.bottom;
      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      overlay.style.left = clamp(r.left + (r.width - w) / 2, 8, Math.max(8, innerWidth - w - 8)) + 'px';
      overlay.style.top = Math.max(r.bottom, labelBottom) + 10 + 'px';
    };
    if (hoverAction === 'short') {
      root.addEventListener('pointerover', (event) => { if (event.pointerType === 'touch') return; const link = findLink(event.target); if (link && link !== findLink(event.relatedTarget)) show(link); });
      root.addEventListener('pointerout', (event) => { if (event.pointerType !== 'touch' && findLink(event.target) && !findLink(event.relatedTarget)) hide(); });
      root.addEventListener('focusin', (event) => { const link = findLink(event.target); if (link && matchMedia('(hover: hover)').matches) show(link); });
      root.addEventListener('focusout', (event) => { if (findLink(event.target)) hide(); });
    }
    if (clickAction === 'short') root.addEventListener('click', (event) => { const link = findLink(event.target); if (!link || !features[slugOf(link)]) return; event.preventDefault(); event.stopPropagation(); if (active === link && !overlay.hidden) hide(); else show(link); }, true);
    document.addEventListener('pointerdown', (event) => { if (!findLink(event.target)) hide(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hide(); });
    addEventListener('scroll', hide, { passive: true }); addEventListener('resize', hide);
  }
  if (clickAction === 'none' || clickAction === 'works') {
    const root = document.querySelector('#student-works');
    root?.addEventListener('click', (event) => {
      const target = event.target.closest('.board a, .seminar-scatter a, .fruit-intro__fruit');
      if (!target) return;
      if (clickAction === 'none') { if (target.matches('a')) event.preventDefault(); return; }
      if (target.dataset.fruit) {
        const url = new URL('works/', location.href); url.searchParams.set('seminar', target.dataset.fruit);
        location.href = url.href;
      }
    });
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mode = new URLSearchParams(location.search).get('fruit-anim') || '2';
  const pivots = { furugen: [11.7, 81.8], goto: [45.6, 13.2], in: [61.5, 92.4], ishizuka: [85.2, 4.2], kitazaki: [79.0, 38.3], nakano: [59.7, 5.0], ota: [63.2, 3.3], sawada: [45.8, 93.0], shirai: [96.7, 14.2], terayama: [5, 80] };
  document.querySelectorAll('.fruit-intro__fruit').forEach((button) => {
    const img = button.querySelector('img');
    const pivot = pivots[button.dataset.fruit] || [50, 50];
    img.style.transformOrigin = `${pivot[0]}% ${pivot[1]}%`;
    let angle = 0, velocity = 0, skew = 0, skewVelocity = 0, frame = 0, last = 0;
    const step = (time) => {
      const dt = Math.min((time - last) / 1000, 1 / 30); last = time;
      velocity += (-280 * angle - 8 * velocity) * dt; angle += velocity * dt;
      skewVelocity += (-420 * skew - 16 * skewVelocity) * dt; skew += skewVelocity * dt;
      img.style.transform = mode === '1' ? `skewX(${skew}deg)` : `rotate(${angle}deg) skewX(${skew * .3}deg)`;
      if (Math.abs(angle) + Math.abs(velocity) / 20 + Math.abs(skew) + Math.abs(skewVelocity) / 20 > .02) frame = requestAnimationFrame(step);
      else { frame = 0; img.style.transform = ''; }
    };
    const poke = (event) => {
      if (reduced.matches) return;
      if (mode === '3') {
        img.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'ease-out' });
        return;
      }
      const rect = button.getBoundingClientRect();
      const side = event && event.clientX ? Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)) : .5;
      velocity += -side * 80 || 30; skewVelocity += -side * 120 || 40;
      if (!frame) { last = performance.now(); frame = requestAnimationFrame(step); }
    };
    button.addEventListener('pointerenter', (event) => { if (event.pointerType !== 'touch') poke(event); });
    button.addEventListener('click', poke);
  });
})();
