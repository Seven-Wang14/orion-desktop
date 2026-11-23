const { app, BrowserWindow, Menu, shell, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const SYS = process.env.SystemRoot || 'C:\\Windows';
const TASKKILL = path.join(SYS, 'System32', 'taskkill.exe');
const SAFE_PATH = [path.join(SYS, 'System32'), path.join(SYS, 'System32', 'WindowsPowerShell', 'v1.0'), SYS,
  path.join(SYS, 'System32', 'Wbem'), process.env.PATH || ''].join(';');
const BASE = app.isPackaged ? path.dirname(process.execPath) : __dirname;
/* 数据放在用户漫游目录，覆盖安装/卸载都不会被安装器清掉 */
const DATA = path.join(app.getPath('appData'), 'Orion');
const WORK = path.join(DATA, 'workspace');
const ICO = path.join(BASE, 'Orion.ico');
try { fs.mkdirSync(DATA, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(WORK, { recursive: true }); } catch (e) {}
/* 老版本把 data 放在安装目录：首次启动时迁移一次，原目录保留作备份 */
try {
  const OLD = path.join(BASE, 'data');
  const flag = path.join(DATA, '.migrated');
  if (!fs.existsSync(flag) && fs.existsSync(OLD)) {
    fs.cpSync(OLD, DATA, { recursive: true, force: false, errorOnExist: false });
    fs.writeFileSync(flag, new Date().toISOString(), 'utf8');
  }
} catch (e) {}
app.setPath('userData', DATA);

/* ================= 工作任务：本机工具执行 ================= */
const PWSH = (() => {
  const cands = [
    'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'pwsh.exe'),
    path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
  ];
  for (const c of cands) { try { if (c && fs.existsSync(c)) return c; } catch (e) {} }
  return 'powershell.exe';
})();
const children = new Map();
const aborted = new Set();

function track(runId, child) {
  if (!runId) return;
  if (!children.has(runId)) children.set(runId, new Set());
  children.get(runId).add(child);
  child.once('exit', () => { const s = children.get(runId); if (s) s.delete(child); });
}
function insideWork(p) {
  const abs = path.resolve(WORK, p || '.');
  const rel = path.relative(WORK, abs);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
function decode(buf) {
  return buf.toString('utf8').replace(/\u0000/g, '');
}
function runPwsh(command, { cwd, timeoutMs = 30000, runId } = {}) {
  return new Promise((resolve) => {
    if (aborted.has(runId)) return resolve({ ok: false, output: '已停止' });
    const args = ['-NoProfile', '-NonInteractive', '-Command', '[Console]::OutputEncoding=[Text.Encoding]::UTF8;' + command];
    let child;
    try {
      child = spawn(PWSH, args, { cwd: cwd || WORK, windowsHide: true, env: { ...process.env, PATH: SAFE_PATH, ORION_TASK: '1' } });
    } catch (e) {
      return resolve({ ok: false, output: '无法启动 PowerShell：' + e.message });
    }
    track(runId, child);
    let out = [], err = [], done = false;
    const kill = () => { try { spawn(TASKKILL, ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }); } catch (e) {} };
    const timer = setTimeout(() => { kill(); finish({ ok: false, output: '超时（' + timeoutMs + 'ms）已终止' }); }, timeoutMs);
    function finish(res) {
      if (done) return;
      done = true; clearTimeout(timer); resolve(res);
    }
    child.stdout.on('data', (b) => out.push(b));
    child.stderr.on('data', (b) => err.push(b));
    child.on('error', (e) => finish({ ok: false, output: '执行失败：' + e.message }));
    child.on('close', (code) => {
      const text = decode(Buffer.concat(out)).trim();
      const errText = decode(Buffer.concat(err)).trim();
      const body = (text + (errText ? (text ? '\n' : '') + errText : '')) || '(无输出)';
      finish({ ok: code === 0, output: body.slice(0, 20000) + (code !== 0 ? '\n[exit code: ' + code + ']' : ''), code });
    });
  });
}

const DANGER = /(shutdown|Restart-Computer|Stop-Computer|Format-Volume|Clear-Disk|Initialize-Disk|reg\s+delete|Remove-Item[\s\S]*-Recurse|rmdir\s+\/s|rd\s+\/s|del\s+\/[fsq]|cipher\s+\/w|bcdedit|diskpart|New-Service|Set-MpPreference|Disable-WindowsOptionalFeature)/i;

async function toolRead(args) {
  const p = path.resolve(WORK, args.file_path || '');
  const st = await fs.promises.stat(p);
  if (!st.isFile()) return '不是文件：' + p;
  if (st.size > 2 * 1024 * 1024) return '文件过大（>2MB），请用 pwsh 分段读取';
  const text = await fs.promises.readFile(p, 'utf8');
  const lines = text.split('\n');
  const offset = Math.max(1, parseInt(args.offset, 10) || 1);
  const limit = Math.min(2000, parseInt(args.limit, 10) || 800);
  const slice = lines.slice(offset - 1, offset - 1 + limit);
  const body = slice.map((l, i) => String(offset + i).padStart(6) + '\t' + l.slice(0, 2000)).join('\n');
  return body + '\n(' + lines.length + ' 行，显示 ' + offset + '-' + (offset + slice.length - 1) + ')';
}
async function toolWrite(args) {
  const p = path.resolve(WORK, args.file_path || '');
  if (!args.file_path) throw new Error('缺少 file_path');
  await fs.promises.mkdir(path.dirname(p), { recursive: true });
  await fs.promises.writeFile(p, args.content || '', 'utf8');
  return '已写入 ' + p + '（' + Buffer.byteLength(args.content || '') + ' 字节）';
}
async function toolEdit(args) {
  const p = path.resolve(WORK, args.file_path || '');
  const oldS = args.old_string || '';
  const newS = args.new_string || '';
  if (!oldS) return 'old_string 不能为空';
  const text = await fs.promises.readFile(p, 'utf8');
  const count = text.split(oldS).length - 1;
  if (count === 0) return '未找到待替换内容';
  if (count > 1 && !args.replace_all) return '匹配到 ' + count + ' 处，请提供更长的上下文或设 replace_all';
  const next = args.replace_all ? text.split(oldS).join(newS) : text.replace(oldS, newS);
  await fs.promises.writeFile(p, next, 'utf8');
  return '已修改 ' + p + '（替换 ' + (args.replace_all ? count : 1) + ' 处）';
}
async function toolList(args) {
  const dir = path.resolve(WORK, args.path || '.');
  const items = await fs.promises.readdir(dir, { withFileTypes: true });
  if (!items.length) return '(空目录)';
  return items.slice(0, 200).map((it) => {
    let size = '';
    try { if (it.isFile()) size = '  ' + fs.statSync(path.join(dir, it.name)).size + ' B'; } catch (e) {}
    return (it.isDirectory() ? '[D] ' : '[F] ') + it.name + size;
  }).join('\n') + (items.length > 200 ? '\n…共 ' + items.length + ' 项' : '');
}

const SHOT_PS = `
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$b = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Left, $b.Top, 0, 0, $bmp.Size)
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
[Convert]::ToBase64String($ms.ToArray())
`;

const MOUSE_PS = `
Add-Type @"
using System; using System.Runtime.InteropServices;
public class M {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, int d, IntPtr e);
}
"@
[M]::SetCursorPos(__X__, __Y__)
Start-Sleep -Milliseconds 80
[M]::mouse_event(0x0002, 0, 0, 0, [IntPtr]::Zero)
Start-Sleep -Milliseconds 40
[M]::mouse_event(0x0004, 0, 0, 0, [IntPtr]::Zero)
`;

const PASTE_PS = `
Add-Type -AssemblyName System.Windows.Forms
Set-Clipboard -Value ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('__B64__')))
Start-Sleep -Milliseconds 120
[System.Windows.Forms.SendKeys]::SendWait('^v')
`;

const KEY_PS = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('__KEY__')
`;

ipcMain.handle('orion:info', () => ({ work: WORK, pwsh: PWSH, version: app.getVersion() }));

ipcMain.handle('orion:abort', async (e, { runId }) => {
  aborted.add(runId);
  const set = children.get(runId);
  if (set) for (const c of set) { try { spawn(TASKKILL, ['/PID', String(c.pid), '/T', '/F'], { windowsHide: true }); } catch (er) {} }
  return { ok: true };
});

ipcMain.handle('orion:tool', async (e, { runId, name, args }) => {
  args = args || {};
  const perms = args.__perms || 'workspace';
  const out = (ok, output, extra) => Object.assign({ ok, output: String(output || '') }, extra || {});
  try {
    if (aborted.has(runId)) return out(false, '任务已停止');
    if (name === 'finish') return out(true, '任务已结束', { final: true });

    const jailed = (p) => perms !== 'full' && !insideWork(p || '.');

    if (name === 'read') {
      if (jailed(args.file_path)) return out(false, '[拒绝] 只读取工作区文件。');
      return out(true, await toolRead(args));
    }
    if (name === 'write' || name === 'edit') {
      if (jailed(args.file_path)) return out(false, '[拒绝] 只能写工作区文件。');
      return out(true, name === 'write' ? await toolWrite(args) : await toolEdit(args));
    }
    if (name === 'list_dir') {
      if (jailed(args.path)) return out(false, '[拒绝] 只能列工作区目录。');
      return out(true, await toolList(args));
    }
    if (name === 'pwsh') {
      if (!args.command) return out(false, '缺少 command');
      if (perms === 'read') return out(false, '[拒绝] 只读权限不能执行命令。');
      if (perms !== 'full' && ((args.workdir && !insideWork(args.workdir)) || DANGER.test(args.command))) {
        return out(false, '[拒绝] 当前权限只允许在工作区执行安全命令。请在任务面板切到“完全访问”后重试。');
      }
      const r = await runPwsh(args.command, {
        cwd: path.resolve(WORK, args.workdir || '.'),
        timeoutMs: Math.min(300000, Math.max(2000, parseInt(args.timeoutMs, 10) || 30000)),
        runId,
      });
      return out(r.ok, r.output);
    }
    if (name === 'screenshot') {
      const r = await runPwsh(SHOT_PS, { timeoutMs: 20000, runId });
      if (!r.ok) return out(false, r.output);
      return out(true, '已截屏（' + Math.round(Buffer.byteLength(r.output, 'base64') / 1024) + ' KB）', { image: 'data:image/png;base64,' + r.output });
    }
    if (name === 'click') {
      if (perms !== 'full') return out(false, '[拒绝] 鼠标操作需要“完全访问”。');
      const x = Math.round(parseFloat(args.x)), y = Math.round(parseFloat(args.y));
      if (!isFinite(x) || !isFinite(y)) return out(false, '坐标无效');
      let script = MOUSE_PS.replace(/__X__/g, x).replace(/__Y__/g, y);
      if (args.double) {
        script += '\nStart-Sleep -Milliseconds 140\n[M]::mouse_event(0x0002,0,0,0,[IntPtr]::Zero)\nStart-Sleep -Milliseconds 40\n[M]::mouse_event(0x0004,0,0,0,[IntPtr]::Zero)';
      }
      const r = await runPwsh(script, { timeoutMs: 15000, runId });
      return out(r.ok, r.ok ? '已点击 (' + x + ',' + y + ')' + (args.double ? ' 双击' : '') : r.output);
    }
    if (name === 'type') {
      if (perms !== 'full') return out(false, '[拒绝] 键盘输入需要“完全访问”。');
      const text = String(args.text || '');
      if (!text) return out(false, 'text 为空');
      if (text.length > 20000) return out(false, '一次输入过长');
      const b64 = Buffer.from(text, 'utf8').toString('base64');
      const r = await runPwsh(PASTE_PS.replace('__B64__', b64), { timeoutMs: 20000, runId });
      return out(r.ok, r.ok ? '已输入 ' + text.length + ' 个字符' : r.output);
    }
    if (name === 'key') {
      if (perms !== 'full') return out(false, '[拒绝] 按键操作需要“完全访问”。');
      const keys = String(args.keys || '');
      if (!/^[A-Za-z0-9^%~+(){}[\]@\-_. ]{1,40}$/.test(keys)) return out(false, '按键序列不合法');
      const r = await runPwsh(KEY_PS.replace('__KEY__', keys.replace(/'/g, "''")), { timeoutMs: 15000, runId });
      return out(r.ok, r.ok ? '已按下 ' + keys : r.output);
    }
    if (name === 'launch') {
      if (perms !== 'full') return out(false, '[拒绝] 启动程序需要“完全访问”。');
      const target = String(args.target || '');
      if (!target || /["\r\n]/.test(target)) return out(false, 'target 无效');
      const r = await runPwsh('Start-Process -FilePath "' + target.replace(/"/g, '') + '"', { timeoutMs: 15000, runId });
      return out(r.ok, r.ok ? '已启动 ' + target : r.output);
    }
    return out(false, '未知工具：' + name);
  } catch (err) {
    return out(false, '工具出错：' + (err && err.message ? err.message : String(err)));
  }
});

let win = null;
{
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  function createWindow() {
    win = new BrowserWindow({
      width: 1200, height: 820, minWidth: 900, minHeight: 600,
      backgroundColor: '#ffffff',
      title: 'Orion',
      icon: fs.existsSync(ICO) ? ICO : undefined,
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        preload: path.join(app.getAppPath(), 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false,
        backgroundThrottling: false
      }
    });
    Menu.setApplicationMenu(null);
    const ext = path.join(BASE, 'Orion.html');
    const inside = path.join(app.getAppPath(), 'Orion.html');
    const target = fs.existsSync(ext) ? ext : inside;
    win.loadFile(target);
    win.once('ready-to-show', () => win.show());

    if (process.env.DS_SHOT) {
      win.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          win.webContents.capturePage().then((img) => {
            fs.writeFileSync(process.env.DS_SHOT, img.toPNG());
            app.quit();
          }).catch((er) => { console.error(er); app.quit(); });
        }, 1200);
      });
    }

    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (e, url) => {
      if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
    });
    win.webContents.on('before-input-event', (e, input) => {
      const k = (input.key || '').toLowerCase();
      if (k === 'f12' || (input.control && input.shift && k === 'i') || (input.control && k === 'r')) e.preventDefault();
    });
  }

  app.whenReady().then(() => {
    try {
      const allow = ['media', 'audioCapture', 'clipboard-read', 'clipboard-sanitized-write', 'notifications'];
      session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(allow.indexOf(permission) >= 0));
      session.defaultSession.setPermissionCheckHandler((wc, permission) => allow.indexOf(permission) >= 0);
    } catch (er) { console.error(er); }
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
