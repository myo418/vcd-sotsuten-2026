/* ============================================================
   卒展サイト / script.js
   1. サイドバー（右からの出し入れ）
   2. スムーススクロール & カレント表示
   3. スクロール連動フェードイン
   4. ゼミの実のぷるんとした揺れ
   ※ キービジュアルの描画は assets/kv.js 側
   ============================================================ */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================
     1. Sidebar
     ========================================================== */
  const sidebar  = document.getElementById('sidebar');
  const scrim    = document.getElementById('scrim');
  const menuBtn  = document.getElementById('menuBtn');
  const closeBtn = document.getElementById('closeBtn');

  const focusables = () =>
    sidebar.querySelectorAll('a[href], button:not([disabled])');

  function openMenu() {
    scrim.hidden = false;
    // hidden 解除直後に transition を効かせる
    requestAnimationFrame(() => scrim.classList.add('is-open'));

    sidebar.classList.add('is-open');
    sidebar.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    closeBtn.focus({ preventScroll: true });
  }

  function closeMenu({ restoreFocus = true } = {}) {
    scrim.classList.remove('is-open');
    sidebar.classList.remove('is-open');
    sidebar.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');

    const hide = () => { scrim.hidden = true; };
    reduceMotion ? hide() : window.setTimeout(hide, 450);

    if (restoreFocus) menuBtn.focus({ preventScroll: true });
  }

  const isOpen = () => sidebar.classList.contains('is-open');

  menuBtn.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', () => closeMenu());
  scrim.addEventListener('click', () => closeMenu());

  // Esc で閉じる / Tab はサイドバー内でループ
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;

    if (e.key === 'Escape') {
      closeMenu();
      return;
    }
    if (e.key !== 'Tab') return;

    const items = focusables();
    if (!items.length) return;

    const first = items[0];
    const last  = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ==========================================================
     2. ナビリンク：クリックで閉じる
     ========================================================== */
  const navLinks = [...sidebar.querySelectorAll('a[href^="#"]')];

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      // フォーカスは移動先セクションへ渡したいので戻さない
      closeMenu({ restoreFocus: false });
    });
  });

  /* ==========================================================
     3. スクロール連動フェードイン
     ========================================================== */
  const revealTargets = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    revealTargets.forEach((el) => io.observe(el));
  }

  /* ==========================================================
     4. ゼミの実：マウスが触れると、つついたようにぷるんと揺れる
     減衰するばねを2本（左右の揺れ＝skew、上下のつぶれ＝scale）。
     マウスが入ってきた側から押されたように、反対側へ傾く
     ========================================================== */
  if (!reduceMotion) {
    const K = 420;   // ばねの硬さ（大きいほど速く小刻みに揺れる）
    const C = 16;    // 減衰（大きいほど早く収まる）
    const PUSH = 20; // 左右に押す強さ（skew の初速 deg/s ÷ 10）
    const SQUASH = 0.9; // つぶれの強さ

    document.querySelectorAll('.seminar-scatter a:has(img)').forEach((a) => {
      let skew = 0, vSkew = 0, sq = 0, vSq = 0, raf = 0, prev = 0;

      const step = (now) => {
        const dt = Math.min((now - prev) / 1000, 1 / 30);
        prev = now;
        vSkew += (-K * skew - C * vSkew) * dt; skew += vSkew * dt;
        vSq   += (-K * 1.4 * sq - C * vSq) * dt; sq += vSq * dt;
        a.style.setProperty('--wob-skew', `${skew.toFixed(3)}deg`);
        // 体積を保つように：縦につぶれた分だけ横にふくらむ
        a.style.setProperty('--wob-sx', (1 + sq).toFixed(4));
        a.style.setProperty('--wob-sy', (1 - sq).toFixed(4));
        if (Math.abs(skew) + Math.abs(vSkew) / 20 + Math.abs(sq) * 50 + Math.abs(vSq) > 0.01) {
          raf = requestAnimationFrame(step);
        } else {
          raf = 0;
          a.style.removeProperty('--wob-skew');
          a.style.removeProperty('--wob-sx');
          a.style.removeProperty('--wob-sy');
        }
      };

      a.addEventListener('pointerenter', (e) => {
        // 入ってきた位置が中心より左なら右へ、右なら左へ押される
        const r = a.getBoundingClientRect();
        const side = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
        vSkew += -side * PUSH * 10;
        vSq += SQUASH;
        if (!raf) { prev = performance.now(); raf = requestAnimationFrame(step); }
      });
    });
  }
})();
