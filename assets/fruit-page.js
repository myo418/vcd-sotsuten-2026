(async () => {
  const params = new URLSearchParams(location.search), slug = params.get('seminar') || '';
  const title = document.getElementById('title'), description = document.getElementById('description');
  const englishTitles = { ishizuka: 'Seminarium ishizukae', ota: 'Seminarium otae', kitazaki: 'Seminarium kitazakiae', goto: 'Seminarium gotoi', sawada: 'Seminarium sawadae', shirai: 'Seminarium shiraii', terayama: 'Seminarium terayamae', nakano: 'Seminarium nakanoi', furugen: 'Seminarium furukatae', in: 'Seminarium graduate' };
  const back = new URL('./', location.href); back.searchParams.set('works', 'linked'); back.searchParams.set('motion-video', 'no');
  for (const key of ['bg', 'white']) if (params.has(key)) back.searchParams.set(key, params.get(key));
  back.hash = 'student-works'; document.querySelector('.back').href = back.href;
  try {
    const response = await fetch('assets/fruit-intros.json?v=20261113a'); if (!response.ok) throw new Error('data');
    const item = (await response.json())[slug]; if (!item) { description.textContent = 'ゼミの紹介が見つかりません。'; return; }
    document.getElementById('number').textContent = item.number; title.textContent = item.name; document.getElementById('english').textContent = englishTitles[slug] || ''; document.title = `${item.name} | ゼミの紹介`;
    description.textContent = item.text;
    const feature = document.getElementById('feature');
    if (window.fruitFeatures?.[slug]) { document.getElementById('feature-text').textContent = window.fruitFeatures[slug]; feature.hidden = false; }
    const art = document.getElementById('art'); art.src = `assets/img/seminars/seminar-${slug}.webp?v=1030`; art.alt = item.name; art.style.setProperty('--fruit-scale', item.scale || 1); art.hidden = false;
    // 下の「このゼミの作品を見る →」は外した（2026-11-08）
  } catch { description.textContent = '紹介文を読み込めませんでした。'; }
})();
