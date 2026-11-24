

function grpLabel(ts) {
  const d = new Date(ts), now = new Date();
  const key = (x) => x.getFullYear() * 1000 + x.getMonth() * 40 + x.getDate();
  const dd = Math.round((now - d) / 864e5);
  if (key(d) === key(now)) return t('conv.today');
  if (dd === 1) return t('conv.yesterday');
  if (dd < 7) return t('conv.last7');
  if (d.getFullYear() === now.getFullYear()) return t('conv.month', { m: d.getMonth() + 1 });
  return t('conv.year', { y: d.getFullYear(), m: d.getMonth() + 1 });
}

let msMode = false;
let _sel = new Set();

function renderConvs() {
  const list = $('#convList');
  const q = ($('#srch').value || '').trim().toLowerCase();
  let convs = store.convs.slice().sort((a, b) => b.ts - a.ts)
    .filter((c) => !q || (c.title || '').toLowerCase().includes(q));
  if (msMode) {
    $('#msbar').hidden = false;
    $('#msbar').classList.add('on');
  } else {
    $('#msbar').classList.add('on');
    $('#msbar').hidden = true;
    $('#msbar').classList.remove('on');
    _sel.clear();
  }
  $('#msCnt').textContent = t('ms.selected', { n: _sel.size });
  if (!convs.length) {
    list.innerHTML = '<div class="empty">' + (q ? t('conv.nomatch') : t('conv.empty')) + '</div>';
    return;
  }
  const pinned = convs.filter((c) => c.pin);
  const rest = convs.filter((c) => !c.pin);
  let html = '';
  const row = (c) => '<div class="item' + (c.id === store.curId ? ' active' : '') + (msMode ? ' selmode' : '') +
    (_sel.has(c.id) ? ' on' : '') + '" data-id="' + c.id + '">' +
    '<span class="chk">' + ICON.check + '</span>' +
    '<span class="t">' + esc((c.title || t('conv.untitled')).slice(0, 40)) + '</span>' +
    '<button class="more" data-more="' + c.id + '" title="' + t('ui.more') + '">' + ICON.dots + '</button></div>';
  if (pinned.length) {
    html += '<div class="grp"><span>' + t('ui.pin') + '</span></div>';
    pinned.forEach((c) => { html += row(c); });
  }
  let last = '';
  rest.forEach((c) => {
    const g = grpLabel(c.ts);
    if (g !== last) { last = g; html += '<div class="grp"><span>' + g + '</span></div>'; }
    html += row(c);
  });
  list.innerHTML = html;
}


let menuId = null;
function closeConvMenu() { const m = $('#cmenu'); if (m) m.hidden = true; menuId = null; }
function openConvMenu(id, btn) {
  const c = store.convs.find((x) => x.id === id);
  if (!c) return;
  menuId = id;
  const mk = (act, icon, label, cls) =>
    '<button class="mi' + (cls || '') + '" data-m="' + act + '">' + ICON[icon] + '<span>' + label + '</span></button>';
  const m = $('#cmenu');
  m.innerHTML =
    mk('rename', 'pen', t('ui.rename')) +
    (c.pin ? mk('pin', 'pinOff', t('ui.unpin')) : mk('pin', 'pin', t('ui.pin'))) +
    mk('share', 'shareArrow', t('ui.share')) +
    mk('multi', 'checklist', t('ui.multi')) +
    mk('del', 'trash', t('ms.del'), ' danger');
  m.hidden = false;
  const r = btn.getBoundingClientRect();
  const w = m.offsetWidth, h = m.offsetHeight;
  let left = r.right - w - 6;
  let top = r.bottom + 8;
  if (left < 8) left = 8;
  if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 8);
  m.style.left = Math.round(left) + 'px';
  m.style.top = Math.round(top) + 'px';
  m.onclick = (ev) => {
    const b = ev.target.closest('[data-m]');
    if (!b) return;
    const act = b.getAttribute('data-m');
    const id2 = menuId;
    const conv = store.convs.find((x) => x.id === id2);
    closeConvMenu();
    if (!conv) return;
    if (act === 'rename') {
      const nm = prompt(t('ui.renameQ'), conv.title || t('conv.untitled'));
      if (nm && nm.trim()) { conv.title = nm.trim().slice(0, 60); save(); renderConvs(); renderTop(); }
    } else if (act === 'pin') {
      conv.pin = !conv.pin; save(); renderConvs();
    } else if (act === 'share') {
      copyText(convShareText(conv));
      toast(t('ui.copied'));
    } else if (act === 'multi') {
      msMode = true; _sel.clear(); renderConvs();
    } else if (act === 'del') {
      store.convs = store.convs.filter((x) => x.id !== id2);
      if (store.curId === id2) store.curId = store.convs.length ? store.convs[0].id : null;
      if (_sel.has(id2)) _sel.delete(id2);
      save(); renderConvs(); renderChat(); renderTop();
    }
  };
}

function convShareText(c) {
  return '# ' + (c.title || t('conv.untitled')) + '\n\n' +
    c.messages.map((m) => (m.role === 'user' ? t('ui.me') + ': ' : 'Orion: ') + (m.content || '')).join('\n\n');
}

function toast(t) {
  const f = $('.foot');
  if (!f) return;
  if (!f.dataset.orig) f.dataset.orig = f.textContent;
  f.textContent = t; f.style.color = 'var(--accent)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { f.textContent = f.dataset.orig; f.style.color = ''; }, 2000);
}

function renderTop() {
  const c = cur();
  const ttl = c ? (c.title || (c.kind === 'task' ? t('nav.newTask') : t('nav.newChat'))) : t('nav.newChat');
  if ($('#topTitle')) $('#topTitle').textContent = ttl;
  if ($('#chatTitle')) $('#chatTitle').textContent = ttl;
  $('#thinkPill').classList.toggle('on', store.model === 'deepseek-reasoner');
}

function fmtSize(n) {
  if (typeof n !== 'number' || !isFinite(n)) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n < 10240 ? (n / 1024).toFixed(1) : Math.round(n / 1024)) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function attChip(a, removable, idx) {
  const el = document.createElement('div');
  el.className = 'chip hoverable';
  const cv = document.createElement('div');
  cv.className = 'cv';
  if (a.kind === 'image' && a.url) {
    const im = document.createElement('img');
    im.src = a.url;
    im.alt = a.name || t('ui.img');
    cv.appendChild(im);
  } else {
    const dt = document.createElement('div');
    dt.className = 'dt';
    const dn = document.createElement('div');
    dn.className = 'dn';
    dn.textContent = a.name || t('ui.file');
    dt.appendChild(dn);
    if (a.preview) {
      const dp = document.createElement('div');
      dp.className = 'dp';
      dp.textContent = a.preview;
      dt.appendChild(dp);
    }
    const dm = document.createElement('div');
    dm.className = 'dm';
    dm.textContent = (a.ext ? a.ext.toUpperCase() : t('ui.file')) + (a.size ? ' ' + fmtSize(a.size) : '');
    dt.appendChild(dm);
    cv.appendChild(dt);
  }
  el.appendChild(cv);
  if (removable) {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'cx';
    x.title = t('ui.remove');
    x.setAttribute('data-x', String(idx));
    x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    el.appendChild(x);
  }
  return el;
}

function userNode(m) {
  const el = document.createElement('div');
  el.className = 'msg user';
  const wrap = document.createElement('div');
  wrap.className = 'uwrap';
  if (m.atts && m.atts.length) {
    const box = document.createElement('div');
    box.className = 'umatts';
    m.atts.forEach((a) => box.appendChild(attChip(a, false)));
    wrap.appendChild(box);
  }
  if (m.content) {
    const b = document.createElement('div');
    b.className = 'bub';
    b.textContent = m.content;
    wrap.appendChild(b);
  }
  el.appendChild(wrap);
  const av = document.createElement('span');
  av.className = 'av';
  av.textContent = t('ui.me');
  el.appendChild(av);
  return el;
}

function aiNode(m) {
  const el = document.createElement('div');
  el.className = 'msg ai';
  el.innerHTML = '<div class="ai-body"></div>' +
    '<div class="acts" hidden>' +
    '<button class="act" data-act="copy" title="' + t('gen.copy') + '">' + ICON.copy + '</button>' +
    '<button class="act" data-act="speak" title="' + t('ui.speak') + '">' + ICON.speak + '</button>' +
    '<button class="act" data-act="regen" title="' + t('ui.regen') + '">' + ICON.regen + '</button>' +
    '<button class="act" data-act="up" title="' + t('ui.up') + '">' + ICON.up + '</button>' +
    '<button class="act" data-act="down" title="' + t('ui.down') + '">' + ICON.down + '</button>' +
    '<button class="act" data-act="share" title="' + t('ui.shareFull') + '">' + ICON.share + '</button>' +
    '<span class="umeta"></span></div>';
  fillAI(el, m, false);
  return el;
}

function fillAI(el, m, streaming) {
  const box = el.querySelector('.ai-body');
  const hasR = !!(m.reasoning && m.reasoning.length);
  let think = el.querySelector('.think');
  if (hasR && !think) {
    think = document.createElement('details');
    think.className = 'think';
    think.open = true;
    think.innerHTML = '<summary>' + ICON.atom + '<span class="stxt"></span><span class="spin"></span>' + ICON.chev +
      '</summary><div class="tb"></div>';
    el.insertBefore(think, box);
  }
  if (think) {
    const secs = Math.max(1, m.elapsed || 0);
    const st = think.querySelector('.stxt');
    if (streaming && !m.content) {
      st.textContent = t('ui.thinkNow');
      think.classList.add('running');
      think.open = true;
    } else {
      st.textContent = t('ui.thoughtDone', { s: secs });
      think.classList.remove('running');
      if (m.content) think.open = false;
    }
    think.querySelector('.tb').innerHTML = md(m.reasoning || '');
  }
  let wc = el.querySelector('.wchip');
  if (m.webList && m.webList.length && !wc) {
    wc = document.createElement('button');
    wc.className = 'wchip';
    wc.innerHTML = ICON.glb +
      '<span>' + t('src.found', { n: m.webList.length }) + '</span>' + ICON.chev;
    wc.addEventListener('click', () => openSrcPanel(m.webList, wc));
    el.insertBefore(wc, box);
  }
  box.innerHTML = md(m.content || '') + (streaming ? '<span class="caret"></span>' : '');

  if (m.stopped && !el.querySelector('.chipstop')) {
    const cs = document.createElement('div');
    cs.className = 'chipstop';
    cs.innerHTML = ICON.stopdot + t('ui.stopped');
    el.insertBefore(cs, el.querySelector('.think') || box);
  }
  if (!streaming) {
    el.querySelector('.acts').hidden = false;
    const um = el.querySelector('.umeta');
    if (m.usage) {
      um.textContent = (m.elapsed ? m.elapsed + 's · ' : '') + (m.usage.prompt_tokens || 0) + ' in / ' + (m.usage.completion_tokens || 0) + ' out';
    } else if (m.elapsed) {
      um.textContent = t('ui.elapsed', { s: m.elapsed });
    }
  }
}

function scrollBottom(force) {
  const c = $('#chat');
  if (!c || c.style.display === 'none') return;
  const near = c.scrollHeight - c.scrollTop - c.clientHeight < 140;
  if (force || near) c.scrollTop = c.scrollHeight;
}

function renderChat() {
  const c = cur();
  if (typeof isWorkConv === 'function' && isWorkConv(c)) {
    showWorkView();
    return;
  }
  if (typeof hideWorkView === 'function') hideWorkView();
  const wrap = $('#msgWrap');
  wrap.innerHTML = '';
  const empty = !c || !c.messages.length;
  $('#hero').style.display = empty ? 'flex' : 'none';
  $('#chat').style.display = empty ? 'none' : 'block';
  $('.main').classList.toggle('empty', empty);
  if (!empty) {
    c.messages.forEach((m) => wrap.appendChild(m.role === 'user' ? userNode(m) : aiNode(m)));
  }
  scrollBottom(true);
}


function fmtTok(n) {
  if (!isFinite(n) || n <= 0) return '0';
  var cjk = (LANG === 'zh' || LANG === 'zh-TW' || LANG === 'ja' || LANG === 'ko');
  if (cjk) {
    if (n >= 1e8) return (n / 1e8).toFixed(2) + ' ' + (LANG === 'ko' ? '억' : (LANG === 'ja' ? '億' : '亿'));
    if (n >= 1e4) return (n / 1e4 >= 100 ? Math.round(n / 1e4) : (n / 1e4).toFixed(1)) + ' ' + (LANG === 'ko' ? '만' : '万');
  } else {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  }
  return Math.round(n).toLocaleString('en-US');
}
function tokenOf(yuan) { return (Math.max(0, yuan) / store.rate) * 1e6; }

function fmtTime(ts) {
  const d = new Date(ts), now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  if (d.toDateString() === now.toDateString()) return p(d.getHours()) + ':' + p(d.getMinutes());
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function renderQuota() {
  const b = store.balance || 0;
  const txt = t('tk.approx', { n: fmtTok(tokenOf(b)) });
  $('#qMoney').textContent = '¥ ' + b.toFixed(2);
  $('#qTok').textContent = txt;
  $('#qTok').title = Math.round(tokenOf(b)).toLocaleString('en-US') + ' tokens';
  if ($('#balNum')) $('#balNum').textContent = b.toFixed(2);
  if ($('#balTok')) $('#balTok').textContent = txt;
  if ($('#balTime')) $('#balTime').textContent = store.balTs ? t('tk.updated', { t: fmtTime(store.balTs) }) : t('tk.notSync');
  const info = store.balInfo;
  if (info) $('#apiBtn').title = t('tk.balTitle', { a: (info.topped || 0).toFixed(2), b: (info.granted || 0).toFixed(2) });
}


async function fetchBalance(silent) {
  const st = $('#balState'), btn = $('#balSyncBtn');
  const key = (store.key || '').trim();
  if (!key) {
    if (st) { st.style.color = 'var(--muted)'; st.textContent = t('bal.nokey'); }
    return null;
  }
  if (st) { st.style.color = 'var(--muted)'; st.textContent = t('tk.syncing'); }
  if (btn) btn.disabled = true;
  try {
    const base = (store.base || 'https://api.deepseek.com').replace(/\/+$/, '');
    const res = await fetch(base + '/user/balance', { headers: { Authorization: 'Bearer ' + key } });
    if (!res.ok) throw new Error(res.status === 401 ? t('ui.keyInvalid') : 'HTTP ' + res.status);
    const j = await res.json();
    const arr = j.balance_infos || [];
    const info = arr.find((x) => x.currency === 'CNY') || arr[0];
    if (!info) throw new Error(t('ui.noBal'));
    const bal = parseFloat(info.total_balance);
    if (!isFinite(bal)) throw new Error(t('ui.balField'));
    store.balance = bal;
    store.balInfo = {
      granted: parseFloat(info.granted_balance || 0) || 0,
      topped: parseFloat(info.topped_up_balance || 0) || 0,
      currency: info.currency || 'CNY',
    };
    store.balTs = Date.now();
    save(); renderQuota();
    if (st) { st.style.color = 'var(--accent)'; st.textContent = t('tk.synced', { t: fmtTime(store.balTs) }); }
    return bal;
  } catch (e) {
    if (st) { st.style.color = '#e5484d'; st.textContent = t('tk.syncFail', { m: e.message || t('err.net') }); }
    return null;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function spend(usage) {
  if (!usage) return;
  const t = usage.total_tokens || ((usage.input_tokens || 0) + (usage.output_tokens || 0)) ||
    (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  if (!t) return;
  store.spent = (store.spent || 0) + (t / 1e6) * store.rate;
  save();
  fetchBalance(true);
}


function applyTheme() {
  const dark = store.theme === 'dark' ||
    (store.theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}


function switchPane(name) {
  $$('.nav').forEach((b) => b.classList.toggle('on', b.dataset.pane === name));
  $$('.pane').forEach((p) => p.classList.toggle('on', p.id === 'pane' + name.charAt(0).toUpperCase() + name.slice(1)));
}
function openSettings(tip, pane) {
  $('#keyInput').value = store.key || '';
  $('#baseInput').value = store.base || 'https://api.deepseek.com';
  $('#modelSel').value = store.model || 'deepseek-chat';
  if ($('#langSel')) $('#langSel').value = I18N[store.lang] ? store.lang : 'zh';
  if ($('#ctxSel')) $('#ctxSel').value = String(typeof store.ctx === 'number' ? store.ctx : 12);
  $('#rateInput').value = store.rate;
  $$('.tc').forEach((b) => b.classList.toggle('on', b.dataset.themeVal === store.theme));
  const el = $('#testState');
  el.textContent = tip || '';
  el.style.color = tip ? '#e5484d' : 'var(--muted)';
  switchPane(pane || 'token');
  $('#mask').classList.add('on');
  if ((pane || 'token') === 'token') fetchBalance(true);
}
function closeSettings() { $('#mask').classList.remove('on'); }

function copyText(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).catch(() => { fallbackCopy(t); });
  } else fallbackCopy(t);
}
function fallbackCopy(t) {
  const ta = document.createElement('textarea');
  ta.value = t;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  ta.remove();
}


let agExpanded = {};
let agWork = 'workspace';

function agStatus(r) {
  const map = { running: [t('st.run'), 'run'], done: [t('st.done'), 'done'], failed: [t('st.fail'), 'err'], stopped: [t('st.stop'), 'err'], pending: [t('st.wait'), ''] };
  return map[r.status] || [t('st.wait'), ''];
}
function agBadge() {
  const n = store.tasks.filter((t) => t.status === 'running' || t.status === 'pending').length;
  const b = $('#taskBadge');
  if (!b) return;
  b.hidden = n === 0;
  b.textContent = n > 99 ? '99+' : String(n);
}
function agTime(ts) {
  const d = new Date(ts), now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  if (d.toDateString() === now.toDateString()) return p(d.getHours()) + ':' + p(d.getMinutes());
  if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
}
function agStepHTML(s) {
  const k = s.kind === 'think' ? t('k.think') : s.kind === 'tool' ? t('k.tool') : s.kind === 'obs' ? t('k.obs') : s.kind === 'err' ? t('k.err') : s.kind === 'final' ? t('k.final') : t('k.info');
  const cls = s.kind === 'obs' ? '' : s.kind;
  let v = esc(s.text || '');
  if (s.kind === 'tool' || s.kind === 'obs' || s.kind === 'err') v = '<pre>' + v + '</pre>';
  else v = '<span>' + v + '</span>';
  if (s.image) v += '<img class="thumb" src="' + s.image + '" alt="' + t('tool.screenshot') + '">';
  return '<div class="agstep ' + cls + '"><span class="k">' + k + '</span><div class="v">' + v + '</div></div>';
}
function renderTasks() {
  const list = $('#agList');
  if (!list) return;
  const runs = store.tasks.slice().sort((a, b) => b.ts - a.ts);
  const running = runs.filter((r) => r.status === 'running').length;
  $('#taskStat').textContent = running ? t('ag.runN', { n: running }) : '';
  $('#taskSum').textContent = runs.length ? t('ag.sumN', { n: runs.length, d: runs.filter((r) => r.status === 'done').length }) : t('nav.newTask');
  agBadge();
  if (!runs.length) {
    list.innerHTML = '<div class="agemit">' + t('ag.empty') + '</div>';
    if (typeof renderWorkList === 'function') renderWorkList();
    return;
  }
  list.innerHTML = runs.map((r) => {
    const [label, cls] = agStatus(r);
    const open = !!agExpanded[r.id] || r.status === 'running';
    const body = open ? ('<div class="agbody">' +
      (r.steps || []).map(agStepHTML).join('') +
      (r.status === 'running' ? '<div class="agrow"><span class="sp"></span><button class="btn ghost sm" data-ag="stop" data-id="' + r.id + '">' + t('ag.stop') + '</button></div>' : '') +
      '</div>') : '';
    return '<div class="agcard' + (r.status === 'running' ? ' run' : '') + '" data-id="' + r.id + '">' +
      '<div class="aghead" data-ag="toggle" data-id="' + r.id + '">' +
      '<span class="agst ' + cls + '">' + label + '</span>' +
      '<span class="aggoal">' + esc(r.goal || '') + '</span>' +
      '<span class="agtime">' + agTime(r.ts) + '</span>' +
      '<button class="agx" data-ag="del" data-id="' + r.id + '" title="' + t('ms.del') + '">' + ICON.trash + '</button>' +
      '</div>' + body + '</div>';
  }).join('');
  if (typeof renderWorkList === 'function') renderWorkList();
}
function taskOpen() {
  $('#taskMask').classList.add('on');
  renderTasks();
  setTimeout(() => { const g = $('#agGoal'); if (g && !g.value) g.focus(); }, 60);
}
function taskClose() { $('#taskMask').classList.remove('on'); }
function agDelete(id) {
  const r = store.tasks.find((x) => x.id === id);
  if (r && r.status === 'running' && window.orion) window.orion.abort(id);
  store.tasks = store.tasks.filter((x) => x.id !== id);
  save(); renderTasks();
}
function agStop(id) {
  const r = store.tasks.find((x) => x.id === id);
  if (!r) return;
  r.stopped = true;
  if (window.orion) window.orion.abort(id);
  save(); renderTasks();
}
