/* Orion 桌面端：数据导出 / 导入（zip 里一堆 js）
   和手机版共用一套格式：
     manifest.js          export default {...}
     settings.js          export default { model }
     chats/0001.js        export default { id, title, ts, messages:[{role,content,think}] }
   导出不含 key。 */
(function () {
  var T = [];
  for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); T[n] = c >>> 0; }
  function crc(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function enc(t) { return new TextEncoder().encode(t); }
  function u16(n) { return [n & 255, (n >> 8) & 255]; }
  function u32(n) { return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]; }
  function mk(a) { return new Uint8Array(a); }

  function make(files) {
    var local = [], central = [], off = 0;
    files.forEach(function (f) {
      var name = enc(f.p), data = f.d, c = crc(data);
      var head = mk([].concat([0x50, 0x4b, 0x03, 0x04], u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(c), u32(data.length), u32(data.length), u16(name.length), u16(0)));
      local.push(head, name, data);
      central.push(mk([].concat([0x50, 0x4b, 0x01, 0x02], u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(c), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), name);
      off += head.length + name.length + data.length;
    });
    var cdSize = central.reduce(function (a, b) { return a + b.length; }, 0);
    local = local.concat(central, [mk([].concat([0x50, 0x4b, 0x05, 0x06], u16(0), u16(0),
      u16(files.length), u16(files.length), u32(cdSize), u32(off), u16(0)))]);
    var total = local.reduce(function (a, b) { return a + b.length; }, 0);
    var out = new Uint8Array(total), p = 0;
    local.forEach(function (a) { out.set(a, p); p += a.length; });
    return out;
  }

  function read(buf) {
    var u8 = new Uint8Array(buf), dv = new DataView(buf), eocd = -1;
    for (var i = u8.length - 22; i >= 0; i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) return Promise.reject(new Error('不是有效的 zip'));
    var cnt = dv.getUint16(eocd + 10, true), cdOff = dv.getUint32(eocd + 16, true), p = cdOff, list = [];
    for (var k = 0; k < cnt; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) return Promise.reject(new Error('zip 目录损坏'));
      var method = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true),
          nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true),
          lo = dv.getUint32(p + 42, true);
      var nm = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
      var lnl = dv.getUint16(lo + 26, true), lel = dv.getUint16(lo + 28, true), st = lo + 30 + lnl + lel;
      list.push({ p: nm, method: method, raw: u8.subarray(st, st + cs) });
      p += 46 + nl + el + cl;
    }
    return Promise.all(list.map(function (f) {
      if (f.method === 0) return { p: f.p, d: f.raw };
      if (f.method === 8) {
        var stream = new Blob([f.raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Response(stream).arrayBuffer().then(function (b) { return { p: f.p, d: new Uint8Array(b) }; });
      }
      throw new Error('不支持的压缩方式 ' + f.method);
    }));
  }

  function dstr(o) { return 'export default ' + JSON.stringify(o, null, 2) + ';\n'; }

  function doExport() {
    if (typeof store === 'undefined') { toast && toast('数据还没加载完'); return; }
    var files = [];
    files.push({ p: 'manifest.js', d: enc(dstr({
      app: 'Orion AI', kind: 'orion-archive', version: '2.4', from: 'desktop',
      exportedAt: new Date().toISOString(), chats: (store.convs || []).length
    })) });
    files.push({ p: 'settings.js', d: enc(dstr({ model: store.model, theme: store.theme })) });
    (store.convs || []).forEach(function (c, i) {
      var msgs = (c.messages || []).filter(function (m) { return m.role === 'user' ? true : !!m.content; }).map(function (m) {
        return m.role === 'user'
          ? { role: 'user', content: m.content }
          : { role: 'assistant', content: m.content, think: m.think || '' };
      });
      files.push({ p: 'chats/' + String(i + 1).padStart(4, '0') + '.js',
        d: enc(dstr({ id: c.id, title: c.title, ts: c.ts || Date.now(), messages: msgs })) });
    });
    var bytes = make(files);
    var fname = 'orion-backup-' + new Date().toISOString().slice(0, 10) + '.zip';
    if (window.orion && typeof window.orion.saveZip === 'function') {
      var b64 = '', CH = 0x8000;
      for (var i = 0; i < bytes.length; i += CH) b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
      b64 = btoa(b64);
      window.orion.saveZip(fname, b64).then(function (p) {
        if (!p) return;
        if (p.indexOf('ERR:') === 0) { toast && toast('导出失败 ' + p.slice(4)); return; }
        toast && toast('已导出 → ' + p);
      }).catch(function (e) { toast && toast('导出失败：' + e.message); });
      return;
    }
    var blob = new Blob([make(files)], { type: 'application/zip' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'orion-backup-' + new Date().toISOString().slice(0, 10) + '.zip';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    if (typeof toast === 'function') toast('已导出 ' + (store.convs || []).length + ' 个对话');
  }

  function doImport(file) {
    file.arrayBuffer().then(read).then(function (files) {
      var convs = [], got = 0;
      files.forEach(function (f) {
        if (!/\.js$/.test(f.p)) return;
        var txt = new TextDecoder().decode(f.d).replace(/^\uFEFF/, '').replace(/^\s*export\s+default\s*/, '').replace(/;\s*$/, '');
        var o; try { o = JSON.parse(txt); } catch (e) { return; }
        if (f.p.indexOf('chats/') === 0 && o.messages) {
          got++;
          convs.push({
            id: o.id || ('c' + Math.random().toString(36).slice(2)),
            title: o.title || '导入的对话',
            ts: o.ts || Date.now(),
            messages: o.messages.map(function (m) {
              return m.role === 'user'
                ? { role: 'user', content: m.content || '' }
                : { role: 'assistant', content: m.content || '', think: m.think || '' };
            }),
            kind: 'chat'
          });
        }
      });
      var have = {};
      (store.convs || []).forEach(function (c) { have[c.id] = 1; });
      var added = 0;
      convs.forEach(function (c) { if (!have[c.id]) { store.convs.push(c); have[c.id] = 1; added++; } });
      store.convs.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
      if (store.convs.length) store.curId = store.convs[0].id;
      save(); renderConvs(); renderChat(); renderTop();
      if (typeof toast === 'function') toast(added ? ('已导入 ' + added + ' 个对话') : '这些对话本机都有了');
    }).catch(function (e) { if (typeof toast === 'function') toast('导入失败：' + e.message); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var exp = document.getElementById('btnExpZip'), imp = document.getElementById('btnImpZip'),
        inp = document.getElementById('zipFile');
    var repoUrl = (typeof ORION_REPO !== 'undefined') ? ORION_REPO : 'https://github.com/Seven-Wang14/orion-desktop';
    function openRepo(e) {
      if (e) e.preventDefault();
      if (window.orion && window.orion.openExt) { window.orion.openExt(repoUrl); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(repoUrl);
        if (typeof toast === 'function') toast('已复制开源地址：' + repoUrl);
      }
    }
    ['btnRepo', 'repoLink'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', openRepo);
    });
    if (exp) exp.addEventListener('click', doExport);
    if (imp && inp) imp.addEventListener('click', function () { inp.click(); });
    if (inp) inp.addEventListener('change', function () {
      var f = this.files && this.files[0];
      this.value = '';
      if (f) doImport(f);
    });
  });
})();
