(() => {
  const guide = document.querySelector('.home-campus');
  if (!guide) return;
  // 地図上の場所に対応するボタンにもホバー状態を反映する。
  const mapbox = guide.querySelector('.place__mapbox');
  const placeButtons = guide.querySelectorAll('.floor-guide-buildings button[data-building]');
  let hoveredBuilding = null;
  let focusedBuilding = null;
  function syncMapButton() {
    const building = hoveredBuilding || focusedBuilding;
    placeButtons.forEach(button => button.classList.toggle('is-map-active', button.dataset.building === building));
  }
  mapbox.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const target = event.target.closest('.place__bld[data-building]');
    if (target) { hoveredBuilding = target.dataset.building; syncMapButton(); }
  });
  mapbox.addEventListener('pointerout', event => {
    const target = event.target.closest('.place__bld[data-building]');
    if (target && !target.contains(event.relatedTarget)) { hoveredBuilding = null; syncMapButton(); }
  });
  mapbox.addEventListener('focusin', event => {
    const target = event.target.closest('.place__bld[data-building]');
    if (target && target.matches(':focus-visible')) { focusedBuilding = target.dataset.building; syncMapButton(); }
  });
  mapbox.addEventListener('focusout', event => {
    if (event.target.closest('.place__bld[data-building]')) { focusedBuilding = null; syncMapButton(); }
  });
  const floors = {
    '8号館': [['3階', '8-3'], ['2階', '8-2']],
    '9号館': [['2階', '9-2'], ['1階', '9-1'], ['地下1階', '9-b1']],
    '10号館': [['4階', '10-4'], ['3階', '10-3'], ['1階', '10-1']],
    '12号館': [['地下1階', '12-b1']],
    '10号館前芝生': [['芝生', '10-lawn']],
    '美術館前芝生': [['芝生', 'museum-lawn']]
  };
  const dialog = document.createElement('dialog');
  dialog.className = 'floor-guide-dialog';
  dialog.innerHTML = '<div class="floor-guide-card"><header><button type="button" class="floor-guide-close" aria-label="閉じる">×</button></header><div class="floor-guide-floors"></div></div>';
  document.body.append(dialog);
  const floorList = dialog.querySelector('.floor-guide-floors');
  let lastFocus;
  function open(building, trigger) {
    lastFocus = trigger;
    dialog.dataset.building = building;
    dialog.classList.toggle('floor-guide-dialog--fit', ['8号館', '12号館', '10号館前芝生', '美術館前芝生'].includes(building));
    dialog.setAttribute('aria-label', building + 'の展示場所');
    const direction = guide.dataset.dir === 'north' ? 'north' : 'west';
    floorList.replaceChildren(...floors[building].map(([name, path]) => {
      const section = document.createElement('section');
      section.className = 'floor-guide-floor';
      // 階の名前は画像に書いてあるので見出しは出さない（2026-11-08）。名前は alt に入れている
      const map = document.createElement('div');
      map.className = 'floor-guide-map';
      const img = document.createElement('img');
      img.className = 'floor-guide-image';
      img.src = `assets/img/map/floors/${path}-${direction}.png?v=20261124b`;
      img.alt = building + (name === '芝生' ? '' : ' ' + name) + 'のフロアマップ';
      map.append(img);
      section.append(map);
      return section;
    }));
    dialog.showModal();
    dialog.scrollTop = 0;
  }
  guide.addEventListener('click', event => {
    const button = event.target.closest('[data-building]');
    if (!button || !floors[button.dataset.building]) return;
    open(button.dataset.building, button);
  });
  dialog.querySelector('.floor-guide-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => lastFocus?.focus());
})();
