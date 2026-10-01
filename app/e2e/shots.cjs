// Serves dist and screenshots the main screens. node e2e/shots.cjs [outDir]
const { chromium } = require('playwright-core');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const out = process.argv[2] || '/tmp/superapp-shots';
fs.mkdirSync(out, { recursive: true });
const PORT = 4312;
const exe = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find((p) => fs.existsSync(p));
const shots = [
  ['00-v1-1', '#/quiver/overview/v1-1'],
  ['00b-model', '#/quiver/overview/model?part=3250'],
  ['01-summary', '#/quiver/overview/summary'],
  ['02-catalog', '#/quiver/attachments/catalog'],
  ['03-latch-zone', '#/quiver/attachments/payload-latch'],
  ['04-latch-thread', '#/quiver/attachments/payload-latch?thread=Q-13'],
  ['05-quiverhub-thread', '#/quiver/software/quiverhub?thread=Q-17'],
  ['06-ground-station', '#/quiver/software/ground-station'],
  ['07-gps-rf', '#/quiver/overview/gps-rf'],
  ['08-road-to-selling', '#/quiver/selling/road-to-selling'],
  ['09-discussion-all', '#/quiver/discussion/all'],
  ['10-suggested', '#/quiver/discussion/suggested'],
  ['11-decisions', '#/quiver/decisions/register'],
  ['12-work', '#/quiver/work/tasks'],
  ['13-people', '#/quiver/overview/people'],
  ['14-calls', '#/quiver/overview/calls?item=sep29-10'],
];
(async () => {
  const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2000));
  const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  for (const [n, h] of shots) {
    await p.goto(`http://localhost:${PORT}/${h}`);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/${n}.png` });
  }
  await b.close();
  srv.kill();
  console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'no console errors');
})().catch((e) => { console.error(e); process.exit(1); });
