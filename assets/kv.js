/* ============================================================
   卒展サイト / kv.js  — キービジュアル（WebGL）
   STUDIO のエンベッド（key-visual/kv4/embed_filled_v2.html）を
   素の HTML/CSS/JS 版に移植したもの。

   1. 線画が描き進む（kv-time.png の輝度が描画順マップ）
   2. 中心から水彩がにじむように背景が広がる
   3. （USE_TEXT=true のときだけ）文字画像が下から滑り上がる
      ※ 文字は index.html 側の実テキストで載せているので既定は false
   ============================================================ */
(async () => {
  'use strict';
  // オープニング動画が開いている間は、KV の読み込み・アニメーションを待つ。
  const intro = document.getElementById('motion-intro');
  if (intro && intro.open) await new Promise((resolve) => intro.addEventListener('close', resolve, { once: true }));

  // ===== タイミング調整（秒）=====
  const SPEED = document.documentElement.dataset.kvSpeed === 'slow' ? 1 : .6;
  const START_DELAY = 0; // KV が見えたらすぐ線画を描き始める
  const LINE_DUR  = 2.4 * SPEED;
  const GAP       = -0.2;  // 速度に関わらず、線が終わる少し前に塗りを開始
  const BG_DUR    = 2.8;   // 塗りの広がる時間は共通
  const TXT_GAP   = 0.2;
  const TXT_DUR   = 1.2;
  const TXT_SLIDE = 24;    // 文字が下から滑り上がる距離（元の1400px幅の画像基準）
  // 広がり方は 2 通り（トップの切り替え「KV anim.」= ?anim。html[data-kvanim]。2026-10-28）
  //   1：線の重心あたりから（既定）／2：絵の横の真ん中・上寄り（上から 30%）から（線の順番は kv-time-b.png）
  const ANIM_B    = document.documentElement.dataset.kvanim === '2';
  const VERTICAL  = document.documentElement.dataset.kvanim === '3';
  // ?anim=0（切り替えの「no」）：アニメーションなしで、最初から描き終わった絵を出す
  const NO_ANIM   = document.documentElement.dataset.kvanim === '0';
  const SEED      = VERTICAL ? [0.256, 0.047] : ANIM_B ? [0.5, 0.3] : [0.47, 0.44]; // 背景がにじみ出す中心
  const FIT       = 1.0;   // 拡張画像ぜんぶを枠に収める倍率。1.0でぴったり、1.1で周りに1割の余白
  const CROP_TOP  = 0.054; // 絵の上をどれだけ画面の外へ出すか（絵の高さに対する割合）。全レイアウトで上が見切れるように置く（2026-10-28）。
                           // 値はポスター（キービジュアル/1009/1009最終線描.png）の上端の切れ方に合わせた（上の青い実の頭が少しかかる程度）。CSS の --kv-crop-top で個別に変えられる
  const SHIFT_X   = 0;     // 絵を左右にずらす量（CSS px。マイナスで左へ）。2026-10-28 の差し替え前は -140
  // キャッチ「実りの、その先へ。」は絵と同じ大きさの透過画像（kv-text.png）にして絵と同じ座標で重ねる。どの画面でも絵との位置・大きさが変わらない（2026-10-28）。
  // 画像は 11月2日受領の AI 素材から書き出したもの。読めたら .kv に has-catch-img を付け、HTML の .kv__catch は読み上げ用に残して見た目は隠す（style.css）
  const USE_TEXT  = true;
  // キャッチと KV 下の大学名・タイトル（.kv-info）の順番（トップの切り替え「KV order」= ?kv-order。html[data-kvorder]。2026-10-31）
  //   1：キャッチが出きってから開催情報（既定）／2：開催情報が出きってからキャッチ。前はキャッチ（絵の上の文字）と開催情報がほぼ同時に出ていた
  const INFO_FIRST = document.documentElement.dataset.kvorder === '2';
  const INFO_DUR  = 1.2; // 開催情報の CSS transition と同期

  // ===== 画像（assets/img/kv/ に配置）=====
  const IMG = {
    // 2026-10-28 に キービジュアル/1009 の絵へ差し替え（?v= はブラウザの古い絵のキャッシュよけ。絵を変えたら上げる。web/key-visual/kv5/_work/build.py で作る。前の絵は key-visual/kv4/）
    // 左上の「背景色」の暖色2案は、対応する水彩KV（bg2）を使う。bg3専用素材が届くまでは bg2 を暫定利用する。
    bg:    ['2', '3'].includes(document.documentElement.dataset.bg) ? 'assets/img/kv/kv-bg2.jpg?v=20261120g' : 'assets/img/kv/kv-bg.jpg?v=1009', // 1913×2461
    lines: 'assets/img/kv/kv-lines.png?v=20261120g', // 1913×2461
    time:  VERTICAL ? 'assets/img/kv/kv-time-top.png?v=1103' : ANIM_B ? 'assets/img/kv/kv-time-b.png?v=1009b' : 'assets/img/kv/kv-time.png?v=1009',
    text:  'assets/img/kv/kv-text.png?v=1102',  // 1913×2461（キャッチの文字だけ・透過）
    alpha: 'assets/img/kv/kv-bg-alpha.png?v=1009', // 1913×2461（にじみの不透明度。赤い地を透かすときだけ使う）
  };

  // 拡張画像の中で、元のKVが置かれている位置。1009 の絵は周りに赤の余白ごと切り出しているので、拡張部分なし（画像全体＝元のKV）
  const EW = 1913, EH = 2461, OX = 0, OY = 0, OW = 1913, OH = 2461;

  const cv = document.getElementById('kvCanvas');
  if (!cv) return;

  // キャッチコピー → KV 下の大学名・タイトルの順に、KV のアニメーション後に出す。
  // 隠しておくのは index.html の <head> で付ける .js-intro（最初の描画から隠すため、ここでは付けない）
  const kvEl = cv.closest('.kv');
  const infoEl = document.querySelector('.kv-info');
  let catchTimer = 0, infoTimer = 0, doneTimer = 0;
  const showCatchText = () => kvEl?.classList.add('is-catch-in');
  // KV 下の大学名・タイトルと、KV 右上の MAU ロゴ（.kv.is-info-in）を同時に
  const showInfo = () => { infoEl?.classList.add('is-in'); kvEl?.classList.add('is-info-in'); };
  // キャッチと開催情報が両方出たら KV のイントロは終わり。html に is-kv-done を付けて kv:done を飛ばす（トップのデザイン D は右の列と実の再生をこれまで待つ。style.css / deco.js）
  const done = () => {
    document.documentElement.classList.add('is-kv-done');
    document.dispatchEvent(new Event('kv:done'));
  };
  const showCatch = () => { showCatchText(); showInfo(); done(); }; // アニメーションなし・読み込み失敗のときは全部いっぺんに

  const gl = cv.getContext('webgl', { premultipliedAlpha: false, antialias: false });
  if (!gl) { cv.closest('.kv__canvas')?.classList.add('is-static'); showCatch(); return; }

  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
  const fs = `precision highp float;
uniform sampler2D tBg,tLn,tTm,tTx,tBa;uniform float uLine,uBg,uTx,uTxOff,uTxDX,uTxScale,uMaxR,uTr;uniform vec2 uSeed;uniform vec3 uBase;
uniform vec2 uRes,uOrg,uScale; // uOrg: 元KV左上の画面座標(px) / uScale: 1画像pxあたりの画面px
uniform vec4 uExp; // 元KV座標系での拡張画像の範囲 (x0,y0,w,h)
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 ouv=(px-uOrg)/uScale;                 // 元KV基準のuv（0〜1が元の範囲）
  vec2 uv=(ouv-uExp.xy)/uExp.zw;              // 拡張画像のuv
  float inImg=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
  vec4 ln=texture2D(tLn,uv)*inImg;
  float t=inImg>.5?texture2D(tTm,uv).r:1.;
  // 線：描画順マップの値が進行度より小さいところだけ出す。先端は少し明るく
  float soft=.02, head=uLine*(1.+soft);
  float on=smoothstep(head,head-soft,t);
  float tip=smoothstep(head-soft*2.,head-soft*.3,t)*on*step(uLine,.999);
  vec3 lc=mix(ln.rgb,vec3(1.),tip*.7);
  float la=ln.a*on;
  // 背景：中心から水彩がにじむように広がる（元KVと同じ座標系・同じ模様）
  float asp=${(OW / OH).toFixed(6)};
  vec2 d=(ouv-uSeed)*vec2(asp,1.);
  float r=length(d)+(fbm(ouv*vec2(asp,1.)*6.)-.5)*.35;
  float edge=mix(-.12,max(1.13,uMaxR+.25),uBg);
  float ba=smoothstep(edge+.06,edge-.02,r);
  vec3 base=uBase;
  // 画像の外は端の色を延ばす。上端は絵がかかっているので、縦に余る画面では絵を上端に付けて（layout）画像の上に余白を作らない
  vec3 bg=texture2D(tBg,clamp(uv,0.,1.)).rgb;
  vec3 col=mix(base,bg,ba);
  col=mix(col,lc,la);
  // 文字：下から滑り上がりながらフェードイン
  vec2 anchor=vec2(1635. / 1913., 601. / 2461.);
  vec2 tuv=(ouv-vec2(uTxDX,0.)-anchor)/uTxScale+anchor+vec2(0.,uTxOff); // 文字の上端を軸に拡大
  float inTx=step(0.,tuv.x)*step(tuv.x,1.)*step(0.,tuv.y)*step(tuv.y,1.);
  vec4 tx=texture2D(tTx,tuv)*inTx;
  col=mix(col,tx.rgb,tx.a*uTx);
  if(uTr<.5){gl_FragColor=vec4(col,1.);return;}
  // 赤い地を透かす（--kv-transparent。Layout 2d・2e。2026-10-31 に 2c・2d から繰り下げ）：にじみ・線・文字のある所だけ不透明にして、後ろの実が赤い地で切れないようにする
  float a0=texture2D(tBa,clamp(uv,0.,1.)).r*inImg*ba;
  vec4 p=vec4(bg*a0,a0);                       // プリマルチプライで重ねる
  p=p*(1.-la)+vec4(lc*la,la);
  float ta=tx.a*uTx; p=p*(1.-ta)+vec4(tx.rgb*ta,ta);
  gl_FragColor=p.a>0.?vec4(p.rgb/p.a,p.a):vec4(0.);
}`;

  function sh(type, src) {
    const o = gl.createShader(type);
    gl.shaderSource(o, src);
    gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(o);
    return o;
  }

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

  const load = (src) => new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = () => rej(src);
    i.src = src;
  });

  function tex(img, unit, nearest) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    const f = nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  }

  // 枠の大きさに合わせて配置：拡張画像（EW×EH）の全体が必ず見えるように収めて中央に置く
  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(cv.clientWidth * dpr));
    const h = Math.max(1, Math.round(cv.clientHeight * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }

    // トップのデザイン D1〜D4 は CSS の --kv-zoom（収めた大きさに掛ける倍率。1 より大きいと枠からはみ出す）・--kv-shift（左右のずらし px）・--kv-shift-y（上下のずらし px）で絵の置き方を変える
    const cs = getComputedStyle(cv.closest('.kv') || cv);
    const zoom = parseFloat(cs.getPropertyValue('--kv-zoom')) || 1;
    const sx = parseFloat(cs.getPropertyValue('--kv-shift'));
    const fitHeight = cs.getPropertyValue('--kv-fit-viewport').trim() === '1' ? Math.min(h, window.innerHeight * dpr) : h;
    const s = Math.min(w / (EW * FIT), fitHeight / (EH * FIT)) * zoom; // 画像1pxあたりの画面px
    const free = (w - EW * s) / 2;                      // 左右に余っている量
    // 絵が画面外に出ないように制限（はみ出させる倍率のときは制限しない）
    const shift = zoom > 1 ? (isNaN(sx) ? 0 : sx) * dpr : Math.max(-free, Math.min(free, (isNaN(sx) ? SHIFT_X : sx) * dpr));
    const ox = (w - EW * s) / 2 + OX * s + shift;
    // 縦に余る画面（スマホなど縦長）は絵を上端に付ける。上に余白ができると、上端にかかった絵の1行が引き伸ばされて見えるため
    // 絵の上端を枠の上から CROP_TOP ぶん外に出す（上が見切れる）。--kv-shift-y でさらに上下にずらせる
    const ct = parseFloat(cs.getPropertyValue('--kv-crop-top'));
    const oy = -(isNaN(ct) ? CROP_TOP : ct) * EH * s + OY * s + (parseFloat(cs.getPropertyValue('--kv-shift-y')) || 0) * dpr;

    // 絵の右端（CSS px、.kv の左端基準）を CSS に渡す。キャッチコピーをここに寄せる
    const kv = cv.closest('.kv');
    if (kv) {
      kv.style.setProperty('--kv-art-right', `${((w - EW * s) / 2 + shift + EW * s) / dpr}px`);
      // 絵の下端と高さ（CSS px、.kv の上端基準）。1 列のレイアウトで KV fade を絵の下端に合わせるのに使う
      kv.style.setProperty('--kv-art-bottom', `${(oy + EH * s) / dpr}px`);
      kv.style.setProperty('--kv-art-h', `${EH * s / dpr}px`);
      kv.classList.add('has-art-pos');
    }

    gl.uniform2f(U('uRes'), w, h);
    gl.uniform2f(U('uOrg'), ox, oy);
    gl.uniform2f(U('uScale'), OW * s, OH * s);
    gl.uniform4f(U('uExp'), -OX / OW, -OY / OH, EW / OW, EH / OH);
    // キャッチ（kv-text.png）だけを左右にずらす量。CSS の --kv-catch-dx（px。マイナスで左）。Layout 2e（10-31 までの 2d）だけで使う（2026-10-28）
    gl.uniform1f(U('uTr'), parseFloat(cs.getPropertyValue('--kv-transparent')) || 0);
    gl.uniform1f(U('uTxDX'), (parseFloat(cs.getPropertyValue('--kv-catch-dx')) || 0) * dpr / (OW * s));
    gl.uniform1f(U('uTxScale'), parseFloat(cs.getPropertyValue('--kv-catch-scale')) || 1);
    const bgRGB = (cs.getPropertyValue('--c-bg-rgb').match(/\d+(?:\.\d+)?/g) || [189, 49, 36]).map(Number);
    gl.uniform3f(U('uBase'), bgRGB[0] / 255, bgRGB[1] / 255, bgRGB[2] / 255);

    // 画面の四隅のうち、にじみの中心から最も遠い点（背景が画面全体に広がりきるように）
    const asp = OW / OH;
    let m = 0;
    for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      const u = (cx - ox) / (OW * s) - SEED[0];
      const v = (cy - oy) / (OH * s) - SEED[1];
      m = Math.max(m, Math.hypot(u * asp, v));
    }
    gl.uniform1f(U('uMaxR'), m + .2);
    gl.viewport(0, 0, w, h);
  }

  const ease  = (x) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const clamp = (x) => Math.min(1, Math.max(0, x));
  // 開催情報を先に出すとき（?kv-order=2）は、キャッチ（絵の上の文字）を開催情報が出きるまで待たせる
  const INFO_AT = LINE_DUR + GAP + BG_DUR + TXT_GAP + (INFO_FIRST ? 0 : TXT_DUR); // 開催情報を出し始める時刻（秒。線を描き始めてから）
  const TX0   = LINE_DUR + GAP + BG_DUR + TXT_GAP + (INFO_FIRST ? INFO_DUR : 0);  // キャッチを出し始める時刻
  const TOTAL = TX0 + TXT_DUR;

  let start, last = 0, raf = 0;

  function draw(s) {
    gl.uniform1f(U('uLine'), clamp(s / LINE_DUR));
    gl.uniform1f(U('uBg'), ease(clamp((s - LINE_DUR - GAP) / BG_DUR)));
    const k = clamp((s - TX0) / TXT_DUR);
    const out = 1 - Math.pow(1 - k, 3); // 減速して止まる
    gl.uniform1f(U('uTx'), k);
    gl.uniform1f(U('uTxOff'), (1 - out) * TXT_SLIDE / OH);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame(now) {
    last = start === undefined ? 0 : Math.max(0, (now - start) / 1000);
    draw(last);
    if (start !== undefined && last < TOTAL + .1) raf = requestAnimationFrame(frame);
  }

  const replay = () => {
    cancelAnimationFrame(raf);
    start = performance.now() + START_DELAY * 1000; // 開始を START_DELAY 秒先に置く（それまでは 0 秒目＝赤い地）
    raf = requestAnimationFrame(frame);
    // キャッチ（読み上げ用の HTML の印）と開催情報は絵の上の文字（TX0）と同じ時計で。下部コンテンツは開催情報と同時に表示する
    [catchTimer, infoTimer, doneTimer].forEach(clearTimeout);
    catchTimer = setTimeout(showCatchText, (START_DELAY + TX0) * 1000);
    infoTimer = setTimeout(showInfo, (START_DELAY + INFO_AT) * 1000);
    doneTimer = setTimeout(done, (START_DELAY + INFO_AT) * 1000);
  };

  const blank = () => { const c = document.createElement('canvas'); c.width = c.height = 1; return c; };

  Promise.all([load(IMG.bg), load(IMG.lines), load(IMG.time), USE_TEXT ? load(IMG.text) : blank(), load(IMG.alpha)])
    .then(([b, l, t, x, ba]) => {
      tex(b, 0); tex(l, 1); tex(t, 2, true); tex(x, 3); tex(ba, 4);
      gl.uniform1i(U('tBa'), 4);
      if (USE_TEXT) kvEl?.classList.add('has-catch-img');
      gl.uniform1i(U('tBg'), 0); gl.uniform1i(U('tLn'), 1);
      gl.uniform1i(U('tTm'), 2); gl.uniform1i(U('tTx'), 3);
      gl.uniform2f(U('uSeed'), SEED[0], SEED[1]);

      layout();
      draw(0); // 最初は赤い地だけ

      new ResizeObserver(() => {
        layout();
        draw(start === undefined ? 0 : Math.min(last, TOTAL + .1));
      }).observe(cv);

      // 動きを抑える設定なら、完成状態を一度だけ描いて終わり
      if (NO_ANIM || document.documentElement.dataset.seminarReturn === '1' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        start = performance.now() - TOTAL * 1000;
        last = TOTAL;
        draw(TOTAL);
        showCatch();
        return;
      }

      new IntersectionObserver((es, o) => {
        if (es[0].isIntersecting) { o.disconnect(); replay(); }
      }, { threshold: .3 }).observe(cv);
    })
    .catch((src) => { console.error('画像を読み込めません:', src); showCatch(); });
})();
