// Walks the demo's main paths against a built dist: open a thread in the
// panel from a zone, vote, decide as lead, the register, a new thread and a
// position, starting from a call suggestion, the same panel from another
// page, scroll reset, Esc, persistence, and reset. node e2e/flow.cjs
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
  const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('dialog', (d) => d.accept());
  const text = () => p.locator('body').innerText();
  const panel = p.locator('aside.panel');

  // A zone opens on its page, not on a thread.
  await p.goto(`${BASE}/quiver/overview/gps-rf`);
  await p.waitForTimeout(600);
  check(!(await panel.count()), 'zone page opens with no thread open');
  await p.locator('.row[data-thread="Q-3"]').click();
  await p.waitForTimeout(300);
  check((await panel.locator('h1.title').innerText()).includes('GPS interference'), 'row opens the thread in the panel');
  check((await p.locator('.zp-title').isVisible()), 'zone page stays visible behind the panel');

  // Vote, then decide as lead from the Demo menu.
  await panel.getByRole('button', { name: 'Vote up' }).first().click();
  check((await panel.locator('.vote .n').first().innerText()).trim() === '1', 'member up-vote counts 1');
  await p.getByRole('button', { name: /^Demo/ }).click();
  await p.getByRole('radio', { name: 'Lead' }).click();
  await p.getByRole('button', { name: /^Demo/ }).click();
  check((await panel.locator('.vote .n').first().innerText()).trim() === '2', 'same vote counts 2 as lead');
  await panel.getByLabel('Decision note').fill('Cheapest change; test it before any board spin.');
  await panel.getByRole('button', { name: 'Record decision' }).click();
  await p.waitForTimeout(200);
  check((await panel.innerText()).includes('D-001'), 'decision gets D-001');

  await p.goto(`${BASE}/quiver/overview/v1-1`);
  await p.waitForTimeout(500);
  check((await p.locator('.changes').innerText()).includes('D-001'), 'v1.1 page lists the decision in its change list');
  await p.getByRole('button', { name: 'Propose an improvement' }).click();
  await p.getByLabel('Where the change is').selectOption('power');
  await p.getByLabel('Improvement').fill('Add a battery strap retention check');
  await p.getByRole('button', { name: 'Propose', exact: true }).click();
  await p.waitForTimeout(300);
  check((await panel.innerText()).includes('Dev Kit v1.1') && (await panel.locator('a.home, .home').first().innerText()) === 'Power & battery', 'proposal opens as a v1.1 thread in its zone');
  check((await p.locator('.grp', { hasText: 'Power & battery' }).innerText()).includes('Add a battery strap retention check'), 'proposal shows under its zone on the v1.1 page');

  await p.goto(`${BASE}/quiver/decisions/register`);
  await p.waitForTimeout(500);
  const reg = await text();
  check(reg.includes('D-001') && reg.includes('Cheapest change') && reg.includes('longer cable'), 'register lists D-001 with note and choice');
  await p.locator('a.q').first().click();
  await p.waitForTimeout(300);
  check(p.url().includes('/decisions/register') && (await panel.count()) === 1, 'register opens the same panel in place');

  // New thread, then a position on it.
  await p.goto(`${BASE}/quiver/attachments/payload-latch`);
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'New thread' }).click();
  await p.getByLabel('Title').fill('Rate the latch for 5 kg?');
  await p.getByLabel('Thread context').fill('Test thread from the flow check.');
  await p.getByRole('button', { name: 'Start thread' }).click();
  await p.waitForTimeout(300);
  check((await panel.locator('h1.title').innerText()).includes('Rate the latch for 5 kg?'), 'new thread opens in the panel');
  await panel.getByRole('button', { name: 'Add a position' }).click();
  await panel.getByLabel('New position').fill('Yes, with a second structural path.');
  await panel.getByRole('button', { name: 'Add position' }).click();
  await p.waitForTimeout(200);
  check((await panel.innerText()).includes('Yes, with a second structural path.'), 'position added');
  await panel.getByLabel('Reply').fill('A reply, not a position.');
  await panel.getByRole('button', { name: 'Reply', exact: true }).click();
  await p.waitForTimeout(200);
  check((await panel.locator('.reply').last().innerText()).includes('A reply, not a position.'), 'reply lands under replies');

  // Start a discussion from a call suggestion.
  await p.goto(`${BASE}/quiver/discussion/suggested`);
  await p.waitForTimeout(500);
  const before = await p.getByRole('button', { name: 'Start a discussion' }).count();
  await p.getByRole('button', { name: 'Start a discussion' }).first().click();
  await p.waitForTimeout(400);
  check(/thread=Q-\d+/.test(p.url()) && (await panel.count()) === 1, 'suggestion starts a thread and opens it');
  check((await panel.innerText()).includes('call notes, which name'), 'thread credits the notes as source');
  check((await p.getByRole('button', { name: 'Start a discussion' }).count()) === before - 1, 'suggestion drops out once picked up');

  // Road to selling opens a thread from another zone in the same panel.
  await p.goto(`${BASE}/quiver/selling/road-to-selling`);
  await p.waitForTimeout(500);
  await p.locator('.links a', { hasText: 'Q-3' }).click();
  await p.waitForTimeout(300);
  check((await panel.locator('h1.title').innerText()).includes('GPS interference') && (await panel.locator('a.home').innerText()) === 'GPS & RF', 'gate link opens Q-3 with a link to its zone');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  check(!(await panel.count()), 'Esc closes the panel');

  // Scroll does not carry between pages.
  await p.goto(`${BASE}/quiver/overview/gps-rf`);
  await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('.slot').scrollTo(0, 9999));
  await p.locator('.sidebar a', { hasText: 'Power & battery' }).click();
  await p.waitForTimeout(400);
  check((await p.evaluate(() => document.querySelector('.slot').scrollTop)) === 0, 'next page starts at the top');

  // The 3D model: click a part, propose a change for v1.1 anchored to it.
  await p.goto(`${BASE}/quiver/overview/model`);
  await p.waitForSelector('.viewer[data-ready="true"]', { timeout: 30000 });
  await p.waitForTimeout(500);
  const cv = await p.locator('.viewer canvas').boundingBox();
  await p.mouse.click(cv.x + cv.width / 2, cv.y + cv.height / 2);
  await p.waitForTimeout(400);
  check(/part=\d{4}/.test(p.url()), 'clicking the model selects a part');
  await p.getByRole('button', { name: '← All parts' }).click();
  await p.getByRole('button', { name: /Power & battery/ }).click();
  await p.locator('button.part[data-part="3410"]').click();
  await p.waitForTimeout(300);
  check((await p.locator('.p-name').innerText()).includes('Battery, Tattu'), 'parts list selects the battery and shows its BOM facts');
  await p.getByRole('button', { name: /Propose a change for Dev Kit v1.1/ }).click();
  await p.getByLabel('Proposed change').fill('Add a second retention strap to the battery');
  await p.getByRole('button', { name: 'Propose', exact: true }).click();
  await p.waitForTimeout(300);
  const pt = await panel.innerText();
  if (process.env.DEBUG) console.log('PANEL:', pt.slice(0, 300), '| HOME:', await panel.locator('.home').first().innerText());
  check(/About\s+3410/.test(pt) && pt.includes('Dev Kit v1.1') && (await panel.locator('.home').first().innerText()) === 'Power & battery', 'proposal is anchored to the part, in its zone, for v1.1');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  check((await p.locator('aside.side').innerText()).includes('Add a second retention strap'), 'part card lists the new thread');
  await p.goto(`${BASE}/quiver/overview/v1-1`);
  await p.waitForTimeout(400);
  check((await p.locator('.grp', { hasText: 'Power & battery' }).innerText()).includes('Add a second retention strap'), 'v1.1 page shows the part proposal under its zone');

  // Persistence and reset.
  await p.goto(`${BASE}/quiver/decisions/register`);
  await p.reload();
  await p.waitForTimeout(500);
  check((await text()).includes('D-001'), 'decision survives reload');
  await p.getByRole('button', { name: /^Demo/ }).click();
  await p.getByRole('button', { name: 'Reset demo' }).click();
  await p.waitForTimeout(300);
  check((await text()).includes('Nothing decided yet'), 'reset clears the register');

  check(!errors.length, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await b.close();
  srv.kill();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
