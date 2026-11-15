/* ============================================================
   卒展サイト / works.js
   作品一覧（works/index.html）
   1. データ読み込み（#works の data-src）
   2. ゼミ（チップ）・ジャンル（タグボタン）・キーワードで絞り込み（STUDIO 版 studio-embed/works/embed.template.html と同じ動き）
   3. ゼミごとにグループ表示
   ※ ?seminar=中野ゼミ で開くとそのゼミで絞り込んだ状態から始まる（トップのゼミ一覧から使う）
   ============================================================ */
(() => {
  'use strict';

  const root = document.getElementById('works');
  if (!root) return;

  const groupsEl   = document.getElementById('worksGroups');
  const chipsEl    = document.getElementById('seminarChips');
  const genreEl    = document.getElementById('genreChips');
  const resetEl    = document.getElementById('resetBtn');
  // ジャンルは多いので、件数の多い順にこの数だけ出して残りは「ほか○件」で開く
  const GENRE_LIMIT = 12;
  let updateChips = () => {};
  const searchEl   = document.getElementById('searchInput');
  const countEl    = document.getElementById('worksCount');
  const filterForm = document.getElementById('worksFilter');

  const dataUrl = new URL(root.dataset.src, location.href);
  // 一覧はサムネイル（data-thumbs のフォルダ）を使う。無ければ元画像
  const thumbDir = root.dataset.thumbs;

  // ゼミ名 → にじみ画像（assets/img/seminars/<slug>-thumb.webp）。ゼミ名が変わったらここも直す
  const SEMINAR_IMG = {
    '石塚ゼミ': 'ishizuka', '白井ゼミ': 'shirai', '沢田ゼミ': 'sawada', '寺山ゼミ': 'terayama',
    '中野ゼミ': 'nakano', '後藤ゼミ': 'goto', '古堅ゼミ': 'furugen', '北崎ゼミ': 'kitazaki',
    '大田ゼミ': 'ota', '大学院': 'in',
  };

  const params = new URLSearchParams(location.search);
  const state = { seminar: params.get('seminar') || '', genre: '', q: '' };

  // ゼミの選択を URL に残す（リロード・共有で同じ絞り込みになる）
  function syncUrl() {
    const url = new URL(location.href);
    if (state.seminar) url.searchParams.set('seminar', state.seminar);
    else url.searchParams.delete('seminar');
    history.replaceState(null, '', url);
  }

  /* ==========================================================
     ジャンル表記ゆれの吸収
     「sculpture / Sculpture」「Graphic design / Graphic Design」を同じものとして扱い、
     表示はいちばん多い表記に寄せる
     ========================================================== */
  const genreKey = (g) => g.trim().toLowerCase();

  function buildGenreLabels(works) {
    const counts = new Map(); // key -> Map(label -> n)
    works.flatMap((w) => w.genres).forEach((g) => {
      const key = genreKey(g);
      if (!counts.has(key)) counts.set(key, new Map());
      const m = counts.get(key);
      m.set(g, (m.get(g) || 0) + 1);
    });
    const labels = new Map();
    counts.forEach((m, key) => {
      const [best] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
      labels.set(key, best.charAt(0).toUpperCase() + best.slice(1));
    });
    return labels;
  }

  /* ==========================================================
     描画
     ========================================================== */
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  function imageSrc(work) {
    const img = work.images[0];
    if (!img) return null;
    const file = thumbDir ? img.file.replace(/^images\//, `${thumbDir}/`) : img.file;
    return new URL(file, dataUrl).href;
  }

  function card(work, genreLabels) {
    const li = el('li', 'work');
    const link = el('a', 'work__link');
    link.href = `work.html?id=${encodeURIComponent(work.slug)}`;
    const fig = el('figure', 'work__thumb');
    const src = imageSrc(work);
    if (src) {
      const img = el('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      if (work.images[0].width) {
        img.width = work.images[0].width;
        img.height = work.images[0].height;
      }
      fig.append(img);
    }
    link.append(fig);

    const body = el('div', 'work__body');
    body.append(el('p', 'work__name', work.name));
    body.append(el('p', 'work__title', work.title));
    if (work.genres.length) {
      const ul = el('ul', 'work__genres');
      ul.setAttribute('aria-label', 'ジャンル');
      work.genres.forEach((g) => ul.append(el('li', null, genreLabels.get(genreKey(g)))));
      body.append(ul);
    }
    link.append(body);
    li.append(link);
    return li;
  }

  // ignore に渡した条件は無視して判定する（チップの件数を「他の条件のもとでの件数」にするため）
  function matches(work, ignore) {
    if (ignore !== 'seminar' && state.seminar && work.seminar !== state.seminar) return false;
    if (ignore !== 'genre' && state.genre && !work.genres.some((g) => genreKey(g) === state.genre)) return false;
    if (state.q) {
      const hay = `${work.name} ${work.title}`.toLowerCase().replace(/\s+/g, '');
      if (!hay.includes(state.q)) return false;
    }
    return true;
  }

  function render(works, seminars, genreLabels) {
    const hit = works.filter((w) => matches(w));
    countEl.textContent = `${hit.length} / ${works.length} 作品`;
    resetEl.hidden = !(state.seminar || state.genre || state.q);
    updateChips();

    groupsEl.replaceChildren();
    if (!hit.length) {
      groupsEl.append(el('p', 'works__status', '該当する作品がありません'));
      return;
    }

    seminars.forEach((seminar) => {
      const list = hit.filter((w) => w.seminar === seminar);
      if (!list.length) return;

      const group = el('section', 'works-group');
      const head = el('h2', 'works-group__title');
      // ゼミのにじみ画像（トップのゼミ一覧と同じ絵の小さい版）。無いゼミは文字だけ
      const slug = SEMINAR_IMG[seminar];
      if (slug) {
        const img = el('img', 'works-group__img');
        img.src = `../assets/img/seminars/${slug}-thumb.webp`;
        img.alt = '';
        img.loading = 'lazy';
        head.append(img);
      }
      head.append(seminar);
      head.append(el('span', 'works-group__count', `${list.length}`));
      group.append(head);

      const ul = el('ul', 'works-grid');
      list.forEach((w) => ul.append(card(w, genreLabels)));
      group.append(ul);
      groupsEl.append(group);
    });
  }

  function buildFilters(works, seminars, genreLabels, onChange) {
    // チップ（ゼミ・ジャンル共通）。件数は updateChips が入れる
    const chip = (value, label) => {
      const b = el('button', 'chip');
      b.type = 'button';
      b.dataset.value = value;
      b.append(label, el('span', 'chip__count'));
      return b;
    };
    // ゼミ（並びはデータ順＝一覧ページの並び）
    chipsEl.append(chip('', 'すべて'), ...seminars.map((s) => chip(s, s)));
    // ジャンル（件数の多い順）
    const genreCounts = new Map();
    works.forEach((w) => new Set(w.genres.map(genreKey)).forEach((k) =>
      genreCounts.set(k, (genreCounts.get(k) || 0) + 1)));
    const genres = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1] || genreLabels.get(a[0]).localeCompare(genreLabels.get(b[0])))
      .map(([k]) => k);
    genreEl.append(chip('', 'すべて'), ...genres.map((k) => chip(k, genreLabels.get(k))));
    let genresOpen = false;
    const more = el('button', 'works-filter__more');
    more.type = 'button';
    genreEl.append(more);

    updateChips = () => {
      // ゼミ：0件のゼミは押せない
      chipsEl.querySelectorAll('.chip').forEach((b) => {
        const v = b.dataset.value;
        const n = works.filter((w) => matches(w, 'seminar') && (!v || w.seminar === v)).length;
        b.querySelector('.chip__count').textContent = n;
        b.setAttribute('aria-pressed', String(v === state.seminar));
        b.disabled = !n && v !== state.seminar;
      });
      // ジャンル：0件は隠す。閉じているときは上位 GENRE_LIMIT 個まで（選択中は常に出す）
      let shown = 0, folded = 0;
      genreEl.querySelectorAll('.chip').forEach((b) => {
        const v = b.dataset.value;
        const active = v === state.genre;
        const n = works.filter((w) => matches(w, 'genre') && (!v || w.genres.some((g) => genreKey(g) === v))).length;
        b.querySelector('.chip__count').textContent = n;
        b.setAttribute('aria-pressed', String(active));
        if (v && !n && !active) { b.hidden = true; return; }
        if (v && !genresOpen && shown >= GENRE_LIMIT && !active) { b.hidden = true; folded++; return; }
        b.hidden = false;
        if (v) shown++;
      });
      more.hidden = !folded && !genresOpen;
      more.textContent = genresOpen ? '閉じる' : `ほか${folded}件`;
    };

    chipsEl.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b || b.disabled) return;
      state.seminar = b.dataset.value;
      syncUrl();
      onChange();
    });
    genreEl.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      // 選択中のタグをもう一度押すと解除
      state.genre = b.dataset.value === state.genre ? '' : b.dataset.value;
      onChange();
    });
    more.addEventListener('click', () => { genresOpen = !genresOpen; updateChips(); });
    searchEl.addEventListener('input', () => {
      state.q = searchEl.value.toLowerCase().replace(/\s+/g, '');
      onChange();
    });
    resetEl.addEventListener('click', () => {
      Object.assign(state, { seminar: '', genre: '', q: '' });
      searchEl.value = '';
      syncUrl();
      onChange();
    });
    filterForm.addEventListener('submit', (e) => e.preventDefault());
  }

  /* ==========================================================
     起動
     ========================================================== */
  fetch(dataUrl)
    .then((res) => {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then((works) => {
      const seminars = [...new Set(works.map((w) => w.seminar))];
      // 存在しないゼミ名が来たら「すべて」に戻す
      if (state.seminar && !seminars.includes(state.seminar)) {
        state.seminar = '';
        syncUrl();
      }
      const genreLabels = buildGenreLabels(works);
      const update = () => render(works, seminars, genreLabels);
      buildFilters(works, seminars, genreLabels, update);
      update();
    })
    .catch(() => {
      groupsEl.replaceChildren(el('p', 'works__status', '作品データを読み込めませんでした'));
    });
})();
