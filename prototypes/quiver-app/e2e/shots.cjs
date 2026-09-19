// Serves dist and screenshots every screen. node e2e/shots.cjs [outDir]
const { chromium } = require('playwright-core');
const { spawn } = require('node:child_process');
const out = process.argv[2] || '/tmp/qa-shots';
require('node:fs').mkdirSync(out, { recursive: true });
(async () => {
  const srv = spawn('npx', ['serve', '-s', 'dist', '-l', '4178'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1500));
  const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const shot = async (name, hash, wait = 400, fn) => { await page.goto('http://localhost:4178/#' + hash); await page.waitForTimeout(wait); if (fn) await fn(); await page.screenshot({ path: `${out}/${name}.png`, fullPage: name !== '2-aircraft' && name !== '3-part' }); };
  await shot('1-home', '/');
  await shot('2-aircraft', '/aircraft', 3500);
  await shot('3-part', '/aircraft/3331', 3500, async () => { await page.locator('input[type=range]').fill('0.7'); await page.waitForTimeout(500); });
  await shot('4-attachments', '/attachments');
  await shot('5-decisions', '/decisions');
  await shot('6-decision', '/decisions/attach-power', 400, async () => { await page.getByRole('button', { name: 'Back this' }).nth(2).click(); });
  await shot('7-work', '/work'); await shot('8-task', '/work/T-06'); await shot('9-spec', '/work/spec');
  await shot('10-money', '/money'); await shot('11-flights', '/flights'); await shot('12-guides', '/guides'); await shot('13-market', '/market');
  console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'no console errors');
  await browser.close(); srv.kill();
})();
