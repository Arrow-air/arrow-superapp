// Walks the demo's write paths against a built dist: vote, decide as lead,
// the register, a new thread, a proposed position, starting from a call
// suggestion, persistence across reload, and reset. node e2e/flow.cjs
const { chromium } = require('playwright-core');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const PORT = 4313;
const BASE = `http://localhost:${PORT}/#`;
const exe = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find((p) => fs.existsSync(p));
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };

(async () => {
  const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2000));
  const b = await chromium.launch({ executablePath: exe });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('dialog', (d) => d.accept());
  const text = () => p.locator('body').innerText();

  // Vote as a member, then decide as lead.
  await p.goto(`${BASE}/quiver/design/gps-rf?thread=Q-3`);
  await p.waitForTimeout(600);
  await p.getByRole('button', { name: 'Vote up' }).first().click();
  check((await p.locator('.vote .n').first().innerText()).trim() === '1', 'member up-vote counts 1');
  await p.getByRole('radio', { name: 'Lead' }).click();
  check((await p.locator('.vote .n').first().innerText()).trim() === '2', 'same vote counts 2 as lead');
  await p.getByPlaceholder('Why: the decision note').fill('Cheapest change; test it before any board spin.');
  await p.getByRole('button', { name: /^Decide on A$/ }).last().click();
  await p.waitForTimeout(200);
  check((await text()).includes('D-001'), 'decision gets D-001');

  await p.goto(`${BASE}/quiver/decisions/register`);
  await p.waitForTimeout(500);
  const reg = await text();
  check(reg.includes('D-001') && reg.includes('Cheapest change') && reg.includes('longer cable'), 'register lists D-001 with note and choice');

  // New thread in a zone, then a proposed position on it.
  await p.goto(`${BASE}/quiver/design/airframe`);
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'New thread' }).click();
  await p.getByLabel('Title').fill('Stiffen the arm mounts?');
  await p.getByLabel('Thread context').fill('Test thread from the flow check.');
  await p.getByRole('button', { name: 'Start' }).click();
  await p.waitForTimeout(300);
  check((await p.locator('h1.title').innerText()).includes('Stiffen the arm mounts?'), 'new thread opens selected');
  await p.getByPlaceholder('Write a reply, or propose a position…').fill('Add a gusset at each arm root.');
  await p.getByRole('button', { name: 'Propose as position' }).click();
  await p.waitForTimeout(200);
  check((await text()).includes('Add a gusset at each arm root.'), 'proposed position shows');

  // Start a discussion from a call suggestion.
  await p.goto(`${BASE}/quiver/discussion/suggested`);
  await p.waitForTimeout(500);
  const before = await p.getByRole('button', { name: 'Start a discussion' }).count();
  await p.getByRole('button', { name: 'Start a discussion' }).first().click();
  await p.waitForTimeout(500);
  check(/thread=Q-\d+/.test(p.url()), 'suggestion starts a thread in its zone');
  check((await text()).includes('call notes, which name'), 'thread credits the notes as source');
  await p.goto(`${BASE}/quiver/discussion/suggested`);
  await p.waitForTimeout(400);
  check((await p.getByRole('button', { name: 'Start a discussion' }).count()) === before - 1, 'suggestion drops out once picked up');

  // Persistence and reset.
  await p.reload();
  await p.goto(`${BASE}/quiver/decisions/register`);
  await p.waitForTimeout(500);
  check((await text()).includes('D-001'), 'decision survives reload');
  await p.getByRole('button', { name: 'Reset demo' }).click();
  await p.waitForTimeout(300);
  check((await text()).includes('Nothing decided yet'), 'reset clears the register');

  check(!errors.length, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await b.close();
  srv.kill();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
