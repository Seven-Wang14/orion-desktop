

function errText(status, body) {
  let detail = '';
  try { const j = JSON.parse(body); detail = (j.error && (j.error.message || j.error.code)) || ''; }
  catch (e) { detail = String(body || '').slice(0, 160); }
  if (status === 401) return 'API Key 无效或已失效（401）' + (detail ? '：' + detail : '');
  if (status === 402) return '余额不足（402）' + (detail ? '：' + detail : '') + '，去开放平台充值后回来更新余额';
  if (status === 422) return '请求参数有误（422）' + (detail ? '：' + detail : '');
  if (status === 429) return '请求过于频繁，稍后再试（429）';
  return '请求失败（' + status + '）' + (detail ? '：' + detail : '');
}

function setBusy(on) {
  busy.on = on;
  $('#sendBtn').disabled = on;
  $('#stopBtn').hidden = !on;
  $('#sendBtn').style.display = on ? 'none' : 'flex';
  $('#input').disabled = on;
}

function autoHeight() {
  const t = $('#input');
  const has = t.value.trim().length > 0 || atts.length > 0;
  t.style.height = '0px';
  const h = has && t.clientWidth ? t.scrollHeight : 26;
  t.style.height = Math.min(Math.max(h, 26), 200) + 'px';
  t.style.overflowY = h > 200 ? 'auto' : 'hidden';
  $('#sendBtn').classList.toggle('ready', has);
  $('#sendBtn').disabled = busy.on;
}
addEventListener('resize', () => autoHeight());


var atts = [];
var MAX_ATT = 8, MAX_BYTES = 20 * 1024 * 1024;
var TEXT_EXT = ['txt', 'md', 'markdown', 'csv', 'json', 'log', 'yml', 'yaml', 'ini', 'js', 'ts', 'py', 'java', 'c', 'cpp', 'html', 'css', 'xml', 'sql'];
var FILE_OCR_EXT = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff'];

var ocrCache = {}, webCache = {};
var ATT_TEXT_MAX = 6000, WEB_TEXT_MAX = 5000;

function readFileText(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result || '').slice(0, ATT_TEXT_MAX));
    fr.onerror = () => rej(new Error('读取失败'));
    try { fr.readAsText(file); } catch (e) { rej(e); }
  });
}

function renderAtts() {
  const box = $('#chips');
  box.innerHTML = '';
  atts.forEach((a, i) => box.appendChild(attChip(a, true, i)));
}

function readImage(file) {
  return new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
        const draw = (max, q) => {
          const s = Math.min(1, max / Math.max(w, h));
          const cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
          const cv = document.createElement('canvas');
          cv.width = cw; cv.height = ch;
          const cx = cv.getContext('2d');
          cx.fillStyle = '#fff';
          cx.fillRect(0, 0, cw, ch);
          cx.drawImage(img, 0, 0, cw, ch);
          try { return cv.toDataURL('image/jpeg', q); } catch (e) { return ''; }
        };
        const thumb = draw(300, .74) || fr.result;
        const full = draw(1600, .86) || thumb;
        res({ thumb: thumb, full: full });
      };
      img.onerror = () => res({ thumb: fr.result, full: fr.result });
      img.src = fr.result;
    };
    fr.onerror = () => res({ thumb: '', full: '' });
    fr.readAsDataURL(file);
  });
}


function apiBase() { return (store.base || 'https://api.deepseek.com').replace(/\/+$/, ''); }

async function ocrAttach(a) {
  const fd = new FormData();
  fd.append('purpose', 'text_recognition');
  const f = a.file || a.blob;
  if (f) fd.append('file', f, a.name || 'file');
  else {
    const bl = await (await fetch(a.full || a.url)).blob();
    fd.append('file', bl, a.name || 'image.jpg');
  }
  const res = await fetch(apiBase() + '/v1/tools/ocr', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + store.key },
    body: fd,
  });
  const body = await res.text();
  if (!res.ok) throw new Error(errText(res.status, body));
  let j;
  try { j = JSON.parse(body); } catch (e) { throw new Error('识别结果解析失败'); }
  if (j.error) throw new Error(j.error.message || '识别失败');
  if (j.usage) spend(j.usage);
  const txt = (j.pages || []).map((p) => p.text || '').join('\n\n').trim();
  return txt.replace(/<｜[^｜]*｜>/g, '');
}


async function webSearch(q) {
  const res = await fetch(apiBase() + '/v1/tools/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + store.key },
    body: JSON.stringify({ query: q.slice(0, 128), ori_question: q.slice(0, 128), count: 5, need_content: false }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(errText(res.status, body));
  const j = JSON.parse(body);
  const rs = (j.results || []).filter((r) => r && r.title);
  if (!rs.length) return '';
  return rs.map((r, i) => {
    const d = r.date ? String(r.date).slice(0, 10) : '';
    return (i + 1) + '. ' + r.title + (d ? '（' + d + '）' : '') + '\n' + (r.summary || r.snippet || '') + '\n来源：' + r.url;
  }).join('\n\n');
}


var tts = { a: null, btn: null, url: '' };
function plainText(md) {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[#>*\-+]\s*/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function speak(text, btn) {
  if (tts.btn === btn && tts.a && !tts.a.paused) {
    tts.a.pause();
    tts.a = null;
    btn.classList.remove('on');
    btn.innerHTML = ICON.speak;
    return;
  }
  if (tts.a) { tts.a.pause(); tts.a = null; }
  const t = plainText(text).slice(0, 9500);
  if (!t) return;
  toast('正在合成语音…');
  try {
    const res = await fetch(apiBase() + '/v1/tools/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + store.key },
      body: JSON.stringify({ text: t, voice_id: store.voice || 'stella', format: 'wav', filter_markdown: true }),
    });
    if (!res.ok) throw new Error(errText(res.status, await res.text()));
    const blob = await res.blob();
    if (tts.url) URL.revokeObjectURL(tts.url);
    tts.url = URL.createObjectURL(blob);
    const a = new Audio(tts.url);
    tts.a = a; tts.btn = btn;
    btn.classList.add('on');
    btn.innerHTML = ICON.mute;
    a.onended = () => { btn.classList.remove('on'); btn.innerHTML = ICON.speak; tts.a = null; };
    await a.play();
  } catch (e) {
    toast('朗读失败：' + ((e && e.message) || '网络错误'));
  }
}


var recState = { mr: null, chunks: [], stream: null, auto: 0 };

async function toWav16k(blob) {
  const ab = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ctx.decodeAudioData(ab);
  if (ctx.close) ctx.close();
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(buf.duration * rate)), rate);
  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start(0);
  const rendered = await off.startRendering();
  const data = rendered.getChannelData(0);
  const n = data.length;
  const arr = new ArrayBuffer(44 + n * 2);
  const v = new DataView(arr);
  const put = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  put(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); put(8, 'WAVE'); put(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  put(36, 'data'); v.setUint32(40, n * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }
  return new File([arr], 'speech.wav', { type: 'audio/wav' });
}

function micUI(on) {
  const b = $('#micBtn');
  if (!b) return;
  b.classList.toggle('rec', !!on);
  b.title = on ? '停止录音' : '语音输入';
}

async function toggleRec() {
  if (recState.mr) { recState.mr.stop(); return; }
  if (!store.key) { openSettings('先填 API Key 再用语音', 'general'); return; }
  try {
    const st = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(st);
    recState.stream = st; recState.chunks = []; recState.mr = mr;
    mr.ondataavailable = (e) => { if (e.data && e.data.size) recState.chunks.push(e.data); };
    mr.onstop = async () => {
      clearTimeout(recState.auto);
      recState.mr = null;
      if (recState.stream) recState.stream.getTracks().forEach((t) => t.stop());
      recState.stream = null;
      micUI(false);
      const blob = new Blob(recState.chunks, { type: 'audio/webm' });
      recState.chunks = [];
      if (blob.size < 1500) return;
      toast('正在识别语音…');
      try {
        const wav = await toWav16k(blob);
        if (wav.size > 8 * 1024 * 1024) throw new Error('录音太长，8MB 以内');
        const fd = new FormData();
        fd.append('file', wav, 'speech.wav');
        const res = await fetch(apiBase() + '/v1/tools/asr', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + store.key },
          body: fd,
        });
        const body = await res.text();
        if (!res.ok) throw new Error(errText(res.status, body));
        const j = JSON.parse(body);
        const t = String(j.text || '').trim();
        if (!t) { toast('没听清楚，再说一次'); return; }
        const inp = $('#input');
        inp.value = inp.value.trim() ? inp.value.replace(/\s+$/, '') + ' ' + t : t;
        autoHeight();
        inp.focus();
      } catch (e) {
        toast('语音识别失败：' + ((e && e.message) || '网络错误'));
      }
    };
    mr.start();
    micUI(true);
    recState.auto = setTimeout(() => { if (recState.mr) recState.mr.stop(); }, 118000);
  } catch (e) {
    toast('打不开麦克风：' + ((e && e.message) || '检查系统权限'));
    micUI(false);
  }
}

function readTextPreview(file) {
  return new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result || '').replace(/\s+/g, ' ').trim().slice(0, 90));
    fr.onerror = () => res('');
    try { fr.readAsText(file.slice(0, 1024 * 1024)); } catch (e) { res(''); }
  });
}

async function addFiles(list) {
  const files = Array.from(list || []);
  for (const f of files) {
    if (!f) continue;
    if (atts.length >= MAX_ATT) { toast('最多带 ' + MAX_ATT + ' 个附件'); break; }
    if (f.size > MAX_BYTES) { toast((f.name || '文件') + ' 超过 20MB'); continue; }
    const ext = ((f.name || '').split('.').pop() || '').toLowerCase();
    if (/^image\//.test(f.type || '')) {
      const r = await readImage(f);
      if (r.thumb) atts.push({ kind: 'image', name: f.name || '图片', ext: ext || 'png', size: f.size, url: r.thumb, full: r.full, file: f });
    } else {
      const a = { kind: 'file', name: f.name || '文件', ext: ext, size: f.size, file: f };
      if (TEXT_EXT.indexOf(ext) >= 0) a.preview = await readTextPreview(f);
      atts.push(a);
    }
    renderAtts();
  }
  autoHeight();
}

async function send(text, opts) {
  text = (text || '').trim();
  if (text.length > 20000) {
    text = text.slice(0, 20000);
    toast('输入太长，已截断到 2 万字再发送');
  }
  if ((!text && !atts.length) || busy.on) return;
  if (!store.key) { openSettings('先填 API Key 再发消息', 'general'); return; }
  showChatV();

  const reuse = !!(opts && opts.reuse);
  const sending = reuse ? [] : atts.slice();

  
  let attachText = '', ocrErr = '', webText = '';
  const docs = sending.filter((a) => a.kind === 'image' || FILE_OCR_EXT.indexOf(a.ext) >= 0);
  const texts = sending.filter((a) => a.kind === 'file' && TEXT_EXT.indexOf(a.ext) >= 0);
  if (sending.length) {
    setBusy(true);
    for (const a of texts) {
      try {
        const t = await readFileText(a.file);
        if (t) attachText += (attachText ? '\n\n' : '') + '【' + a.name + '】\n' + t;
      } catch (e) {}
    }
    if (docs.length) {
      toast('正在识别附件文字…');
      for (const a of docs) {
        try {
          const ck = (a.name || '') + '|' + (a.size || 0) + '|' + ((a.file && a.file.lastModified) || 0);
          let t = ocrCache[ck];
          if (t == null) { t = await ocrAttach(a); ocrCache[ck] = t || ''; }
          if (t) {
            const cut = t.length > ATT_TEXT_MAX ? t.slice(0, ATT_TEXT_MAX) + '\n…（内容过长，后面已截断）' : t;
            attachText += (attachText ? '\n\n' : '') + '【' + (a.name || '附件') + '】\n' + cut;
          }
        } catch (e) { ocrErr = (e && e.message) ? e.message : String(e); }
      }
    }
    setBusy(false);
    if (!attachText && !text) {
      toast('附件识别失败：' + (ocrErr || '没取到文字'));
      return;
    }
    if (ocrErr) toast('附件识别失败：' + ocrErr);
  }
  if (store.web && text) {
    setBusy(true);
    toast('正在联网搜索…');
    try {
      const qk = text.slice(0, 128);
      if (webCache[qk] == null) webCache[qk] = await webSearch(text);
      webText = String(webCache[qk] || '');
      if (webText.length > WEB_TEXT_MAX) webText = webText.slice(0, WEB_TEXT_MAX) + '\n…（更多结果已省略）';
    } catch (e) { toast('联网搜索失败：' + ((e && e.message) || '网络错误')); }
    setBusy(false);
  }

  const conv = ensureConv();
  if (!reuse) {
    atts = [];
    renderAtts();
    const keep = sending.map((a) => ({ kind: a.kind, name: a.name, ext: a.ext, size: a.size, url: a.url, preview: a.preview }));
    const um = { role: 'user', content: text };
    if (keep.length) um.atts = keep;
    if (attachText) um.ocr = attachText;
    if (webText) um.web = webText;
    conv.messages.push(um);
    const t0 = text || (sending[0] && sending[0].name) || '新对话';
    if (conv.title === '新对话' || !conv.title) conv.title = t0.replace(/\s+/g, ' ').slice(0, 26);
  }
  conv.ts = Date.now();
  const am = { role: 'assistant', content: '', reasoning: '', usage: null, elapsed: 0, t0: Date.now() };
  conv.messages.push(am);
  $('#input').value = '';
  autoHeight();
  if ($('#sendBtn')) $('#sendBtn').disabled = true;
  save(); renderConvs(); renderTop(); renderChat();

  const node = $('#msgWrap').lastElementChild;
  setBusy(true);

  
  const CTX_CHARS = 24000;
  const rounds = typeof store.ctx === 'number' && store.ctx > 0 ? store.ctx : 0;
  let src = conv.messages.slice(0, -1);
  if (rounds) src = src.slice(-(rounds * 2));
  const rev = [];
  let used = 0;
  for (let i = src.length - 1; i >= 0; i--) {
    const m = src[i];
    let c = (m.content || '').trim();
    if (m.ocr) c = (c ? c + '\n\n' : '') + '【附件文字内容】\n' + m.ocr;
    if (m.web) c = (c ? c + '\n\n' : '') + '【联网搜索结果】\n' + m.web;
    if (!c && m.atts && m.atts.length) c = '（附件：' + m.atts.map((a) => a.name).join('、') + '）';
    if (!c) continue;
    if (used + c.length > CTX_CHARS && rev.length) break;
    rev.push({ role: m.role, content: c });
    used += c.length;
  }
  const history = rev.reverse();

  let buf = '', reason = '', sse = '', usage = null, raf = 0;
  const paint = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      am.content = buf; am.reasoning = reason;
      am.elapsed = Math.round((Date.now() - am.t0) / 1000);
      fillAI(node, am, true);
      scrollBottom();
    });
  };

  try {
    const ctrl = new AbortController();
    busy.ctrl = ctrl;
    const url = (store.base || 'https://api.deepseek.com').replace(/\/+$/, '') + '/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + store.key },
      body: JSON.stringify({
        model: store.model,
        messages: history,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) throw new Error(errText(res.status, res.body ? await res.text() : ''));

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let finished = false;
    while (!finished) {
      const r = await reader.read();
      if (r.done) break;
      sse += dec.decode(r.value, { stream: true });
      const parts = sse.split('\n\n');
      sse = parts.pop() || '';
      for (const part of parts) {
        const line = part.split('\n').find((l) => l.indexOf('data:') === 0);
        if (!line) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') { finished = true; break; }
        try {
          const j = JSON.parse(data);
          const d = j.choices && j.choices[0] && j.choices[0].delta;
          if (d) {
            if (d.reasoning_content) { reason += d.reasoning_content; paint(); }
            if (d.content) { buf += d.content; paint(); }
          }
          if (j.usage) usage = j.usage;
        } catch (e) {}
      }
    }

    am.content = buf; am.reasoning = reason; am.usage = usage;
    am.elapsed = Math.round((Date.now() - am.t0) / 1000);
    if (usage) spend(usage);
    if (!buf && !reason) am.content = '（模型没有返回内容，请稍后重试）';
    conv.ts = Date.now();
    save(); renderConvs(); renderChat(); scrollBottom(true);
  } catch (e) {
    am.content = buf; am.reasoning = reason;
    am.elapsed = Math.round((Date.now() - am.t0) / 1000);
    if (e && e.name === 'AbortError') {
      am.stopped = true;
      am.content = buf || '';
      if (!buf) am.content = '';
    } else if (e instanceof TypeError) {
      am.content = buf + (buf ? '\n\n' : '') + '> 网络请求失败：检查网络，或浏览器拦截了跨域请求。';
    } else {
      am.content = buf + (buf ? '\n\n' : '') + '> ' + (e.message || e);
    }
    save(); renderChat(); scrollBottom(true);
  } finally {
    setBusy(false);
    busy.ctrl = null;
    autoHeight();
    $('#input').focus();
  }
}

function regen(idx) {
  const c = cur();
  if (!c || busy.on) return;
  let u = -1;
  for (let i = Math.min(idx, c.messages.length - 1); i >= 0; i--) {
    if (c.messages[i].role === 'user') { u = i; break; }
  }
  if (u < 0) return;
  c.messages = c.messages.slice(0, u + 1);
  save(); renderChat(); renderTop();
  send(c.messages[u].content, { reuse: true });
}


$('#input').addEventListener('input', function () {
  autoHeight();
  var s = $('#sendBtn');
  if (s) s.disabled = !$('#input').value.trim();
});
$('#input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send($('#input').value); }
});
$('#sendBtn').addEventListener('click', () => send($('#input').value));
$('#stopBtn').addEventListener('click', () => { if (busy.ctrl) busy.ctrl.abort(); });


$('#micBtn').addEventListener('click', toggleRec);
$('#webPill').addEventListener('click', () => {
  store.web = !store.web;
  save();
  $('#webPill').classList.toggle('on', !!store.web);
});
$('#attBtn').addEventListener('click', () => $('#fileIn').click());
$('#fileIn').addEventListener('change', (e) => {
  addFiles(e.target.files);
  e.target.value = '';
});
$('#chips').addEventListener('click', (e) => {
  const x = e.target.closest('[data-x]');
  if (!x) return;
  const i = parseInt(x.getAttribute('data-x'), 10);
  if (i >= 0 && i < atts.length) { atts.splice(i, 1); renderAtts(); autoHeight(); }
});
document.addEventListener('paste', (e) => {
  const cd = e.clipboardData;
  if (!cd) return;
  const items = Array.from(cd.items || []).filter((it) => it.kind === 'file' && /^image\//.test(it.type || ''));
  if (!items.length) return;
  e.preventDefault();
  addFiles(items.map((it) => it.getAsFile()).filter(Boolean));
});
['dragenter', 'dragover'].forEach((ev) => {
  $('#input').addEventListener(ev, (e) => { e.preventDefault(); });
});
$('#input').addEventListener('drop', (e) => {
  if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
  e.preventDefault();
  addFiles(e.dataTransfer.files);
});

$('#newChatBtn').addEventListener('click', () => {
  store.curId = null;
  save(); renderConvs(); renderChat(); renderTop();
  showChatV();
  $('#input').focus();
});

$('#convList').addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) {
    const id = del.getAttribute('data-del');
    store.convs = store.convs.filter((c) => c.id !== id);
    if (store.curId === id) store.curId = store.convs.length ? store.convs[0].id : null;
    save(); renderConvs(); renderChat(); renderTop();
    return;
  }
  const more = e.target.closest('[data-more]');
  if (more) { e.stopPropagation(); openConvMenu(more.getAttribute('data-more'), more); return; }
  const it = e.target.closest('.item');
  if (!it) return;
  const id = it.getAttribute('data-id');
  if (msMode) {
    if (_sel.has(id)) _sel.delete(id); else _sel.add(id);
    renderConvs();
    return;
  }
  store.curId = id; save(); renderConvs(); renderChat(); renderTop(); showChatV();
});

$('#msCancel').addEventListener('click', () => { msMode = false; _sel.clear(); renderConvs(); });
$('#msDel').addEventListener('click', () => {
  if (!_sel.size) { toast('先选中要删除的对话'); return; }
  const ids = Array.from(_sel);
  store.convs = store.convs.filter((c) => !_sel.has(c.id));
  if (ids.includes(store.curId)) store.curId = store.convs.length ? store.convs[0].id : null;
  msMode = false; _sel.clear();
  save(); renderConvs(); renderChat(); renderTop();
});
document.addEventListener('click', (e) => {
  const m = $('#cmenu');
  if (!m.hidden && !e.target.closest('#cmenu') && !e.target.closest('[data-more]')) closeConvMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeConvMenu(); if (msMode) { msMode = false; _sel.clear(); renderConvs(); } if ($('#taskMask').classList.contains('on')) taskClose(); }
});
$('#convList').addEventListener('scroll', closeConvMenu);

$('#searchBtn').addEventListener('click', () => {
  const w = $('#srchwrap');
  w.classList.toggle('on');
  if (w.classList.contains('on')) $('#srch').focus();
  else { $('#srch').value = ''; renderConvs(); }
});
$('#srch').addEventListener('input', renderConvs);

$('#themeBtn').addEventListener('click', () => {
  store.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  save(); applyTheme();
  $$('.tc').forEach((b) => b.classList.toggle('on', b.dataset.themeVal === store.theme));
});

$('#clearBtn').addEventListener('click', () => {
  const c = cur();
  if (!c || !c.messages.length) return;
  c.messages = []; c.title = '新对话';
  save(); renderConvs(); renderChat(); renderTop();
});

$('#thinkPill').addEventListener('click', () => {
  store.model = store.model === 'deepseek-reasoner' ? 'deepseek-chat' : 'deepseek-reasoner';
  save(); renderTop();
});


$('#apiBtn').addEventListener('click', () => openSettings('', 'token'));
$('#setDots').addEventListener('click', (e) => { e.stopPropagation(); openSettings('', 'token'); });
$('#setBtn').addEventListener('click', () => openSettings('', 'token'));
$('#closeX').addEventListener('click', closeSettings);
$('#mask').addEventListener('click', (e) => { if (e.target === $('#mask')) closeSettings(); });
$$('.nav').forEach((b) => b.addEventListener('click', () => {
  switchPane(b.dataset.pane);
  if (b.dataset.pane === 'token') fetchBalance(true);
}));


$('#keyInput').addEventListener('change', () => { store.key = $('#keyInput').value.trim(); save(); });
$('#baseInput').addEventListener('change', () => {
  store.base = $('#baseInput').value.trim() || 'https://api.deepseek.com'; save();
});
$('#modelSel').addEventListener('change', () => { store.model = $('#modelSel').value; save(); renderTop(); });
$('#ctxSel').addEventListener('change', () => {
  const v = parseInt($('#ctxSel').value, 10);
  store.ctx = isFinite(v) && v >= 0 ? v : 12;
  save();
  toast(store.ctx ? '上下文：只带最近 ' + store.ctx + ' 轮' : '上下文：全部带上');
});
$$('.tc').forEach((b) => b.addEventListener('click', () => {
  store.theme = b.dataset.themeVal;
  save(); applyTheme();
  $$('.tc').forEach((x) => x.classList.toggle('on', x === b));
}));
$('#testBtn').addEventListener('click', () => {
  testKey(false, $('#keyInput').value.trim(), $('#baseInput').value.trim() || 'https://api.deepseek.com');
});


$('#topupBtn').addEventListener('click', () => {
  window.open('https://platform.deepseek.com/top_up', '_blank', 'noopener');
});
$('#balSyncBtn').addEventListener('click', () => fetchBalance(false));
$('#rateInput').addEventListener('change', () => {
  const v = parseFloat($('#rateInput').value);
  if (!isFinite(v) || v <= 0) { $('#rateInput').value = store.rate; return; }
  store.rate = v; save(); renderQuota();
});

async function testKey(silent, key, base) {
  key = key === undefined ? store.key : key;
  base = base || store.base;
  const el = $('#testState');
  if (!key) { el.style.color = '#e5484d'; el.textContent = '请先填写 Key'; return; }
  el.style.color = 'var(--muted)';
  el.textContent = '测试中…';
  try {
    const res = await fetch(base.replace(/\/+$/, '') + '/models', { headers: { Authorization: 'Bearer ' + key } });
    if (res.ok) {
      el.style.color = 'var(--accent)';
      el.textContent = '✓ 连接成功，Key 可用';
      store.key = key; store.base = base; save();
      fetchBalance(true);
    } else {
      el.style.color = '#e5484d';
      el.textContent = errText(res.status, await res.text());
    }
  } catch (e) {
    el.style.color = '#e5484d';
    el.textContent = '连接失败：网络或跨域问题';
  }
}

$$('.sg').forEach((b) => {
  b.addEventListener('click', () => { $('#input').value = b.textContent.trim(); autoHeight(); send($('#input').value); });
});

$('#msgWrap').addEventListener('click', (e) => {
  const cb = e.target.closest('.cbtn');
  if (cb) {
    const code = cb.closest('.codebox').querySelector('code').textContent;
    copyText(code);
    cb.textContent = '已复制';
    setTimeout(() => { cb.textContent = '复制'; }, 1400);
    return;
  }
  const btn = e.target.closest('.act');
  if (!btn) return;
  const msgEl = btn.closest('.msg');
  const idx = Array.prototype.indexOf.call($('#msgWrap').children, msgEl);
  const c = cur();
  if (!c || !c.messages[idx]) return;
  const m = c.messages[idx];
  const act = btn.getAttribute('data-act');
  if (act === 'copy' || act === 'share') {
    copyText(m.content || '');
    btn.classList.add('on');
    setTimeout(() => btn.classList.remove('on'), 1200);
  } else if (act === 'up' || act === 'down') {
    $$('.act[data-act="up"],[data-act="down"]', msgEl).forEach((x) => x.classList.remove('on'));
    btn.classList.add('on');
  } else if (act === 'regen') {
    regen(idx);
  } else if (act === 'speak') {
    speak(m.content || '', btn);
  }
});


const AG_MAX_STEPS = 12;
const AG_PERM_LABEL = { read: '只读（读取与列目录、截屏）', workspace: '工作区写入（可读写工作区、跑安全命令）', full: '完全访问（可执行任意命令、操作鼠标键盘）' };

function agSystemPrompt(perms) {
  return [
    '你是 Orion 桌面端的工作任务代理，可以直接操作这台 Windows 电脑。',
    '权限等级：' + (AG_PERM_LABEL[perms] || perms) + '。超出权限的调用会被宿主拒绝。',
    '工作区：' + agWork + '。默认把中间文件放在工作区；用户明确要求时才动别的位置。',
    '',
    '可用工具（每轮只能调用一个）：',
    'pwsh: 执行 PowerShell 7 命令。args: {"command":"...","description":"一句话说明","timeoutMs":30000,"workdir":"..."}',
    'read: 读文件带行号。args: {"file_path":"...","offset":1,"limit":800}',
    'write: 创建或整体覆盖文件。args: {"file_path":"...","content":"..."}',
    'edit: 字面量替换。args: {"file_path":"...","old_string":"...","new_string":"...","replace_all":false}',
    'list_dir: 列目录。args: {"path":"..."}',
    'screenshot: 全屏截屏，返回图片给用户看。args: {}',
    'click: 鼠标点击屏幕坐标。args: {"x":100,"y":200,"double":false}',
    'type: 向当前焦点输入文本（走剪贴板粘贴，支持中文）。args: {"text":"..."}',
    'key: 发送按键，SendKeys 语法，如 "^c"、"^s"、"{ENTER}"。args: {"keys":"^c"}',
    'launch: 启动程序或打开文件。args: {"target":"notepad.exe"}',
    'finish: 任务结束，向用户汇报。args: {"summary":"..."}',
    '',
    '输出规则（必须严格遵守）：',
    '1. 每次回复只输出一个 JSON 对象，不要 Markdown、不要代码围栏、不要多余解释。',
    '2. 格式：{"thought":"一句话说明下一步","tool":"pwsh","args":{...}}',
    '3. 结束任务时用 {"thought":"...","tool":"finish","args":{"summary":"..."}}。',
    '4. 先确认环境（列目录、读文件、截屏），再动手；删除或移动前先核对绝对路径。',
    '5. 命令要幂等、可复跑；输出很长时在命令里自行截断（Select-Object -First 50）。',
    '6. 遇到权限拒绝就换一条路径完成，不要反复重试同一条被拒的命令。',
  ].join('\n');
}

function agParseJSON(text) {
  const s = String(text || '').replace(/```json/gi, '```').replace(/```/g, '').trim();
  const tryParse = (x) => { try { return JSON.parse(x); } catch (e) { return null; } };
  const direct = tryParse(s);
  if (direct && (direct.tool || direct.summary)) return direct;
  const i = s.indexOf('{'), j = s.lastIndexOf('}');
  if (i >= 0 && j > i) {
    const sub = tryParse(s.slice(i, j + 1));
    if (sub) return sub;
  }
  return null;
}

function agAddStep(run, kind, text, extra) {
  if (!run.steps) run.steps = [];
  run.steps.push(Object.assign({ kind, text: String(text == null ? '' : text), ts: Date.now() }, extra || {}));
  if (run.steps.length > 80) run.steps = run.steps.slice(-80);
  renderTasks();
}

async function agCallModel(hist) {
  const base = (store.base || 'https://api.deepseek.com').replace(/\/+$/, '');
  const res = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (store.key || '').trim() },
    body: JSON.stringify({ model: store.model || 'deepseek-chat', messages: hist, temperature: 0.2, max_tokens: 1024, stream: false }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(errText(res.status, raw));
  const j = JSON.parse(raw);
  if (j.usage) spend(j.usage);
  return { text: (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '', usage: j.usage };
}

async function startAgentRun() {
  const goal = ($('#agGoal').value || '').trim();
  if (!goal) { toast('先写任务目标'); $('#agGoal').focus(); return; }
  if (!(store.key || '').trim()) { openSettings('填好 API Key 才能执行任务', 'general'); return; }
  if (!window.orion || !window.orion.tool) { toast('任务代理需要在桌面客户端里运行'); return; }
  const perms = $('#agPerms').value || 'workspace';
  store.agPerms = perms;
  const run = {
    id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    goal: goal.slice(0, 2000), status: 'running', ts: Date.now(), perms,
    steps: [], hist: [
      { role: 'system', content: agSystemPrompt(perms) },
      { role: 'user', content: '任务目标：' + goal + '\n请开始。' },
    ], tokens: 0,
  };
  store.tasks.unshift(run);
  $('#agGoal').value = '';
  agExpanded[run.id] = true;
  save(); renderTasks();
  toast('任务已开始，可在面板查看每一步');
  await agentLoop(run);
}

async function agentLoop(run) {
  try {
    for (let step = 0; step < AG_MAX_STEPS; step++) {
      if (run.stopped || run.status !== 'running') break;
      if (!run.hist.some((m) => m.role === 'assistant') && step === 0) {  }
      const { text } = await agCallModel(run.hist);
      run.hist.push({ role: 'assistant', content: text });
      const obj = agParseJSON(text);
      if (!obj) {
        agAddStep(run, 'err', '模型没有返回可解析的 JSON，任务中止。原始回复：\n' + text.slice(0, 300));
        run.status = 'failed'; break;
      }
      if (obj.thought) agAddStep(run, 'think', obj.thought);
      const tool = obj.tool || (obj.summary ? 'finish' : '');
      const args = obj.args || {};
      if (!tool || tool === 'finish') {
        const summary = (args.summary || obj.summary || obj.thought || '任务完成').trim();
        agAddStep(run, 'final', summary);
        run.status = 'done'; run.result = summary;
        break;
      }
      agAddStep(run, 'tool', tool + '\n' + JSON.stringify(args, null, 2));
      const r = await window.orion.tool(run.id, tool, Object.assign({}, args, { __perms: run.perms }));
      if (r && r.image) agAddStep(run, 'obs', r.output, { image: r.image });
      else agAddStep(run, r && r.ok ? 'obs' : 'err', (r && r.output) || '(无返回)');
      run.hist.push({ role: 'user', content: '工具 ' + tool + ' 返回：\n' + String((r && r.output) || '').slice(0, 4000) });
      if (run.hist.length > 26) run.hist = [run.hist[0], run.hist[1]].concat(run.hist.slice(-22));
      save();
      if (run.status !== 'running') break;
      if (step === AG_MAX_STEPS - 1) {
        agAddStep(run, 'err', '已达到 ' + AG_MAX_STEPS + ' 步上限，任务暂停。可以再说一句“继续”开新任务。');
        run.status = 'stopped';
      }
    }
  } catch (e) {
    agAddStep(run, 'err', '执行出错：' + (e && e.message ? e.message : String(e)));
    run.status = 'failed';
  } finally {
    if (run.status === 'running') run.status = run.stopped ? 'stopped' : 'done';
    run.ts = run.ts || Date.now();
    save(); renderTasks(); renderQuota();
  }
}


$('#taskCloseX').addEventListener('click', taskClose);
$('#taskMask').addEventListener('click', (e) => { if (e.target === $('#taskMask')) taskClose(); });
$('#agRun').addEventListener('click', startAgentRun);
$('#agGoal').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); startAgentRun(); }
});
$('#agPerms').addEventListener('change', () => { store.agPerms = $('#agPerms').value; save(); });
$('#agList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ag]');
  if (!b) return;
  const id = b.dataset.id, act = b.dataset.ag;
  if (act === 'del') { e.stopPropagation(); agDelete(id); return; }
  if (act === 'stop') { e.stopPropagation(); agStop(id); return; }
  if (act === 'toggle') { agExpanded[id] = !agExpanded[id]; renderTasks(); }
});
$('#agClear').addEventListener('click', () => {
  const done = store.tasks.filter((t) => t.status === 'done' || t.status === 'failed' || t.status === 'stopped').length;
  if (!done) { toast('没有已结束的任务'); return; }
  store.tasks = store.tasks.filter((t) => t.status === 'running' || t.status === 'pending');
  save(); renderTasks();
});


window.__katexReady = function () { if (window.katex) renderChat(); };
function __initOrion() {
  applyTheme();
  if (window.matchMedia) {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = () => { if (store.theme === 'auto') applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn);
  }
  renderTop(); renderConvs(); renderChat(); renderQuota(); renderTasks();
  renderHome();
  var hh = new Date().getHours();
  var hi = hh < 5 ? '夜深了' : hh < 9 ? '早上好' : hh < 12 ? '上午好' : hh < 14 ? '中午好' : hh < 18 ? '下午好' : hh < 23 ? '晚上好' : '夜深了';
  if ($('#heroSay')) $('#heroSay').textContent = hi + '，我是 Orion AI！';
  if ($('#prjName')) $('#prjName').textContent = wsLabel(store.workPath || agWork);
  if ($('#agPerms')) $('#agPerms').value = store.agPerms || 'workspace';
  if (window.orion && window.orion.info) {
    window.orion.info().then((i) => { if (i && i.work) { agWork = i.work; $('#agWorkPath').textContent = i.work; $('#agWorkPath').title = i.work; } }).catch(() => {});
  }
  if (store.web) $('#webPill').classList.add('on');
  if (store.key) fetchBalance(true); else if ($('#balState')) $('#balState').textContent = '未填 API Key，无法拉取';
  autoHeight();
  if ($('#sendBtn')) $('#sendBtn').disabled = !$('#input').value.trim();
  $('#input').focus();
  if (!store.key) setTimeout(() => openSettings('填好 API Key 就能开始聊了', 'general'), 700);
}

var HOME_MODELS = [
  { v: 'deepseek-chat', n: 'DeepSeek V3', d: '通用对话、写作与轻量任务' },
  { v: 'deepseek-reasoner', n: 'DeepSeek R1', d: '深度推理、多步分析与复杂任务' }
];
var HOME_MODES = {
  read: { n: '只读模式', d: '只能查看工作区，不做任何改动' },
  workspace: { n: '标准模式', d: '可以在工作区内读写文件' },
  full: { n: '完全访问', d: '可执行本机命令、操作桌面' }
};

function wsLabel(p) {
  if (!p) return '默认工作区';
  var s = String(p).replace(/[\\/]+$/, '');
  if (/^[A-Za-z]:$/.test(s)) return s + ' 盘';
  var i = Math.max(s.lastIndexOf('\\'), s.lastIndexOf('/'));
  return i >= 0 ? s.slice(i + 1) : s;
}

function menuClose() {
  var m = $('#oMenu');
  if (m) m.remove();
  document.removeEventListener('mousedown', menuOutside, true);
}
function menuOutside(e) {
  var m = $('#oMenu');
  if (m && !m.contains(e.target)) menuClose();
}
function openMenu(anchor, build) {
  menuClose();
  var box = document.createElement('div');
  box.id = 'oMenu';
  box.className = 'omenu';
  build(box);
  document.body.appendChild(box);
  var r = anchor.getBoundingClientRect();
  var w = box.offsetWidth, h = box.offsetHeight;
  var left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
  var top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
  box.style.left = left + 'px';
  box.style.top = top + 'px';
  setTimeout(function () { document.addEventListener('mousedown', menuOutside, true); }, 0);
}
function menuItem(box, title, sub, on, cur) {
  var it = document.createElement('button');
  it.className = 'oi';
  it.type = 'button';
  var head = document.createElement('span');
  head.textContent = title;
  var wrap = document.createElement('span');
  wrap.style.minWidth = '0';
  wrap.appendChild(head);
  if (sub) {
    var s = document.createElement('span');
    s.className = 'osub';
    s.textContent = sub;
    wrap.appendChild(s);
  }
  it.appendChild(wrap);
  if (cur) {
    var ck = document.createElement('span');
    ck.className = 'ock';
    ck.textContent = '已选';
    it.appendChild(ck);
  }
  it.addEventListener('click', function () { menuClose(); on(); });
  box.appendChild(it);
}

function renderWsPill() {
  var t = $('#wsPillTxt');
  if (t) t.textContent = wsLabel(store.workPath);
  var p = $('#wsPill');
  if (p) p.title = store.workPath || '默认工作区';
}

function renderWsList() {
  var box = $('#wsList');
  if (!box) return;
  box.innerHTML = '';
  var items = [{ p: '', n: '默认工作区' }];
  (store.spaces || []).forEach(function (p) { items.push({ p: p, n: wsLabel(p) }); });
  items.forEach(function (it) {
    var b = document.createElement('button');
    b.className = 'wsitem' + ((store.workPath || '') === it.p ? ' on' : '');
    b.type = 'button';
    b.title = it.p || '默认工作区';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3.6 7.6a1.8 1.8 0 0 1 1.8-1.8h4l1.8 2h7.4a1.8 1.8 0 0 1 1.8 1.8v7.6a1.8 1.8 0 0 1-1.8 1.8H5.4a1.8 1.8 0 0 1-1.8-1.8z"/></svg>';
    var sp = document.createElement('span');
    sp.className = 'wt';
    sp.textContent = it.n;
    b.appendChild(sp);
    b.addEventListener('click', function () { applyWork(it.p); });
    box.appendChild(b);
  });
}

function applyWork(p) {
  store.workPath = p || '';
  save();
  renderWsPill();
  renderWsList();
  if ($('#agWorkPath')) $('#agWorkPath').textContent = p || agWork || 'workspace';
  if (window.orion && window.orion.info) {
    window.orion.info().then(function (i) {
      if (!p && i && i.work && $('#agWorkPath')) { $('#agWorkPath').textContent = i.work; $('#agWorkPath').title = i.work; }
    }).catch(function () {});
  }
  if (p && window.orion && window.orion.setWork) {
    window.orion.setWork(p).then(function (r) {
      if (!r || !r.ok) toast('切换工作区失败：' + ((r && r.msg) || '未知原因'));
    }).catch(function () { toast('切换工作区失败'); });
  }
}

function addWork() {
  if (!window.orion || !window.orion.pickWork) { toast('当前环境不支持选择文件夹'); return; }
  window.orion.pickWork().then(function (r) {
    if (!r || !r.ok || !r.path) return;
    var p = r.path;
    if (!store.spaces) store.spaces = [];
    if (store.spaces.indexOf(p) < 0) store.spaces.push(p);
    applyWork(p);
    toast('已切换到 ' + wsLabel(p));
  }).catch(function () { toast('选择文件夹失败'); });
}

function renderModelPill() {
  var m = HOME_MODELS.filter(function (x) { return x.v === store.model; })[0];
  var t = $('#modelPillTxt');
  if (t) t.textContent = m ? m.n : (store.model || 'DeepSeek');
}

function renderModePill() {
  var m = HOME_MODES[store.agPerms] || HOME_MODES.workspace;
  var t = $('#modePillTxt');
  if (t) t.textContent = m.n;
  var p = $('#modePill');
  if (p) p.title = m.d;
}

function renderHome() {
  renderWsPill();
  renderWsList();
  renderModelPill();
  renderModePill();
}

$('#modelPill').addEventListener('click', function () {
  openMenu($('#modelPill'), function (box) {
    var hd = document.createElement('div');
    hd.className = 'ohd';
    hd.textContent = '选择模型';
    box.appendChild(hd);
    HOME_MODELS.forEach(function (m) {
      menuItem(box, m.n, m.d, function () {
        store.model = m.v;
        save();
        renderModelPill();
        renderTop();
        if ($('#modelSel')) $('#modelSel').value = m.v;
      }, store.model === m.v);
    });
  });
});

$('#modePill').addEventListener('click', function () {
  openMenu($('#modePill'), function (box) {
    var hd = document.createElement('div');
    hd.className = 'ohd';
    hd.textContent = '权限模式（作用于工作任务）';
    box.appendChild(hd);
    Object.keys(HOME_MODES).forEach(function (k) {
      var m = HOME_MODES[k];
      menuItem(box, m.n, m.d, function () {
        store.agPerms = k;
        save();
        renderModePill();
        if ($('#agPerms')) $('#agPerms').value = k;
      }, store.agPerms === k);
    });
  });
});

$('#wsPill').addEventListener('click', function () {
  openMenu($('#wsPill'), function (box) {
    var hd = document.createElement('div');
    hd.className = 'ohd';
    hd.textContent = '工作区';
    box.appendChild(hd);
    menuItem(box, '默认工作区', '保存在用户数据目录', function () { applyWork(''); }, !store.workPath);
    (store.spaces || []).forEach(function (p) {
      menuItem(box, wsLabel(p), p, function () { applyWork(p); }, store.workPath === p);
    });
    menuItem(box, '选择文件夹…', '把本机任意目录设为工作区', addWork, false);
  });
});


$('#workNewBtn').addEventListener('click', function () { showWork(); });
$('#prjWork').addEventListener('click', function () { showWork(); });

var WFILTER = 'all';

function tabState(work) {
  if ($('#tabWork')) $('#tabWork').classList.toggle('on', work);
  if ($('#tabChat')) $('#tabChat').classList.toggle('on', !work);
}

function showWork() {
  var m = document.querySelector('.main');
  if (!m) return;
  m.classList.add('work');
  m.classList.remove('empty');
  tabState(true);
  renderWork();
  var g = $('#wpGoal');
  if (g) setTimeout(function () { g.focus(); }, 40);
}

function showChatV() {
  var m = document.querySelector('.main');
  if (!m) return;
  m.classList.remove('work');
  tabState(false);
  renderChat();
  renderTop();
}

function wPermName(p) {
  var m = HOME_MODES[p] || HOME_MODES.workspace;
  return m.n;
}

function renderWorkList() {
  var box = $('#wpList');
  if (!box) return;
  var all = store.tasks || [];
  var runs = all.slice().sort(function (a, b) { return b.ts - a.ts; });
  if (WFILTER === 'running') runs = runs.filter(function (r) { return r.status === 'running' || r.status === 'pending'; });
  if (WFILTER === 'done') runs = runs.filter(function (r) { return r.status === 'done' || r.status === 'failed' || r.status === 'stopped'; });
  var sum = $('#wpSum');
  if (sum) {
    var done = all.filter(function (r) { return r.status === 'done'; }).length;
    sum.textContent = all.length ? '共 ' + all.length + ' 个 · 完成 ' + done + ' 个' : '';
  }
  if (!runs.length) {
    box.innerHTML = '<div class="wempty">' + (all.length
      ? '这个筛选下没有任务。'
      : '还没有任务。写一句要它做的事，回车就开始。') + '</div>';
    return;
  }
  box.innerHTML = '';
  runs.forEach(function (r) {
    var s = agStatus(r);
    var last = (r.steps || []).slice(-1)[0];
    var meta = ((r.steps || []).length || 0) + ' 步 · ' + wPermName(r.perms) + (last ? ' · ' + String(last.text || '').replace(/\s+/g, ' ').slice(0, 80) : '');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'wcard';
    b.dataset.id = r.id;
    b.innerHTML = '<span class="wst ' + s[1] + '">' + s[0] + '</span>' +
      '<span class="g"><span class="wgoal"></span><span class="wmeta"></span></span>' +
      '<span class="agtime">' + agTime(r.ts) + '</span>';
    b.querySelector('.wgoal').textContent = r.goal || '';
    b.querySelector('.wmeta').textContent = meta;
    b.addEventListener('click', function () { openTaskDetail(r.id); });
    box.appendChild(b);
  });
}

function renderWork() {
  renderWsPill();
  renderModelPill();
  renderModePill();
  var w = store.workPath || agWork || 'workspace';
  var wt = $('#wpWorkTxt');
  if (wt) { wt.textContent = w; wt.title = w; }
  var pn = $('#prjName');
  if (pn) { pn.textContent = wsLabel(w); pn.title = w; }
  renderWorkList();
}

function openTaskDetail(id) {
  Object.keys(agExpanded).forEach(function (k) { agExpanded[k] = false; });
  agExpanded[id] = true;
  $('#taskMask').classList.add('on');
  renderTasks();
  setTimeout(function () {
    var el = document.querySelector('#agList .agcard[data-id="' + id + '"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, 80);
}

$('#wpRun').addEventListener('click', function () {
  var g = ($('#wpGoal').value || '').trim();
  if (!g) { toast('先写任务目标'); $('#wpGoal').focus(); return; }
  $('#agGoal').value = g;
  $('#agPerms').value = store.agPerms || 'workspace';
  $('#wpGoal').value = '';
  $('#wpGoal').style.height = 'auto';
  startAgentRun();
});

$('#wpGoal').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('#wpRun').click(); }
});
$('#wpGoal').addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(180, this.scrollHeight) + 'px';
});

$$('.wtab').forEach(function (b) {
  b.addEventListener('click', function () {
    WFILTER = b.dataset.wf;
    $$('.wtab').forEach(function (x) { x.classList.toggle('on', x === b); });
    renderWorkList();
  });
});

$('#wpClear').addEventListener('click', function () {
  var done = store.tasks.filter(function (t) { return t.status === 'done' || t.status === 'failed' || t.status === 'stopped'; }).length;
  if (!done) { toast('没有已结束的任务'); return; }
  store.tasks = store.tasks.filter(function (t) { return t.status === 'running' || t.status === 'pending'; });
  save(); renderTasks();
  toast('已清除 ' + done + ' 个已结束任务');
});

__initOrion();
showChatV();



