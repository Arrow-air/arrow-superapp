// Serves dist and screenshots the main screens. node e2e/shots.cjs [outDir]
const { chromium } = require('playwright-core');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const out = process.argv[2] || '/tmp/quiver-demo-shots';
fs.mkdirSync(out, { recursive: true });
const PORT = 4312;
const exe = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find((p) => fs.existsSync(p));
const shots = [
  ['01-road-to-selling', '#/quiver/overview/road-to-selling'],
  ['02-gps-rf', '#/quiver/design/gps-rf?thread=Q-3'],
  ['03-airframe', '#/quiver/design/airframe'],
  ['04-where-we-sell', '#/quiver/market/where-we-sell'],
  ['05-discussion-all', '#/quiver/discussion/all'],
  ['06-suggested', '#/quiver/discussion/suggested'],
  ['07-decisions', '#/quiver/decisions/register'],
  ['08-work', '#/quiver/work/tasks'],
  ['09-prs', '#/quiver/work/prs'],
  ['10-bom', '#/quiver/design/bom?part=3251'],
  ['11-people', '#/quiver/overview/people'],
  ['12-calls', '#/quiver/overview/calls?item=sep29-10'],
  ['13-obstacle', '#/quiver/testing/obstacle-avoidance'],
  ['14-power', '#/quiver/design/power'],
];
(async () => {
  const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2000));
  const b = await chromium.launch({ executablePath: exe });
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
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
