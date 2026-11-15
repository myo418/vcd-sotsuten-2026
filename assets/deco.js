/* ============================================================
   卒展サイト / deco.js  — ページの左右に散らす「線画＋にじみ」の絵
   KV（kv.js）と同じ動き：
   1. 線画が描き進む（<slug>-time.png の輝度が描画順マップ）
   2. 中心から水彩がにじむように絵が広がる
   画面に入ったときに1回だけ再生する。

   置き方（index.html）：
     <div class="deco deco--left" data-deco="furugen" style="--top:10%; --w:300px; --r:-8deg"></div>
   縦位置：1300px 以上は --top（section の高さに対する割合）。1300px 未満は本文に被るので、ブロックの間に置く。
   data-wide（1300px 以上）/ data-narrow（1300px 未満）があれば、周りの要素から縦位置を計算して top を上書きする：
     above <sel>        … 絵の下端が <sel> の上端の 20px 上
     topright <sel>     … 絵の下端が <sel> の上端の 80px 下（右上で少し被る）
     below <sel>        … <sel>（section）の中身の下端から、絵の高さの3割ぶん被せて置く
     between <a> <b>    … <a> の中身の下端と <b> の中身の上端の間（すきま）の中央
     abovefooter        … 絵の下端がフッターの上端の 10px 上（フッターに隠れないように）
   （STUDIO 版の「高さ0のブロック」と同じ置き方）
   素材は assets/img/deco/<slug>-{nijimi.webp,line.webp,time.png}
   （ゼ実/_work/build_deco.py で作る。にじみと線がきれいに分かれている絵だけ）
   ============================================================ */
(() => {
  'use strict';

  const LINE_DUR = 1.1;  // 線が描き終わるまで（秒）
  const BG_AT    = 0.7;  // 線がこの割合まで描けたところで、にじみが広がり始める
  const BG_DUR   = 1.3;  // にじみが広がりきるまで
  const BG_START = LINE_DUR * BG_AT;
  const TOTAL = Math.max(LINE_DUR, BG_START + BG_DUR);
  const DIR = 'assets/img/deco/';
  const VERSION = '?v=20261102-final';

  // にじみが広がり始める中心（画像に対する x, y の比率。build_deco.py が出す重心）
  const SEED = {
    nakano:  [0.536, 0.513],
    furugen: [0.533, 0.384],
    ota:     [0.517, 0.442],
    sawada:  [0.422, 0.513],
    in:      [0.528, 0.457],
  };

  /* ---------- 縦位置 ---------- */
  const WIDE = matchMedia('(min-width: 1300px)');
  // トップのデザイン D（html[data-design="d"]。本文が右半分だけ）では、画面が広くても narrow の置き方にする
  const wide = () => WIDE.matches && document.documentElement.dataset.design !== 'd';
  // 文書の上端からの位置（transform は無視。.reveal のずれを拾わないように offsetTop をたどる）
  const docTop = (e) => { let y = 0; for (let n = e; n; n = n.offsetParent) y += n.offsetTop; return y; };
  const isDeco = (e) => e.classList.contains('deco');
  // section の中身（絵以外）の上端・下端。section でない要素はその要素自身
  const content = (sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const kids = e.matches('section') ? [...e.children].filter((c) => !isDeco(c) && c.offsetParent) : [e];
    const tops = kids.map(docTop), bottoms = kids.map((c) => docTop(c) + c.offsetHeight);
    return { top: Math.min(...tops), bottom: Math.max(...bottoms) };
  };
  function place(el) {
    const spec = (wide() ? el.dataset.wide : el.dataset.narrow) || '';
    const [rule, a, b] = spec.trim().split(/\s+/);
    const h = el.offsetHeight;
    let y = null;
    if (rule === 'above') y = content(a)?.top - 20 - h;
    else if (rule === 'topright') y = content(a)?.top + 80 - h;
    // ご挨拶の実は本文に被せず、下に 24px 空けて置く（2026-10-28 はご挨拶 1 だけ。11-01 に便箋・封筒も。「挨拶文に実がかぶるのは避けたい」）。
    // 便箋（2）・封筒（3）は紙・封筒が section いっぱいに広がり、署名も中身の下端より下に出るので、section の下端から測る
    else if (rule === 'below') {
      const g = el.closest('#greeting');
      if (!g) y = content(a)?.bottom - h * .3;
      else y = (document.documentElement.dataset.greet === '1' ? content(a)?.bottom : docTop(g) + g.offsetHeight) + 24 + h * .15;
    } // .15 は傾け（--r）で角が上に出る分
    else if (rule === 'between') { const p = content(a), q = content(b); if (p && q) y = (p.bottom + q.top) / 2 - h / 2; }
    else if (rule === 'abovefooter') { const f = document.querySelector('.site-footer'); if (f) y = docTop(f) - 10 - h; }
    el.style.top = y == null || Number.isNaN(y) ? '' : `${Math.round(y - docTop(el.offsetParent))}px`;
  }
  const placeAll = () => document.querySelectorAll('[data-deco]').forEach(place);
  new ResizeObserver(placeAll).observe(document.body);
  WIDE.addEventListener('change', placeAll);

  const vs = `attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0,1);}`;
  const fs = `precision highp float;
varying vec2 uv;
uniform sampler2D tNj,tLn,tTm;uniform float uLine,uBg,uAsp,uMaxR;uniform vec2 uSeed;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
void main(){
  // 線：描画順マップの値が進行度より小さいところだけ出す。先端は少し明るく
  vec4 ln=texture2D(tLn,uv);
  float t=texture2D(tTm,uv).r;
  float soft=.02, head=uLine*(1.+soft);
  float on=smoothstep(head,head-soft,t);
  float tip=smoothstep(head-soft*2.,head-soft*.3,t)*on*step(uLine,.999);
  vec3 lc=mix(ln.rgb,vec3(1.),tip*.7);
  float la=ln.a*on;
  // にじみ：中心から水彩がにじむように広がる
  vec2 q=uv*vec2(uAsp,1.);
  float r=length((uv-uSeed)*vec2(uAsp,1.))+(fbm(q*4.)-.5)*.35;
  float edge=mix(-.12,uMaxR+.25,uBg);
  float ba=smoothstep(edge+.06,edge-.02,r);
  vec4 nj=texture2D(tNj,uv);
  float na=nj.a*ba;
  // 線をにじみの上に重ねる（背景は透明）
  float a=la+na*(1.-la);
  vec3 c=(lc*la+nj.rgb*na*(1.-la))/max(a,1e-4);
  gl_FragColor=vec4(c,a);
}`;

  const load = (src) => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(src);
    i.src = src;
  });

  const ease  = (x) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setup(el) {
    const slug = el.dataset.deco;
    const cv = document.createElement('canvas');
    el.appendChild(cv);
    const gl = cv.getContext('webgl', { premultipliedAlpha: false, antialias: false, alpha: true });

    // WebGL が使えなければ、完成した絵（にじみ＋線）を img で出す
    const fallback = () => {
      cv.remove();
      for (const k of ['nijimi.webp', 'line.webp']) {
        const i = new Image();
        i.src = DIR + slug + '-' + k + VERSION;
        i.alt = '';
        el.appendChild(i);
      }
    };
    if (!gl) return fallback();

    const sh = (type, src) => {
      const o = gl.createShader(type);
      gl.shaderSource(o, src);
      gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(o);
      return o;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(pr, n);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

    const tex = (img, unit, nearest) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      const f = nearest ? gl.NEAREST : gl.LINEAR;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    };

    let last = 0, start, raf = 0;
    const draw = (s) => {
      gl.uniform1f(U('uLine'), clamp(s / LINE_DUR));
      gl.uniform1f(U('uBg'), ease(clamp((s - BG_START) / BG_DUR)));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const frame = (now) => {
      last = Math.max(0, (now - start) / 1000);
      draw(last);
      if (last < TOTAL + .1) raf = requestAnimationFrame(frame);
    };
    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(cv.clientWidth * dpr));
      const h = Math.max(1, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      gl.viewport(0, 0, w, h);
    };

    Promise.all(['nijimi.webp', 'line.webp', 'time.png'].map((k) => load(DIR + slug + '-' + k + VERSION)))
      .then(([nj, ln, tm]) => {
        // 絵の縦横比で枠の高さを決める
        el.style.aspectRatio = `${nj.naturalWidth} / ${nj.naturalHeight}`;
        place(el);
        tex(nj, 0); tex(ln, 1); tex(tm, 2, true);
        gl.uniform1i(U('tNj'), 0); gl.uniform1i(U('tLn'), 1); gl.uniform1i(U('tTm'), 2);
        const asp = nj.naturalWidth / nj.naturalHeight;
        const seed = SEED[slug] || [.5, .5];
        gl.uniform1f(U('uAsp'), asp);
        gl.uniform2f(U('uSeed'), seed[0], seed[1]);
        // 中心から最も遠い角まで広がりきるように
        let m = 0;
        for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) m = Math.max(m, Math.hypot((x - seed[0]) * asp, y - seed[1]));
        gl.uniform1f(U('uMaxR'), m);

        layout();
        new ResizeObserver(() => { layout(); draw(start === undefined ? 0 : Math.min(last, TOTAL + .1)); }).observe(cv);

        if (reduced) { last = TOTAL; start = 0; draw(TOTAL); return; }
        draw(0);
        // 画面に入ったら再生。トップのデザイン D では、KV のイントロが終わる（kv.js の kv:done。保険で 12 秒）まで待ってから数える
        const arm = () => new IntersectionObserver((es, o) => {
          if (!es[0].isIntersecting) return;
          o.disconnect();
          start = performance.now();
          raf = requestAnimationFrame(frame);
        }, { threshold: .4 }).observe(el);
        const html = document.documentElement;
        if (html.dataset.design === 'd' && !html.classList.contains('is-kv-done')) {
          let armed = false;
          const go = () => { if (!armed) { armed = true; arm(); } };
          document.addEventListener('kv:done', go, { once: true });
          setTimeout(go, 12000);
        } else arm();
      })
      .catch((src) => { console.error('画像を読み込めません:', src); fallback(); });
  }

  document.querySelectorAll('[data-deco]').forEach(setup);
})();
