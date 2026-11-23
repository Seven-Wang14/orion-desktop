const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const svg = fs.readFileSync(path.join(__dirname, '..', 'orion-mark.svg'), 'utf8').replace(/ width="230" height="230"/g, ' style="width:100%;height:100%;display:block"');
const outDir = path.join(__dirname, '..', '_icon2');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const S = 256, R = Math.round(S * 0.22);
const html = `<!DOCTYPE html><html><body style="margin:0;background:#eef1f7">
<div id="p" style="width:${S}px;height:${S}px;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#ffffff,#edf2ff);border-radius:${R}px;box-sizing:border-box">
<div style="width:${Math.round(S * 0.72)}px;height:${Math.round(S * 0.72)}px">${svg}</div></div></body></html>`;

const sizes = [16, 24, 32, 48, 64, 128, 256];

function roundMask(img) {
  const size = img.getSize();
  const bmp = Buffer.from(img.toBitmap());
  const w = size.width, h = size.height;
  const r = Math.round(w * 0.22);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let dx = 0, dy = 0;
      if (x < r) dx = r - x - 0.5; else if (x > w - r - 1) dx = x - (w - r) + 0.5;
      if (y < r) dy = r - y - 0.5; else if (y > h - r - 1) dy = y - (h - r) + 0.5;
      if (dx > 0 && dy > 0 && Math.sqrt(dx * dx + dy * dy) > r) bmp[(y * w + x) * 4 + 3] = 0;
    }
  }
  return nativeImage.createFromBitmap(bmp, { width: w, height: h, scaleFactor: 1 });
}

function ico(pngs) {
  const n = pngs.length;
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(n, 4);
  const entries = Buffer.alloc(16 * n);
  let off = 6 + 16 * n;
  const parts = [head, entries];
  pngs.forEach((p, i) => {
    const s = sizes[i], w = s >= 256 ? 0 : s, e = i * 16;
    entries.writeUInt8(w, e); entries.writeUInt8(w, e + 1);
    entries.writeUInt8(0, e + 2); entries.writeUInt8(0, e + 3);
    entries.writeUInt16LE(1, e + 4); entries.writeUInt16LE(32, e + 6);
    entries.writeUInt32LE(p.length, e + 8); entries.writeUInt32LE(off, e + 12);
    off += p.length; parts.push(p);
  });
  return Buffer.concat(parts);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: S, height: S, show: false, frame: false, useContentSize: true, webPreferences: {} });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 500));
  let base = await win.capturePage();
  base = roundMask(base);
  const pngs = sizes.map((s, i) => {
    const img = s === S ? base : base.resize({ width: s, height: s, quality: 'best' });
    const p = img.toPNG();
    fs.writeFileSync(path.join(outDir, `icon${s}.png`), p);
    return p;
  });
  fs.writeFileSync(path.join(outDir, 'Orion.ico'), ico(pngs));
  console.log('base=' + base.getSize().width + ' ico=' + fs.statSync(path.join(outDir, 'Orion.ico')).size);
  app.quit();
});
