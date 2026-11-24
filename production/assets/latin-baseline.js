// 欧文・数字とハイフンのベースラインを少し上げる。後から追加された文章にも適用する。
(() => {
  const excluded = 'script, style, noscript, textarea, input, select, option, svg, canvas, code, pre, [contenteditable], .ms, .material-icons, .material-symbols-outlined, .weekday-mark, .latin-baseline';
  const pattern = /[A-Za-z]+|[0-9]+(?![\uFE0F\u20E3])|(?<=[0-9\u3000-\u9fff])-|-(?=[0-9\u3000-\u9fff])/g;
  function wrap(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest(excluded) || !/[A-Za-z0-9-]/.test(node.data)) return;
    const fragment = document.createDocumentFragment();
    let last = 0;
    for (const match of node.data.matchAll(pattern)) {
      fragment.append(document.createTextNode(node.data.slice(last, match.index)));
      const span = document.createElement('span');
      span.className = match[0] === '-' ? 'latin-baseline latin-baseline--hyphen' : /^[A-Za-z]/.test(match[0]) ? 'latin-baseline latin-baseline--letters' : 'latin-baseline';
      span.textContent = match[0];
      fragment.append(span);
      last = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(node.data.slice(last)));
    node.replaceWith(fragment);
  }
  function scan(root) {
    if (root.nodeType === Node.TEXT_NODE) { wrap(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE || root.matches(excluded)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(wrap);
  }
  scan(document.body);
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') scan(record.target);
      else for (const node of record.addedNodes) scan(node);
    }
  }).observe(document.body, { childList: true, characterData: true, subtree: true });
})();
