/* ============================================================
   卒展サイト / work.js
   作品詳細（works/work.html?id=<slug>）
   1. データ読み込み（#work の data-src。一覧と同じ JSON）
   2. 作品名・名前・画像・解説・ゼミ／ジャンル／会場を描画
   3. 前後の作品へのリンク（一覧と同じ並び順）
   ============================================================ */
(() => {
  'use strict';

  const root = document.getElementById('work');
  if (!root) return;

  const dataUrl = new URL(root.dataset.src, location.href);
  const slug = new URLSearchParams(location.search).get('id');

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  const seminarUrl = (seminar) => `./?seminar=${encodeURIComponent(seminar)}`;
  const workUrl = (w) => `work.html?id=${encodeURIComponent(w.slug)}`;
  // ジャンルの表記ゆれ吸収（works.js と同じ規則：大文字小文字違いは多い方の表記に寄せ、頭文字を大文字に）
  const genreKey = (g) => g.trim().toLowerCase();
  function buildGenreLabels(works) {
    const counts = new Map();
    works.flatMap((w) => w.genres).forEach((g) => {
      const m = counts.get(genreKey(g)) || new Map();
      m.set(g, (m.get(g) || 0) + 1);
      counts.set(genreKey(g), m);
    });
    const labels = new Map();
    counts.forEach((m, key) => {
      const [best] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
      labels.set(key, best.charAt(0).toUpperCase() + best.slice(1));
    });
    return labels;
  }

  function notFound() {
    document.title = `作品が見つかりません | ${document.title.replace(/^作品 \| /, '')}`;
    $('workTitle').textContent = '作品が見つかりません';
    const p = el('p', 'work-detail__name');
    const a = el('a', null, '作品一覧へ戻る');
    a.href = './';
    p.append(a);
    $('workName').replaceWith(p);
  }

  function row(label, ...nodes) {
    const div = el('div', 'deflist__row');
    div.append(el('dt', null, label));
    const dd = el('dd');
    dd.append(...nodes);
    div.append(dd);
    return div;
  }

  function render(work, works) {
    const genreLabels = buildGenreLabels(works);
    document.title = `${work.title}（${work.name}） | ${document.title.replace(/^作品 \| /, '')}`;

    // パンくず
    const crumb = $('crumbSeminar');
    crumb.textContent = work.seminar;
    crumb.href = seminarUrl(work.seminar);
    crumb.hidden = false;

    $('workTitle').textContent = work.title;
    $('workName').textContent = work.name;

    // 画像（元サイズ。1枚目だけ先に読む）
    const gallery = $('workGallery');
    work.images.forEach((img, i) => {
      const fig = el('figure', 'work-detail__image');
      const im = el('img');
      im.src = new URL(img.file, dataUrl).href;
      im.alt = img.alt && img.alt !== work.title ? img.alt : `${work.title}（${i + 1}枚目）`;
      if (img.width) { im.width = img.width; im.height = img.height; }
      im.loading = i === 0 ? 'eager' : 'lazy';
      im.decoding = 'async';
      fig.append(im);
      gallery.append(fig);
    });

    // 解説（改行ごとに段落）
    const desc = $('workDesc');
    work.description.split(/\n+/).filter(Boolean).forEach((t) => desc.append(el('p', null, t)));

    // メタ情報
    const meta = $('workMeta');
    const sem = el('a', null, work.seminar);
    sem.href = seminarUrl(work.seminar);
    meta.append(row('ゼミ', sem));
    if (work.genres.length) meta.append(row('ジャンル', work.genres.map((g) => genreLabels.get(genreKey(g))).join(' / ')));
    if (work.venue) meta.append(row('展示会場', work.venue));
    work.links.forEach((l) => {
      const a = el('a', null, l.label || l.url || l);
      a.href = l.url || l;
      a.target = '_blank';
      a.rel = 'noopener';
      meta.append(row('リンク', a));
    });

    // 前後の作品
    const i = works.indexOf(work);
    const pager = $('workPager');
    [['prev', works[i - 1], '前の作品'], ['next', works[i + 1], '次の作品']].forEach(([dir, w, label]) => {
      if (!w) { pager.append(el('span', `work-pager__${dir}`)); return; }
      const a = el('a', `work-pager__${dir}`);
      a.href = workUrl(w);
      a.append(el('span', 'work-pager__label', label));
      a.append(el('span', 'work-pager__title', w.title));
      a.append(el('span', 'work-pager__name', w.name));
      pager.append(a);
    });
    pager.hidden = false;
  }

  fetch(dataUrl)
    .then((res) => {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then((works) => {
      const work = works.find((w) => w.slug === slug);
      work ? render(work, works) : notFound();
    })
    .catch(() => {
      $('workTitle').textContent = '作品データを読み込めませんでした';
    });
})();
