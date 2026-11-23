const fs = require('fs');
const path = require('path');
exports.default = async function afterPack(context) {
  const res = path.join(context.appOutDir, 'locales');
  const keep = new Set(['zh-CN.pak', 'en-US.pak']);
  try {
    for (const f of fs.readdirSync(res)) {
      if (!keep.has(f)) fs.unlinkSync(path.join(res, f));
    }
  } catch (e) {
    console.warn('locale trim skipped:', e.message);
  }
  // 清掉无用的许可大文件以压体积（保留 LICENSE）
  for (const name of ['LICENSES.chromium.html']) {
    const p = path.join(context.appOutDir, name);
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
  }
};