import { packager } from '@electron/packager';
try {
  const out = await packager({
    dir: process.cwd(),
    name: 'DeepSeek',
    platform: 'win32',
    arch: 'x64',
    out: 'dist',
    overwrite: true,
    icon: 'DeepSeek.ico',
    electronVersion: '35.0.0',
    prune: true,
    ignore: [/^\/dist/, /^\/data/, /^\/cache/]
  });
  console.log('OK', JSON.stringify(out));
} catch (e) {
  console.error('ERR', e && e.stack ? e.stack : e);
  process.exit(1);
}