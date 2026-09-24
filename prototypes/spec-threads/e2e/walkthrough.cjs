// End-to-end walk through the demo app in a real browser.
//   npm run build && npm run preview -- --port 4179   (in one terminal)
//   npm run e2e                                        (in another)
// Uses your installed Google Chrome via playwright-core; no browser download needed.
const { chromium } = require('playwright-core');
const path = require('node:path');
const BASE = process.env.BASE_URL || 'http://localhost:4179/';
const SHOTS = process.env.SHOTS_DIR || require('node:os').tmpdir();
const shot = (name) => path.join(SHOTS, `spec-threads-${name}.png`);
const out = [];
const check = (name, ok, extra = '') => { out.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const isGiscus = (t) => /giscus/i.test(t);
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  // giscus is third-party: while its GitHub app is not installed on the org it answers 403 and logs an error.
  let giscusOpen = false;
  page.on('console', (m) => { if (m.type() === 'error' && !isGiscus(m.text()) && !giscusOpen) errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => { if (!isGiscus(r.url())) errors.push('requestfailed: ' + r.url()); });
  page.on('response', (r) => {
    if (r.status() >= 400 && !isGiscus(r.url())) errors.push('http ' + r.status() + ': ' + r.url());
    if (/\.woff2?$/.test(r.url()) && !(r.headers()['content-type'] || '').includes('font')) errors.push('font served as non-font: ' + r.url());
  });
  const go = async (hash) => { await page.goto(BASE + '#' + hash); };

  // 1. Projects home
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.project-card');
  check('home shows 3 seeded projects', (await page.locator('.project-card').count()) === 3);
  check('first visit shows the guide', await page.locator('.guide').isVisible());
  const spear = page.locator('.project-card', { hasText: 'Spearhead' });
  check('Spearhead: PT1 in build, PT2 in discussion', (await spear.innerText()).includes('PT1') && (await spear.locator('.project-version.is-discussing').innerText()).includes('PT2'));
  check('Spearhead PT2 shows 3 open · 1 resolved', /3\s+open · 1 resolved/.test(await spear.locator('.project-version.is-discussing').innerText()));
  check('Quiver Mini is empty on purpose', (await page.locator('.project-card', { hasText: 'Quiver Mini' }).innerText()).includes('0 open'));
  await page.screenshot({ path: shot('1-projects') });

  // 2. Project page: versions strip, tabs, lead sees Freeze
  await spear.click();
  await page.waitForSelector('.version-card');
  check('three version cards', (await page.locator('.version-card').count()) === 3);
  check('PT2 card is the discussing one with a freeze target', (await page.locator('.version-card.is-discussing').innerText()).includes('Freeze target 2026-11-15'));
  check('lead (Omar) sees the Freeze button', await page.locator('.version-card.is-discussing a.btn', { hasText: 'Freeze PT2' }).isVisible());
  check('PT2 tab selected by default with 4 threads', (await page.locator('.tab.on').innerText()).replace(/\s+/g, ' ') === 'PT2 4');
  check('threads listed, open first', (await page.locator('.thread-item').count()) === 4 && (await page.locator('.thread-item').first().innerText()).includes('OPEN'));
  check('resolved thread carries its resolution chip', (await page.locator('.thread-item', { hasText: 'wingspan' }).innerText()).includes('PROMOTED TO SPEC'));
  await page.click('.tab:has-text("PT1")');
  check('PT1 tab: nothing addressed to the build version', await page.locator('text=No threads here yet').isVisible());
  await page.screenshot({ path: shot('2-project') });

  // 3. Thread page: weighted ordering, lead's resolve card, version chip
  await go('/threads/n-engine');
  await page.waitForSelector('.position');
  check('thread shows version chip with state', (await page.locator('.chip-version').first().innerText()).includes('PT2') && (await page.locator('.chip-version').first().innerText()).toLowerCase().includes('in discussion'));
  check('crowd and weighting agree on the engine thread', await page.locator('.picks-agree').isVisible());
  const firstAuthor = await page.locator('.position').first().locator('.position-meta strong').innerText();
  check('top position by weighted score is the expert\'s', firstAuthor === '@jun-pcb', firstAuthor);
  const w0 = await page.locator('.position').first().locator('.score-weighted').innerText();
  check('top position weighted score', w0 === '+18.81', w0);
  check('lead sees the resolve card with four actions', (await page.locator('.lead-card .resolve-actions .btn').count()) === 4);
  const leadWeight = await page.locator('.weight-total').innerText();
  check('lead weight box (lead, expert match)', leadWeight === '6.82', leadWeight);
  await page.screenshot({ path: shot('3-thread-lead'), fullPage: true });

  // 4. Non-lead: no resolve card, weight 1
  await page.selectOption('.persona select', 'm-ade');
  await page.waitForFunction(() => document.querySelector('.weight-total')?.textContent === '1');
  check('newcomer weight is 1', true);
  check('non-lead sees no resolve card', (await page.locator('.lead-card').count()) === 0);
  const hint = await page.locator('.position').first().locator('button[aria-label=Upvote]').getAttribute('title');
  check('vote button says what your vote counts', hint === 'Upvote · your vote counts 1', hint);
  await page.locator('.position').first().locator('button[aria-label=Upvote]').click();
  await page.waitForFunction(() => document.querySelector('.position .score-weighted')?.textContent === '+19.81');
  check('upvote adds weighted 1', true);
  await page.locator('.position').first().locator('button[aria-label=Upvote]').click();
  await page.waitForFunction(() => document.querySelector('.position .score-weighted')?.textContent === '+18.81');
  check('clicking again clears the vote', true);

  // 5. Post a position with an XSS attempt; must be sanitized
  await page.fill('textarea', '### Sneaky\n\n<img src=x onerror="window.__xss=1"> <script>window.__xss=1</script> **bold**');
  await page.click('text=Post position');
  await page.waitForFunction(() => document.querySelectorAll('.position').length === 4);
  const fresh = page.locator('.position.is-flash', { hasText: 'Sneaky' });
  await fresh.waitFor();
  check('posting a position takes you to it', await fresh.isVisible());
  await page.waitForTimeout(300);
  check('markdown is sanitized (no script ran)', (await page.evaluate(() => window.__xss)) === undefined);
  check('no onerror attribute survives', (await page.locator('.md img[onerror]').count()) === 0);

  // 6. Lead resolves from the thread page: turn the engine thread into a grant (weighted top, no rationale)
  await page.selectOption('.persona select', 'm-omar');
  await page.waitForSelector('.lead-card');
  await page.locator('.lead-card .btn-grant').click();
  await page.waitForSelector('.pick-row');
  check('grant panel lists positions with the weighted top marked', (await page.locator('.pick-row').count()) === 4 && (await page.locator('.pick-row.on').innerText()).includes('WEIGHTED TOP'));
  check('no rationale needed for the weighted top', await page.locator('text=No rationale needed').isVisible());
  check('proposer award defaults to 25%', (await page.locator('.resolve-form input[type=number]').inputValue()) === '25');
  await page.locator('.resolve-form button[type=submit]').click();
  await page.waitForSelector('.resolution-grant');
  check('thread shows it was turned into a grant', /turned into a grant/i.test(await page.locator('.resolution-grant').innerText()));
  check('voting closed after resolution', await page.locator('button[aria-label=Upvote]').first().isDisabled());
  check('reply box gone after resolution', (await page.locator('h3:has-text("Reply with a position")').count()) === 0);
  await page.screenshot({ path: shot('4-thread-resolved'), fullPage: true });

  // 7. Grant draft: pre-filled, editable, markdown, publish
  await page.locator('a.btn', { hasText: 'Open the grant draft' }).click();
  await page.waitForSelector('.bounty-md');
  const md = await page.locator('.bounty-md').innerText();
  check('grant markdown carries the need, the spec, and the proposer award', md.includes('## The need') && md.includes('## The spec') && md.includes('Proposer award: **25%** of the grant to @jun-pcb'));
  check('constraints extracted from the discussion', md.includes('- Engine RPM from a Hall sensor, 0 to 12 kHz') && md.includes('- Mass under 25 g'));
  check('a measurable comment made it into the constraints, a long prose one did not', md.includes('9 kHz') && !md.includes('- Add a kill-switch input'));
  check('contributors attributed', md.includes('**Also contributed:**') && md.includes('@rosa-ranch'));
  const issue = await page.locator('a', { hasText: 'Open as GitHub issue' }).getAttribute('href');
  check('issue link targets grant-and-bounties', issue.startsWith('https://github.com/Arrow-air/grant-and-bounties/issues/new?'));
  await page.fill('input[type=text]', 'Engine interface board for PT2');
  await page.fill('input[type=number]', '30');
  await page.waitForFunction(() => document.querySelector('.bounty-md')?.textContent.includes('# Grant: Engine interface board for PT2'));
  check('edits preview live in the markdown', (await page.locator('.bounty-md').innerText()).includes('**30%**'));
  await page.click('button:has-text("Save draft")');
  await page.waitForSelector('text=Saved.');
  await page.click('button:has-text("Publish")');
  await page.waitForSelector('.chip:has-text("published")');
  check('grant published, fields locked', await page.locator('input[type=text]').isDisabled());
  await page.screenshot({ path: shot('5-grant'), fullPage: true });

  // 8. Freeze screen: progress, resolve the rest, freeze
  await go('/p/spearhead/freeze/sh-pt2');
  await page.waitForSelector('.freeze-row');
  check('freeze progress 2 / 4', (await page.locator('.freeze-progress .stat-value').innerText()).replace(/\s+/g, ' ') === '2 / 4');
  check('Freeze button disabled while threads are open', await page.locator('.freeze-progress button', { hasText: 'Freeze PT2' }).isDisabled());
  check('two threads still open', (await page.locator('.freeze-row').count()) === 2);
  await page.screenshot({ path: shot('6-freeze'), fullPage: true });

  // 8a. Avionics -> spec, but override: promote... there is only one position, so it is the weighted top. Promote it.
  const avionics = page.locator('.freeze-row', { hasText: 'Avionics carrier' });
  await avionics.locator('button:has-text("Resolve")').click();
  await avionics.locator('.btn-spec').click();
  await avionics.locator('.resolve-form button[type=submit]').click();
  await page.waitForFunction(() => document.querySelector('.freeze-progress .stat-value')?.textContent.replace(/\s+/g, ' ') === '3 / 4');
  check('promote to spec advances progress to 3 / 4', true);

  // 8b. Payload -> defer to PT3 with a note
  const payload = page.locator('.freeze-row', { hasText: 'Payload bay' });
  await payload.locator('button:has-text("Resolve")').click();
  await payload.locator('.btn-defer').click();
  check('defer offers PT3', (await payload.locator('.resolve-form select').inputValue()) === 'sh-pt3');
  await payload.locator('.resolve-form input[type=text]').fill('Not done being discussed.');
  await payload.locator('.resolve-form button[type=submit]').click();
  await page.waitForFunction(() => document.querySelector('.freeze-progress .stat-value')?.textContent.replace(/\s+/g, ' ') === '4 / 4');
  check('defer advances progress to 4 / 4', true);
  check('nothing open, freeze enabled', await page.locator('.freeze-progress button', { hasText: 'Freeze PT2' }).isEnabled());
  check('deferred section lists the payload thread', (await page.locator('h2:has-text("1 deferred") + ul').innerText()).includes('Payload bay'));

  // 8c. Freeze
  page.once('dialog', (d) => d.accept());
  await page.locator('.freeze-progress button', { hasText: 'Freeze PT2' }).click();
  await page.waitForSelector('.signal-agree:has-text("PT2 is frozen")');
  check('PT2 frozen, PT3 in discussion', (await page.locator('.signal-agree').innerText()).includes('PT3 is now in discussion'));
  await page.screenshot({ path: shot('7-frozen'), fullPage: true });
  await go('/p/spearhead');
  await page.waitForSelector('.version-card.is-frozen');
  check('project page shows PT2 frozen and PT3 discussing', (await page.locator('.version-card.is-discussing .version-name').innerText()) === 'PT3');
  check('new-thread button now targets PT3', (await page.locator('a.btn', { hasText: 'Post a thread for PT3' }).count()) === 1);

  // 9. Register has both decisions
  await page.click('nav >> text=Register');
  await page.waitForSelector('table.register');
  check('register lists 2 Spearhead decisions', (await page.locator('table.register tbody tr').count()) === 2);
  check('avionics decision names the chosen position', (await page.locator('table.register').innerText()).includes('Hint: run two CAN buses'));

  // 10. Override rationale on the Quiver thread (Lena picks the crowd favourite)
  await page.selectOption('.persona select', 'm-lena');
  await go('/threads/n-power');
  await page.waitForSelector('.lead-card');
  check('Quiver thread: crowd and weighting disagree', await page.locator('.picks-disagree').isVisible());
  await page.locator('.lead-card .btn-spec').click();
  await page.waitForSelector('.pick-row');
  await page.locator('.pick-row', { hasText: 'Go big' }).locator('input[type=radio]').check();
  check('override asks for a rationale', await page.locator('text=Why this one?').isVisible());
  const goBtn = page.locator('.resolve-form button[type=submit]');
  check('submit disabled until rationale is long enough', await goBtn.isDisabled());
  await page.locator('.resolve-form textarea').fill('too short');
  check('live counter shows progress', (await page.locator('.resolve-form [aria-live]').innerText()).trim() === '9 / 20');
  await page.locator('.resolve-form textarea').fill('We expect heavy spray rigs to dominate orders next year, so headroom matters more than weight.');
  check('enabled once rationale is long enough', await goBtn.isEnabled());
  await goBtn.click();
  await page.waitForSelector('.resolution-spec');
  check('rationale published on the thread', await page.locator('text=Lead\'s rationale').isVisible());

  // 11. Readout
  await page.click('nav >> text=Readout');
  await page.waitForSelector('.stat-value');
  const stats = await page.locator('.stat-grid').first().locator('.stat-value').allInnerTexts();
  check('readout: weighting changed winner 1/3, override 1/4', stats[0].replace(/\s+/g, ' ') === '1 / 3' && stats[1].replace(/\s+/g, ' ') === '1 / 4', stats.join(' | '));
  const ends = await page.locator('h2:has-text("How threads end") ~ .stat-grid .stat-value').allInnerTexts();
  check('how threads end: 0 rejected, 3 spec, 1 grant, 1 deferred', ends.slice(0, 4).join(',') === '0,3,1,1', ends.join(' | '));
  check('grants table lists the published grant at 30%', (await page.locator('h2:has-text("Grants and proposer awards") ~ .table-scroll').innerText()).includes('30%'));
  check('override rationale listed', await page.locator('text=Override rationales').isVisible());
  await page.screenshot({ path: shot('8-readout'), fullPage: true });

  // 12. New thread flow: defaults to the version in discussion, carries a system
  await page.click('nav >> text=Threads');
  await page.click('text=Post a thread');
  await page.waitForSelector('h1:has-text("Post a thread")');
  await page.selectOption('form select.field >> nth=0', 'spearhead');
  check('version defaults to PT3 now that PT2 is frozen', (await page.locator('form select.field >> nth=1').inputValue()) === 'sh-pt3');
  await page.selectOption('form select.field >> nth=2', 'airframe');
  await page.fill('input[placeholder^="Gasoline"]', 'Wing spar material');
  await page.fill('textarea', 'Carbon or aluminium?');
  await page.fill('input[placeholder="pcb, power"]', 'Airframe, airframe , structures');
  check('tags dedupe + lowercase in preview', (await page.locator('form .chip').allInnerTexts()).join(',').toLowerCase() === 'airframe,structures');
  await page.click('button:has-text("Post thread")');
  await page.waitForSelector('h1:has-text("Wing spar material")');
  check('new thread created, addressed to PT3 with a system chip', (await page.locator('.chip-version').first().innerText()).includes('PT3') && (await page.locator('.chip-system').first().innerText()).toLowerCase() === 'airframe');
  const lw = await page.locator('.weight-total').innerText();
  check('Quiver lead is plain member on Spearhead (1+1.61+1)*1 = 3.61', lw === '3.61', lw);

  // 13. Persistence across reload, then reset
  await page.reload();
  await page.waitForSelector('h1:has-text("Wing spar material")');
  check('state persists across reload', true);
  page.once('dialog', (d) => d.accept());
  await page.click('text=Reset demo data');
  await page.click('nav >> text=Projects');
  await page.waitForFunction(() => /3\s+open/.test(document.querySelector('.project-card .project-version.is-discussing')?.textContent || ''));
  check('reset restores seed', true);

  // 14. How page + signed out
  await page.click('nav >> text=How it works');
  await page.waitForSelector('text=Versions and the freeze');
  await page.screenshot({ path: shot('9-how'), fullPage: true });
  await page.selectOption('.persona select', '');
  await go('/threads/n-engine');
  await page.waitForSelector('.position');
  check('signed out: vote buttons disabled', await page.locator('button[aria-label=Upvote]').first().isDisabled());
  check('signed out: prompted to sign in', await page.locator('text=Sign in to reply.').isVisible());

  // 15. Mobile layout
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('no horizontal overflow on thread at 390px', overflow <= 1, 'overflow px: ' + overflow);
  await page.selectOption('.persona select', 'm-jun');
  await page.waitForSelector('.mobile-weight', { state: 'visible' });
  check('mobile: sticky weight bar shows for a signed-in voter', (await page.locator('.mobile-weight b').innerText()) === '4.28');
  await go('/p/spearhead/freeze/sh-pt2');
  await page.waitForSelector('.freeze-row');
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('no horizontal overflow on freeze screen at 390px', overflow <= 1, 'overflow px: ' + overflow);
  await page.screenshot({ path: shot('10-mobile-freeze'), fullPage: true });
  await page.click('nav >> text=Readout');
  await page.waitForSelector('.thread-card');
  check('mobile: readout uses cards, not a clipped table', (await page.locator('.thread-card').first().isVisible()) && !(await page.locator('.thread-table').isVisible()));
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('mobile: no horizontal overflow on readout', overflow <= 1, 'overflow px: ' + overflow);
  await page.setViewportSize({ width: 1280, height: 900 });

  // 16. Discussion pins still work
  await go('/threads/n-power');
  await page.waitForSelector('.picks .pin');
  check('thread page carries discussion pins', (await page.locator('.page .pin').count()) >= 4);
  giscusOpen = true;
  await page.locator('.picks .pin').click();
  await page.waitForSelector('.drawer');
  check('pin opens its own thread', (await page.locator('.drawer-title').innerText()).startsWith('When the crowd and the weighting disagree'));
  await page.waitForFunction(() => document.querySelector('.drawer iframe.giscus-frame') || document.querySelector('.drawer .card a.btn'), null, { timeout: 15000 });
  await page.keyboard.press('Escape');
  await page.waitForSelector('.drawer', { state: 'detached' });
  check('Escape closes the drawer', true);
  giscusOpen = false;

  // 17. Old prototype-1 links redirect
  await go('/needs/n-power');
  await page.waitForSelector('h1:has-text("Attachment interface")');
  check('/needs/:id redirects to the thread', page.url().includes('#/threads/n-power'));

  check('no console or page errors', errors.length === 0, errors.slice(0, 3).join(' || '));
  console.log(out.join('\n'));
  await browser.close();
  process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0);
})().catch((e) => { console.log(out.join('\n')); console.error('CRASH', e.message.split('\n')[0]); process.exit(2); });
