
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const LSKEY = 'orion.chat.v2';
const LSOLD = ['ds.deepseek.v3'];

const store = { key: '', base: 'https://api.deepseek.com', model: 'deepseek-chat', theme: 'light',
  balance: 0, rate: 2, spent: 0, convs: [], curId: null, web: false, voice: 'stella', ctx: 12, tasks: [], agPerms: 'workspace' };
try {
  let raw = localStorage.getItem(LSKEY);
  if (!raw) {
    for (const k of LSOLD) { const v = localStorage.getItem(k); if (v) { raw = v; break; } }
  }
  if (raw) Object.assign(store, JSON.parse(raw));
  save();
} catch (e) {}
if (!Array.isArray(store.tasks)) store.tasks = [];

try {
  store.tasks = store.tasks.map(function (t) {
    if (t && t.goal) {
      if (!t.status) t.status = 'pending';
      if (!Array.isArray(t.steps)) t.steps = [];
      if (!t.perms) t.perms = 'workspace';
      return t;
    }
    return {
      id: t.id || ('r' + Math.random().toString(36).slice(2, 8)),
      goal: t.title || '未命名任务',
      status: t.done ? 'done' : 'pending',
      ts: t.ts || Date.now(),
      perms: 'workspace', steps: [], hist: [],
    };
  });
} catch (e) { store.tasks = []; }
if (store.agPerms !== 'read' && store.agPerms !== 'workspace' && store.agPerms !== 'full') store.agPerms = 'workspace';
if (!store.base) store.base = 'https://api.deepseek.com';
if (store.theme !== 'dark' && store.theme !== 'auto') store.theme = 'light';
if (typeof store.workPath !== 'string') store.workPath = '';
if (!Array.isArray(store.spaces)) store.spaces = [];
if (typeof store.balance !== 'number' || !isFinite(store.balance)) store.balance = 0;
if (typeof store.rate !== 'number' || store.rate <= 0) store.rate = 2;
if (typeof store.spent !== 'number' || !isFinite(store.spent)) store.spent = 0;
const RATE_DEFAULT = 2;   

try {
  if (!store.key) {
    var ok = localStorage.getItem('dsc.key');
    if (ok) {
      store.key = ok;
      store.base = localStorage.getItem('dsc.base') || store.base;
      var om = localStorage.getItem('dsc.model');
      if (om) store.model = om;
    }
  }
  if (!store.convs.length) {
    var oc = localStorage.getItem('dsc.convs');
    if (oc) {
      var arr = JSON.parse(oc) || [];
      store.convs = arr.map(function (c) {
        return {
          id: c.id || ('c' + Math.random().toString(36).slice(2, 8)),
          title: c.title || '新对话',
          ts: c.ts || c.time || Date.now(),
          messages: (c.messages || []).map(function (m) {
            return { role: m.role, content: m.content || '', reasoning: m.reasoning || '', usage: m.usage || null, elapsed: m.elapsed || 0, stopped: !!m.stopped };
          }),
        };
      });
      store.curId = store.convs.length ? store.convs[0].id : null;
    }
  }
  save();
} catch (e) {}
function save() { try { localStorage.setItem(LSKEY, JSON.stringify(store)); } catch (e) {} }

const MODEL_LABEL = { 'deepseek-chat': '对话模型', 'deepseek-reasoner': '思考模型' };
const busy = { on: false, ctrl: null };

function cur() { return store.convs.find((c) => c.id === store.curId) || null; }
function ensureConv() {
  let c = cur();
  if (!c) {
    c = { id: 'c' + Date.now().toString(36), title: '新对话', ts: Date.now(), messages: [], kind: store.pendingKind || 'chat' };
    store.convs.unshift(c);
    store.curId = c.id;
  }
  c.ts = Date.now();
  return c;
}


const SV = (d, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + d + '</svg>';
const ICON = {
  copy: SV('<rect x="9" y="9" width="11" height="11" rx="2.2"/><path d="M5.6 15.5V7.4a1.8 1.8 0 011.8-1.8h8.1"/>'),
  regen: SV('<path d="M4.6 12a7.4 7.4 0 0012.8 4.9"/><path d="M19.4 12a7.4 7.4 0 00-12.8-4.9"/><path d="M6.6 12.6L4.4 8.4l-4.2 1.2" transform="translate(2 1)"/>' +
    '<path d="M17.4 11.4l2.2 4.2 4.2-1.2" transform="translate(-2 -1)"/>'),
  up: SV('<path d="M9.2 11h7.9c1.2 0 2.1.9 2 2.1l-.8 5.2c-.1.9-.9 1.6-1.9 1.6H9.2z"/><path d="M9.2 11l2.9-5.4a1.7 1.7 0 012.7 1.3V8"/><path d="M6.4 11v9H3.6v-9z" transform="translate(1 0)"/>'),
  down: SV('<g transform="rotate(180 12 12)"><path d="M9.2 11h7.9c1.2 0 2.1.9 2 2.1l-.8 5.2c-.1.9-.9 1.6-1.9 1.6H9.2z"/><path d="M9.2 11l2.9-5.4a1.7 1.7 0 012.7 1.3V8"/></g>'),
  share: SV('<path d="M4.4 12.6v5.9a1.9 1.9 0 001.9 1.9h11.4a1.9 1.9 0 001.9-1.9v-5.9"/><path d="M12 15.6V3.4M8.2 7.2L12 3.4l3.8 3.8"/>'),
  atom: '<svg class="bic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.4l2.1 5.9 5.9 2.1-5.9 2.1-2.1 5.9-2.1-5.9L4 11.4l5.9-2.1z"/></svg>',
  chev: SV('<path d="M9 5l7 7-7 7"/>', ' class="chev"'),
  stopdot: SV('<circle cx="12" cy="12" r="8"/><path d="M9 9l6 6"/>'),
  pen: SV('<path d="M4.2 19.8h3.2L19 8.2a1.9 1.9 0 000-2.7l-.5-.5a1.9 1.9 0 00-2.7 0L4.2 16.6z"/><path d="M14.6 5.6l3.8 3.8"/>'),
  pin: SV('<path d="M9.4 3.6h5.2l-.7 5 3.6 3.6-7.3.9 2.9 5.1.9-.8-.9-4.4.9-8.5z"/><path d="M5.6 18.4l4.6-4.6"/>'),
  pinOff: SV('<path d="M9.4 3.6h5.2l-.7 5 3.6 3.6-7.3.9 2.9 5.1"/><path d="M3.4 3.4l17.2 17.2"/><path d="M6.4 17.6l-1.4 3"/>'),
  shareArrow: SV('<path d="M13.4 4.2L21 9.6l-7.6 5.4v-3.3c-4.6 0-7.4 1.4-9.8 4.5.9-5.2 3.6-9.1 9.8-9.1z"/>'),
  checklist: SV('<path d="M4.4 7.2h5.2M4.4 12h5.2M4.4 16.8h5.2"/><path d="M11.8 7.2H20M11.8 12H20M11.8 16.8H20"/>'),
  trash: SV('<path d="M4.2 7h15.6M9.6 7V4.9h4.8V7"/><path d="M6.4 7l.8 12.6c0 .9.8 1.6 1.7 1.6h6.2c.9 0 1.7-.7 1.7-1.6L18.4 7"/>'),
  dots: SV('<circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none"/>'),
  check: SV('<path d="M4.6 12.4l4.6 4.6L19.4 6.8"/>'),
  speak: SV('<path d="M4.4 9.6h3.4l4.6-3.8v12.4l-4.6-3.8H4.4z"/><path d="M15.6 8.6a4.6 4.6 0 010 6.8"/><path d="M18.2 6.2a8 8 0 010 11.6"/>'),
  mute: SV('<path d="M4.4 9.6h3.4l4.6-3.8v12.4l-4.6-3.8H4.4z"/><path d="M16 9.4l5 5M21 9.4l-5 5"/>'),
  glb: SV('<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8"/><path d="M12 3.6c2.4 2.4 3.6 5.3 3.6 8.4s-1.2 6-3.6 8.4c-2.4-2.4-3.6-5.3-3.6-8.4S9.6 6 12 3.6z"/>'),
};


function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

let katexLoading = false;
function ensureKatex() {
  if (window.katex || katexLoading) return;
  katexLoading = true;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
  document.head.appendChild(l);
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
  s.onload = function () { if (window.__katexReady) window.__katexReady(); };
  s.onerror = function () { katexLoading = false; };
  document.head.appendChild(s);
}

function renderTex(o) {
  if (window.katex) {
    try {
      const html = katex.renderToString(o.tex, { displayMode: o.d, throwOnError: false, output: 'html' });
      return o.d ? '<div class="katex-block">' + html + '</div>' : html;
    } catch (e) {}
  }
  ensureKatex();
  return '<code class="tex">' + esc(o.tex) + '</code>';
}

function inlineMd(raw) {
  const maths = [], codes = [];
  let s = raw.replace(/\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g,
    function (m, a, b, c, d) {
      maths.push({ tex: (a || b || c || d).trim(), d: !!(a || b || c) });
      return '\u0000M' + (maths.length - 1) + '\u0000';
    });
  s = s.replace(/`([^`]+)`/g, function (m, c) { codes.push(c); return '\u0000K' + (codes.length - 1) + '\u0000'; });
  s = esc(s);
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\\*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\u0000K(\d+)\u0000/g, function (m, i) { return '<code>' + esc(codes[+i]) + '</code>'; });
  s = s.replace(/\u0000M(\d+)\u0000/g, function (m, i) { return renderTex(maths[+i]); });
  return s;
}

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

function buildList(lines, start, indent, d) {
  d = d || 0;
  const firstM = lines[start].match(LIST_RE);
  const ordered = !!(firstM && /\d/.test(firstM[2]));
  const items = [];
  let i = start;
  while (i < lines.length) {
    const m = lines[i].match(LIST_RE);
    if (!m) break;
    const ind = m[1].replace(/\t/g, '  ').length;
    if (ind < indent) break;
    if (ind === indent && /\d/.test(m[2]) !== ordered) {
      if (d === 0 && items.length) {
        const sub = buildList(lines, i, ind, 1);
        items[items.length - 1].sub = (items[items.length - 1].sub || '') + sub.html;
        i = sub.next;
        continue;
      }
      break;
    }
    if (ind > indent && items.length) {
      const sub = buildList(lines, i, ind, d + 1);
      items[items.length - 1].sub = sub.html;
      i = sub.next;
      continue;
    }
    const txt = m[3];
    const next = lines[i + 1];
    if (next && LIST_RE.test(next) && next.match(LIST_RE)[1].replace(/\t/g, '  ').length > ind) {
      const sub = buildList(lines, i + 1, next.match(LIST_RE)[1].replace(/\t/g, '  ').length);
      items.push({ txt: txt, sub: sub.html });
      i = sub.next;
      continue;
    }
    items.push({ txt: txt, sub: '' });
    i++;
  }
  const tag = ordered ? 'ol' : 'ul';
  const html = '<' + tag + '>' + items.map(function (it) {
    return '<li>' + inlineMd(it.txt) + (it.sub || '') + '</li>';
  }).join('') + '</' + tag + '>';
  return { html: html, next: i };
}

function md(text) {
  if (!text) return '';
  const fences = [], lines = String(text).replace(/\r/g, '').split('\n');
  let out = '', i = 0;
  for (let k = 0; k < lines.length; k++) {
    const f = lines[k].match(/^```([^`]*)$/);
    if (f) {
      let body = [], j = k + 1;
      while (j < lines.length && !/^```/.test(lines[j])) { body.push(lines[j]); j++; }
      fences.push({ lang: (f[1] || '').trim(), body: body.join('\n') });
      lines[k] = '\u0000F' + (fences.length - 1) + '\u0000';
      lines.splice(k + 1, j - k);
    }
  }
  while (i < lines.length) {
    const line = lines[i];
    const fm = line.match(/^\u0000F(\d+)\u0000$/);
    if (fm) {
      const f = fences[+fm[1]];
      out += '<div class="codebox"><div class="codehead"><span class="lang">' + esc(f.lang || 'text') +
        '</span><button class="cbtn">复制</button></div><pre class="codepre"><code>' + esc(f.body) + '</code></pre></div>';
      i++; continue;
    }
    if (!line.trim()) { i++; continue; }
    if (/^\s*(?:---|___|\*\*\*)\s*$/.test(line)) { out += '<hr class="md">'; i++; continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { const n = Math.min(h[1].length, 4); out += '<h' + n + '>' + inlineMd(h[2]) + '</h' + n + '>'; i++; continue; }
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out += '<blockquote>' + inlineMd(buf.join('\n')) + '</blockquote>'; continue;
    }
    if (LIST_RE.test(line)) {
      const ind = line.match(LIST_RE)[1].replace(/\t/g, '  ').length;
      const r = buildList(lines, i, ind);
      out += r.html;
      i = (r.next > i) ? r.next : i + 1;
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const head = line.split('|').slice(1, -1).map(function (x) { return x.trim(); });
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i].split('|').slice(1, -1).map(function (x) { return x.trim(); }));
        i++;
      }
      out += '<table class="md"><thead><tr>' + head.map(function (x) { return '<th>' + inlineMd(x) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + rows.map(function (r2) {
          return '<tr>' + r2.map(function (x) { return '<td>' + inlineMd(x) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
      continue;
    }
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^```/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i]) &&
      !LIST_RE.test(lines[i]) && !/^\s*>/.test(lines[i]) && !/^\u0000F/.test(lines[i])) { buf.push(lines[i]); i++; }
    out += '<p>' + buf.map(inlineMd).join('<br>') + '</p>';
  }
  return out;
}
