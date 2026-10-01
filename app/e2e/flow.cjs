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
  check(!(await panel.getByRole('button', { name: 'Delete thread' }).count()), 'a member cannot delete someone else\'s thread');
  await panel.getByRole('button', { name: 'Vote up' }).first().click();
  check((await panel.locator('.cm-vote .n').first().innerText()).trim() === '1', 'member up-vote counts 1');
  await p.getByRole('button', { name: /^Demo/ }).click();
  await p.getByRole('radio', { name: 'Lead' }).click();
  await p.getByRole('button', { name: /^Demo/ }).click();
  check((await panel.locator('.cm-vote .n').first().innerText()).trim() === '2', 'same vote counts 2 as lead');
  await panel.getByLabel('Decision note').fill('Cheapest change; test it before any board spin.');
  await panel.getByRole('button', { name: 'Record decision' }).click();
  await p.waitForTimeout(200);
  check((await panel.innerText()).includes('D-003'), 'decision gets D-003 (D-001 and D-002 are the T-01 decisions from GitHub)');

  // Decision → bounty: fund it, publish, claim, submit, accept; proposer award held until confirmed.
  await panel.getByRole('button', { name: 'Fund it as a bounty or grant' }).click();
  await panel.getByLabel('Acceptance').fill('Relocated M9N holds 15+ satellites with both switches powered, over a 10 minute hover log.');
  await panel.getByLabel('Reward in ARROW').fill('800');
  check((await panel.innerText()).includes('Proposer award 25%: 200 ARROW to Erick'), 'draft previews the proposer award to the idea\'s author');
  await panel.getByRole('button', { name: 'Draft bounty' }).click();
  await p.waitForTimeout(200);
  check((await panel.locator('.wc .stage').innerText()) === 'Draft' && /W-1/.test(await panel.locator('.pipe').innerText()), 'bounty W-1 drafted and shown in the pipeline');
  check(/held until a lead confirms/i.test(await panel.locator('.wc').innerText()), 'proposer award is held for a person named in the notes');
  await panel.getByRole('button', { name: 'Confirm' }).click();
  await panel.getByRole('button', { name: 'Publish bounty' }).click();
  await panel.getByRole('button', { name: 'Claim this bounty' }).click();
  await panel.getByLabel('Evidence').fill('https://github.com/Arrow-air/project-quiver/pull/999');
  await panel.getByRole('button', { name: 'Submit for review' }).click();
  await panel.getByRole('button', { name: 'Accept', exact: true }).click();
  await p.waitForTimeout(200);
  const wc = await panel.locator('.wc').innerText();
  check(wc.includes('Accepted') && wc.includes('confirmed by You'), 'bounty goes draft → open → claimed → review → accepted');
  await p.goto(`${BASE}/quiver/work/grants`);
  await p.waitForTimeout(400);
  check((await text()).includes('W-1') && (await text()).includes('Accepted'), 'grants page lists the accepted bounty');

  await p.goto(`${BASE}/quiver/overview/v1-1`);
  await p.waitForTimeout(500);
  const spec = await p.locator('.changes').innerText();
  check(spec.includes('D-003') && spec.includes('W-1') && spec.includes('Accepted'), 'v1.1 spec lists the decision with its bounty');
  await p.goto(`${BASE}/quiver/overview/v1-1?thread=Q-3`);
  await p.waitForTimeout(300);
  check((await panel.innerText()).includes('W-1 has been taken on, so this decision stays') && !(await panel.getByRole('button', { name: 'Reopen as discussion' }).count()), 'a decision whose work was taken on can\'t be reopened');
  await p.keyboard.press('Escape');
  await p.goto(`${BASE}/quiver/overview/v1-1`);
  await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'Propose an improvement' }).click();
  await p.getByLabel('Zone').selectOption('power');
  await p.getByLabel('Title').fill('Add a battery strap retention check');
  await p.getByRole('button', { name: 'Propose', exact: true }).click();
  await p.waitForTimeout(300);
  check((await panel.innerText()).includes('Dev Kit v1.1') && (await panel.locator('a.home, .home').first().innerText()) === 'Power & battery', 'proposal opens as a v1.1 thread in its zone');
  check((await p.locator('.grp', { hasText: 'Power & battery' }).innerText()).includes('Add a battery strap retention check'), 'proposal shows under its zone on the v1.1 page');

  await p.goto(`${BASE}/quiver/decisions/register`);
  await p.waitForTimeout(500);
  const reg = await text();
  check(reg.includes('D-001') && reg.includes('#248') && reg.includes('D-003') && reg.includes('Cheapest change') && reg.includes('longer cable'), 'register lists the GitHub decisions and D-003 with note and choice');
  await p.locator('a.q').first().click();
  await p.waitForTimeout(300);
  check(p.url().includes('/decisions/register') && (await panel.count()) === 1, 'register opens the same panel in place');

  // New thread, then a position on it.
  await p.goto(`${BASE}/quiver/attachments/payload-latch`);
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'New thread' }).click();
  await p.getByLabel('Title').fill('Rate the latch for 5 kg?');
  await p.getByLabel('Description').fill('Test thread from the flow check.');
  check((await p.getByRole('radio', { name: 'Question' }).getAttribute('aria-checked')) === 'true', 'a new thread starts as a question, chosen inside the composer');
  await p.getByRole('button', { name: 'Post thread' }).click();
  await p.waitForTimeout(300);
  check((await panel.locator('h1.title').innerText()).includes('Rate the latch for 5 kg?'), 'new thread opens in the panel');
  await panel.getByLabel('New comment').fill('Yes, with a second structural path.');
  await panel.getByRole('button', { name: 'Comment', exact: true }).click();
  await p.waitForTimeout(200);
  check((await panel.innerText()).includes('Yes, with a second structural path.'), 'position added');
  const top = panel.locator('.cm.top').first();
  check((await top.locator('.letter').first().innerText()) === 'A', 'a top-level comment is option A');
  await top.getByRole('button', { name: 'Reply', exact: true }).first().click();
  await top.getByRole('textbox', { name: 'Reply' }).fill('Which path, the tether or a second plate?');
  await top.locator('.cm-reply').getByRole('button', { name: 'Reply', exact: true }).click();
  await p.waitForTimeout(200);
  const reply = top.locator('.cm-kids .cm').first();
  check((await reply.innerText()).includes('Which path') && !(await reply.locator('.letter').count()), 'a reply nests under the comment, without an option letter');
  await reply.getByRole('button', { name: 'Reply', exact: true }).first().click();
  await reply.getByRole('textbox', { name: 'Reply' }).fill('A second plate.');
  await reply.locator('.cm-reply').getByRole('button', { name: 'Reply', exact: true }).click();
  await p.waitForTimeout(200);
  check((await reply.locator('.cm-kids .cm').first().innerText()).includes('A second plate.'), 'replies nest to any depth');
  await reply.getByRole('button', { name: 'Vote up' }).first().click();
  await p.waitForTimeout(150);
  check((await reply.locator('.cm-vote .n').first().innerText()).trim() !== '0', 'replies can be voted on');
  check((await panel.locator('.choices button').count()) === 1, 'only top-level comments are offered for adoption');

  // Deleting comments: your own reply goes; an option with replies leaves a placeholder.
  const leaf = reply.locator('.cm-kids .cm').first();
  await leaf.getByRole('button', { name: 'Delete this reply' }).click();
  await leaf.getByRole('button', { name: 'Yes, delete' }).click();
  await p.waitForTimeout(200);
  check(!(await panel.innerText()).includes('A second plate.'), 'you delete your own reply and it goes');
  await top.getByRole('button', { name: 'Delete option A' }).click();
  check((await top.locator('.confirm').innerText()).includes('Its replies stay.'), 'deleting an option with replies says the replies stay');
  await top.getByRole('button', { name: 'Yes, delete' }).click();
  await p.waitForTimeout(200);
  const after1 = await panel.innerText();
  check(!after1.includes('Yes, with a second structural path.') && after1.includes('Which path, the tether') && (await top.locator('.gone-note').first().innerText()) === 'Deleted', 'a deleted option keeps its place for its replies, without its words');
  check(!(await panel.locator('.choices button').count()) && !(await top.locator(':scope > .cm-vote button').count()), 'a deleted option can no longer be adopted or voted on');

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
  check((await p.locator('.crumbs').innerText()).includes('Dev Kit'), 'a picked part shows its path from the aircraft');
  await p.locator('.crumbs button.crumb').first().click();
  await p.locator('button.tile[data-zone="power"]').waitFor({ timeout: 5000 });
  await p.locator('button.tile[data-zone="power"]').click();
  await p.locator('button.tile[data-part]').first().waitFor({ timeout: 5000 });
  check(p.url().includes('zone=power') && (await p.locator('button.tile[data-part]').count()) === 5, 'an area drills down to its parts');
  await p.locator('button.tile[data-part="3410"]').click();
  await p.locator('.p-name').waitFor({ timeout: 5000 });
  check((await p.locator('.p-name').innerText()).includes('Battery') && (await p.locator('aside.side').innerText()).includes('Tattu'), 'parts list selects the battery and shows its BOM facts');
  await p.getByRole('button', { name: /Start a thread about Battery/ }).click();
  await p.getByLabel('Title').fill('Add a second retention strap to the battery');
  await p.getByRole('button', { name: 'Post thread' }).click();
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

  // PCBs: pick a component on the battery board, propose a change anchored to it.
  await p.goto(`${BASE}/quiver/overview/pcbs?board=battery`);
  await p.waitForSelector('.stage[data-ready="true"]', { timeout: 30000 });
  await p.locator('button.part[data-ref="U3"]').click();
  await p.waitForTimeout(300);
  check((await p.locator('.c-ref').innerText()) === 'U3' && (await p.locator('.c-name').innerText()).includes('CPC1019N'), 'battery PCB component card shows the part');
  await p.getByRole('button', { name: /Start a thread about U3/ }).click();
  await p.getByLabel('Title').fill('Swap U3 for a relay rated for the Longshot charge current');
  await p.getByRole('button', { name: 'Post thread' }).click();
  await p.waitForTimeout(300);
  const pp = await panel.innerText();
  check(/About\s+U3\s+on the Battery PCB/.test(pp) && (await panel.locator('.home').first().innerText()) === 'Power & battery', 'PCB proposal is anchored to the component, in the board\'s zone');

  // Power & battery is about Longshot now.
  await p.goto(`${BASE}/quiver/overview/power`);
  await p.waitForTimeout(400);
  const pw = await text();
  check(pw.includes('Longshot PT1 vs. the Tattu') && pw.includes('Longshot BMS: emulate the Tattu BMS'), 'power page leads with Longshot integration and its threads');

  // Retro pool, decline, defer the rest, freeze.
  await p.goto(`${BASE}/quiver/overview/gps-rf?thread=Q-4`);
  await p.waitForTimeout(400);
  await panel.getByRole('radio', { name: 'Decline' }).click();
  await panel.getByLabel('Decline reason').fill('Waiting on the Fusion sync in PR #266 before choosing parts.');
  await panel.getByRole('button', { name: 'Decline', exact: true }).click();
  await p.waitForTimeout(200);
  check((await panel.locator('.state').innerText()).includes('Declined'), 'lead can decline with a reason');
  await p.goto(`${BASE}/quiver/overview/v1-1`);
  await p.waitForTimeout(400);
  await p.getByLabel('Retro pool in ARROW').fill('1000');
  const inFive = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  await p.getByLabel('Freeze date').fill(inFive);
  await p.getByRole('button', { name: 'Save plan' }).click();
  await p.waitForTimeout(200);
  const clock = p.locator('footer.footer .freeze');
  check(/Dev Kit v1\.1 design freeze in [45]d/.test(await clock.innerText()) && (await clock.getAttribute('data-level')) === 'soon', 'footer counts down to the freeze date, amber inside two weeks');
  await p.goto(`${BASE}/quiver/overview/v1-1?thread=Q-19`);
  await p.waitForTimeout(300);
  check((await panel.locator('.due').innerText()).includes('Settles by freeze'), 'an open v1.1 thread says it settles by the freeze');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(150);
  const pre = await p.locator('.alloc').innerText();
  check(pre.includes('If it froze now') && pre.includes('Erick') && pre.includes('held until a lead confirms'), 'retro preview splits the pool by support, holding shares for people named in notes');
  check(!(await p.getByRole('button', { name: 'Freeze Dev Kit v1.1' }).isEnabled()), 'freeze is blocked while threads are open');
  await p.getByRole('button', { name: 'Defer the rest to Dev Kit v1.2' }).click();
  await p.waitForTimeout(200);
  await p.getByRole('button', { name: 'Freeze Dev Kit v1.1' }).click();
  await p.waitForTimeout(300);
  const after = await text();
  check(after.includes('Frozen') && after.includes('Recorded split'), 'freeze records the retro split and locks the spec');
  check((await clock.innerText()).includes('design frozen'), 'footer shows the version frozen');

  // Deleting: an author removes their own fresh thread; a lead removes any thread.
  await p.goto(`${BASE}/quiver/overview/airframe`);
  await p.waitForTimeout(400);
  await p.getByRole('button', { name: /^Demo/ }).click();
  await p.getByRole('radio', { name: 'Member' }).click();
  await p.getByRole('button', { name: /^Demo/ }).click();
  await p.getByRole('button', { name: 'New thread' }).click();
  await p.getByLabel('Title').fill('Posted by mistake');
  await p.getByRole('button', { name: 'Post thread' }).click();
  await p.waitForTimeout(300);
  await panel.getByRole('button', { name: 'Delete thread' }).click();
  await panel.getByRole('button', { name: 'Delete thread' }).last().click();
  await p.waitForTimeout(300);
  check(!(await panel.count()) && !(await text()).includes('Posted by mistake'), 'an author deletes their own untouched thread');
  await p.getByRole('button', { name: /^Demo/ }).click();
  await p.getByRole('radio', { name: 'Lead' }).click();
  await p.getByRole('button', { name: /^Demo/ }).click();
  await p.goto(`${BASE}/quiver/selling/who-we-sell-to?thread=Q-10`);
  await p.waitForTimeout(400);
  await panel.getByRole('button', { name: 'Delete thread' }).click();
  await panel.getByLabel('Reason for deleting').fill('off-topic');
  await panel.getByRole('button', { name: 'Delete thread' }).last().click();
  await p.waitForTimeout(300);
  await p.goto(`${BASE}/quiver/discussion/all`);
  await p.waitForTimeout(400);
  check(!(await p.locator('.row[data-thread="Q-10"]').count()), 'a lead deletes a seeded thread and it leaves every list');

  // A lead removes anyone's comment; the adopted option stays on the record.
  await p.goto(`${BASE}/quiver/overview/power?thread=Q-19`);
  await p.waitForTimeout(400);
  const optB = panel.locator('.cm.top').filter({ hasText: 'Native DroneCAN battery messages.' });
  await optB.getByRole('button', { name: /^Delete option / }).click();
  await optB.getByRole('button', { name: 'Yes, delete' }).click();
  await p.waitForTimeout(200);
  check(!(await panel.innerText()).includes('Native DroneCAN battery messages.'), 'a lead removes someone else\'s comment');
  await p.goto(`${BASE}/quiver/overview/gps-rf?thread=Q-6`);
  await p.waitForTimeout(400);
  check(!(await panel.locator('.cm.top.decided').getByRole('button', { name: /^Delete option / }).count()), 'the adopted option can\'t be deleted');
  await p.getByRole('button', { name: /^Demo/ }).click();
  await p.getByRole('radio', { name: 'Member' }).click();
  await p.getByRole('button', { name: /^Demo/ }).click();
  await p.goto(`${BASE}/quiver/overview/power?thread=Q-19`);
  await p.waitForTimeout(400);
  check((await panel.locator('.cm').count()) > 0 && !(await panel.getByRole('button', { name: /^Delete (option|this reply)/ }).count()), 'a member can\'t delete other people\'s comments');
  await p.getByRole('button', { name: /^Demo/ }).click();
  await p.getByRole('radio', { name: 'Lead' }).click();
  await p.getByRole('button', { name: /^Demo/ }).click();

  // Reopening: a lead puts a decision back into discussion; its open bounty is withdrawn; decided again, it keeps its number.
  await p.goto(`${BASE}/quiver/attachments/payload-latch?thread=Q-14`);
  await p.waitForTimeout(400);
  await panel.getByLabel('Decision note').fill('Good enough for V2.');
  await panel.getByRole('button', { name: 'Record decision' }).click();
  await p.waitForTimeout(200);
  const dec = (/D-\d{3}/.exec(await panel.locator('.pipe').innerText()) ?? [''])[0];
  await panel.getByRole('button', { name: 'Fund it as a bounty or grant' }).click();
  await panel.getByLabel('Acceptance').fill('It works.');
  await panel.getByLabel('Reward in ARROW').fill('100');
  await panel.getByRole('button', { name: 'Draft bounty' }).click();
  await panel.getByRole('button', { name: 'Publish bounty' }).click();
  await p.waitForTimeout(200);
  await panel.getByRole('button', { name: 'Reopen as discussion' }).click();
  check((await panel.locator('form.reopen').innerText()).includes('open bounty) is withdrawn') && (await panel.locator('form.reopen').innerText()).includes(`keeps ${dec}`), 'reopening says the open bounty is withdrawn and the number is kept');
  await panel.getByLabel('Why reopen').fill('New load data from the latch test.');
  await panel.getByRole('button', { name: 'Reopen', exact: true }).click();
  await p.waitForTimeout(300);
  const re = await panel.innerText();
  check(dec && re.includes(`${dec} (adopted`) && re.includes('reopened by You') && re.includes('New load data from the latch test.') && (await panel.getByText('Outcome, as lead').count()) > 0, 'the thread is back in discussion, with the reopened decision on its record');
  await p.goto(`${BASE}/quiver/work/grants`);
  await p.waitForTimeout(300);
  check((await text()).includes('Withdrawn (decision reopened)'), 'the bounty shows as withdrawn');
  await p.goto(`${BASE}/quiver/attachments/payload-latch?thread=Q-14`);
  await p.waitForTimeout(300);
  await panel.getByLabel('Decision note').fill('Still good for V2.');
  await panel.getByRole('button', { name: 'Record decision' }).click();
  await p.waitForTimeout(200);
  check((await panel.locator('.pipe').innerText()).includes(dec) && (await panel.getByRole('button', { name: 'Fund it as a bounty or grant' }).count()) > 0, 'decided again, it keeps its D-number and can be funded afresh');

  // Persistence and reset.
  await p.goto(`${BASE}/quiver/decisions/register`);
  await p.reload();
  await p.waitForTimeout(500);
  check((await text()).includes('D-003'), 'decision survives reload');
  await p.getByRole('button', { name: /^Demo/ }).click();
  await p.getByRole('button', { name: 'Reset demo' }).click();
  await p.waitForTimeout(300);
  check(!(await text()).includes('D-003') && (await text()).includes('D-002'), 'reset clears your decisions and keeps the seeded ones');

  check(!errors.length, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await b.close();
  srv.kill();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
