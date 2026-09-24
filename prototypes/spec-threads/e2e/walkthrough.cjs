// End-to-end walk through the demo app in a real browser.
//   npm run build && npm run preview -- --port 4179   (in one terminal)
//   npm run e2e                                        (in another)
// Uses your installed Google Chrome via playwright-core; no browser download needed.
const { chromium } = require('playwright-core');
const BASE = process.env.BASE_URL || 'http://localhost:4179/';
const SHOTS = process.env.SHOTS_DIR || require('node:os').tmpdir();
const out = [];
const check = (name, ok, extra = '') => { out.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const isGiscus = (t) => /giscus/i.test(t);
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  // giscus is third-party: while its GitHub app is not installed on the org it answers 403 and logs an error.
  // The drawer handles that on purpose, so keep it out of the "no errors" check.
  let giscusOpen = false;
  page.on('console', (m) => { if (m.type() === 'error' && !isGiscus(m.text()) && !giscusOpen) errors.push('console: ' + m.text()); });
  // Closing the drawer aborts giscus's in-flight frame load; that is not our failure.
  page.on('requestfailed', (r) => { if (!isGiscus(r.url())) errors.push('requestfailed: ' + r.url()); });
  page.on('response', (r) => {
    if (r.status() >= 400 && !isGiscus(r.url())) errors.push('http ' + r.status() + ': ' + r.url());
    if (/\.woff2?$/.test(r.url()) && !(r.headers()['content-type'] || '').includes('font')) errors.push('font served as non-font: ' + r.url());
  });

  // 1. Threads list
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.thread-item');
  check('threads list shows 2 seeded threads', (await page.locator('.thread-item').count()) === 2);
  check('list flags the disagreement', await page.locator('.thread-item .chip-warn').first().isVisible());
  check('first visit shows the guide', await page.locator('.guide').isVisible());
  await page.screenshot({ path: require('node:path').join(SHOTS, 'spec-threads-1-threads.png') });

  // 2. Thread: weighted ordering and divergence banner
  await page.click('text=Attachment interface');
  await page.waitForSelector('.position');
  check('pick comparison shows disagreement', await page.locator('.picks-disagree').isVisible());
  const picks = await page.locator('.pick-title').allInnerTexts();
  check('both picks named side by side', picks[0] === 'Go big: one high-power rail' && picks[1].startsWith('Two tiers'), picks.join(' | '));
  await page.locator('.pick-link').first().click();
  await page.waitForSelector('.position.is-flash');
  check('clicking a pick jumps to and highlights that position', (await page.locator('.position.is-flash .position-meta strong').innerText()) === '@sam-member');
  const firstAuthor = await page.locator('.position').first().locator('.position-meta strong').innerText();
  check('top position by weighted score is the expert\'s', firstAuthor === '@jun-pcb', firstAuthor);
  const w0 = await page.locator('.position').first().locator('.score-weighted').innerText();
  const r0 = await page.locator('.position').first().locator('.score-raw').innerText();
  check('top position scores', w0 === '+12.61' && r0 === 'raw +3', `${w0} / ${r0}`);
  const leadWeight = await page.locator('.weight-total').innerText();
  check('lead weight box', leadWeight === '5.22', leadWeight);
  await page.screenshot({ path: require('node:path').join(SHOTS, 'spec-threads-2-thread-lead.png'), fullPage: true });

  // 3. Who voted
  check('vote bar has one block per voter', (await page.locator('.position').first().locator('.votebar .seg').count()) === 3);
  const bar = await page.locator('.position').first().locator('.votebar').getAttribute('aria-label');
  check('vote bar is described for screen readers', /For: 12\.61 from/.test(bar), bar);
  await page.locator('.position').first().locator('.rank-line .link-btn').click();
  check('voter chips list weights', (await page.locator('.position').first().locator('.voter').count()) === 3);
  check('your own vote is marked in the bar', (await page.locator('.position').first().locator('.seg-me').count()) === 1);

  // 4. Switch persona to newcomer: weight 1, no promote button
  await page.selectOption('.persona select', 'm-ade');
  await page.waitForFunction(() => document.querySelector('.weight-total')?.textContent === '1');
  check('newcomer weight is 1', true);
  check('non-lead sees no promote button', (await page.locator('text=Promote to bounty').count()) === 0);
  const hint = await page.locator('.position').first().locator('button[aria-label=Upvote]').getAttribute('title');
  check('vote button says what your vote counts', hint === 'Upvote · your vote counts 1', hint);
  // hover bug: an active vote button must keep its white arrow on hover
  const mine = page.locator('.position', { hasText: 'Go big' }).locator('button[aria-label=Upvote]');
  await mine.hover();
  const arrow = await mine.evaluate((el) => getComputedStyle(el).color);
  check('active vote keeps white arrow on hover', arrow === 'rgb(255, 255, 255)', arrow);
  await page.mouse.move(0, 0);

  // 5. Newcomer declares builder intent -> weight 2
  await page.locator('aside input[type=checkbox]').check();
  await page.waitForFunction(() => document.querySelector('.weight-total')?.textContent === '2');
  check('builder intent raises weight to 2', true);

  // 6. Newcomer flips vote on top position: upvote adds 2
  await page.locator('.position').first().locator('button[aria-label=Upvote]').click();
  await page.waitForFunction(() => document.querySelector('.position .score-weighted')?.textContent === '+14.61');
  check('upvote adds weighted 2', true);
  // toggle off
  await page.locator('.position').first().locator('button[aria-label=Upvote]').click();
  await page.waitForFunction(() => document.querySelector('.position .score-weighted')?.textContent === '+12.61');
  check('clicking again clears the vote', true);

  // 7. Post a position with an XSS attempt; must be sanitized
  await page.fill('textarea', '### Sneaky\n\n<img src=x onerror="window.__xss=1"> <script>window.__xss=1</script> **bold**');
  await page.click('text=Post position');
  await page.waitForFunction(() => document.querySelectorAll('.position').length === 4);
  // An earlier highlight may still be fading, so wait for the highlight on the new position specifically.
  const fresh = page.locator('.position.is-flash', { hasText: 'Sneaky' });
  await fresh.waitFor();
  check('posting a position takes you to it', await fresh.isVisible());
  const inView = await fresh.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.top < window.innerHeight; });
  check('and scrolls it into view', inView);
  check('an unvoted position shows no rank noise', (await fresh.locator('.rank-line').innerText()).trim() === 'No votes yet');
  await page.waitForTimeout(300);
  check('markdown is sanitized (no script ran)', (await page.evaluate(() => window.__xss)) === undefined);
  check('no onerror attribute survives', (await page.locator('.md img[onerror]').count()) === 0);

  // 8. Comment
  await page.locator('.position').first().locator('.comment-form input').fill('Agree, this covers the gimbal case.');
  await page.locator('.position').first().locator('.comment-form button').click();
  await page.waitForSelector('text=Agree, this covers the gimbal case.');
  check('comment posts', true);

  // 9. Lead overrides: promote the crowd favourite (not weighted top) -> threads rationale
  await page.selectOption('.persona select', 'm-lena');
  await page.waitForSelector('text=Promote to bounty');
  const maxPosition = page.locator('.position', { hasText: 'Go big' });
  await maxPosition.locator('text=Promote to bounty').click();
  check('override asks for a rationale', await maxPosition.locator('text=Why this one?').isVisible());
  const go = maxPosition.locator('button', { hasText: /^Promote$/ });
  check('promote disabled until rationale is long enough', await go.isDisabled());
  await maxPosition.locator('textarea').fill('too short');
  check('live counter shows progress', (await maxPosition.locator('[aria-live]').innerText()).trim() === '9 / 20');
  check('still disabled at 9 characters', await go.isDisabled());
  await maxPosition.locator('textarea').fill('We expect heavy spray rigs to dominate orders next year, so headroom matters more than weight.');
  check('enabled once rationale is long enough', await go.isEnabled());
  await maxPosition.locator('button', { hasText: /^Promote$/ }).click();
  await page.waitForSelector('.bounty-md');
  check('promotion recorded, bounty generated', (await page.locator('.bounty-md').innerText()).includes('# Bounty: Attachment interface'));
  check('rationale published', await page.locator('text=Lead\'s rationale').isVisible());
  check('voting disabled after promotion', await page.locator('button[aria-label=Upvote]').first().isDisabled());
  check('reply box gone after promotion', (await page.locator('h3:has-text("Reply with a position")').count()) === 0);
  const href = await page.locator('a', { hasText: 'Open as GitHub issue' }).getAttribute('href');
  check('issue link targets grant-and-bounties', href.startsWith('https://github.com/Arrow-air/grant-and-bounties/issues/new?'));
  await page.screenshot({ path: require('node:path').join(SHOTS, 'spec-threads-3-promoted.png'), fullPage: true });

  // 10. Readout
  await page.click('nav >> text=Readout');
  await page.waitForSelector('.stat-value');
  const stats = await page.locator('.stat-value').allInnerTexts();
  check('readout: weighting changed winner 1/1, override 1/1', stats[0] === '1 / 1' && stats[1] === '1 / 1', stats.join(' | '));
  check('override rationale listed', await page.locator('text=Override rationales').isVisible());
  await page.screenshot({ path: require('node:path').join(SHOTS, 'spec-threads-4-readout.png'), fullPage: true });

  // 11. New thread flow
  await page.click('nav >> text=Threads');
  await page.click('text=Post a thread');
  await page.waitForSelector('h1:has-text("Post a thread")');
  await page.selectOption('form select.field', 'spearhead');
  await page.fill('input[placeholder^="Attachment"]', 'Wing spar material');
  await page.fill('textarea', 'Carbon or aluminium?');
  await page.fill('input[placeholder="pcb, power"]', 'Airframe, airframe , structures');
  check('tags dedupe + lowercase in preview', (await page.locator('form .chip').allInnerTexts()).join(',').toLowerCase() === 'airframe,structures');
  await page.click('button:has-text("Post thread")');
  await page.waitForSelector('h1:has-text("Wing spar material")');
  check('new thread created and opened', true);
  // Lena is NOT lead on spearhead: weight should be member-level w/ expertise match (airframe)
  const lw = await page.locator('.weight-total').innerText();
  check('Quiver lead is plain member on Spearhead (1+1.61+1)*1 = 3.61', lw === '3.61', lw);

  // 12. Persistence across reload, then reset
  await page.reload();
  await page.waitForSelector('h1:has-text("Wing spar material")');
  check('state persists across reload', true);
  page.once('dialog', (d) => d.accept());
  await page.click('text=Reset demo data');
  await page.click('nav >> text=Threads');
  await page.waitForFunction(() => document.querySelectorAll('.thread-item').length === 2);
  check('reset restores seed', true);

  // 13. How page + profile + signed out
  await page.click('nav >> text=How weighting works');
  await page.waitForSelector('text=The lead keeps the final say');
  await page.screenshot({ path: require('node:path').join(SHOTS, 'spec-threads-5-how.png'), fullPage: true });
  await page.selectOption('.persona select', '');
  await page.click('nav >> text=Threads');
  await page.click('text=Attachment interface');
  await page.waitForSelector('.position');
  check('signed out: vote buttons disabled', await page.locator('button[aria-label=Upvote]').first().isDisabled());
  check('signed out: prompted to sign in', await page.locator('text=Sign in to reply.').isVisible());

  // 14. Mobile layout
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('no horizontal overflow at 390px', overflow <= 1, 'overflow px: ' + overflow);
  await page.screenshot({ path: require('node:path').join(SHOTS, 'spec-threads-6-mobile.png'), fullPage: true });

  check('mobile: your weight stays in view while voting', false === await page.locator('.mobile-weight').isVisible()); // signed out here
  await page.selectOption('.persona select', 'm-jun');
  await page.waitForSelector('.mobile-weight', { state: 'visible' });
  check('mobile: sticky weight bar shows for a signed-in voter', (await page.locator('.mobile-weight b').innerText()) === '4.28');
  const barBox = await page.locator('.mobile-weight').boundingBox();
  check('mobile: weight bar is pinned to the bottom', Math.abs(barBox.y + barBox.height - 844) <= 1, JSON.stringify(barBox));
  await page.click('nav >> text=Readout');
  await page.waitForSelector('.thread-card');
  check('mobile: readout uses cards, not a clipped table', (await page.locator('.thread-card').first().isVisible()) && !(await page.locator('.thread-table').isVisible()));
  check('mobile: no horizontal overflow on readout', (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.click('nav >> text=How weighting works');
  await page.waitForSelector('.calc');
  await page.click('.calc .chip-btn:has-text("10k")');
  check('calculator: member with 10k tokens', (await page.locator('.calc .weight-total').innerText()) === '2.04');
  await page.selectOption('.calc select', 'lead');
  await page.locator('.calc input[type=checkbox]').nth(0).check();
  await page.locator('.calc input[type=checkbox]').nth(1).check();
  check('calculator: lead + expert + builder', (await page.locator('.calc .weight-total').innerText()) === '8.08');

  await page.click('nav >> text=Threads');
  await page.click('text=Attachment interface');
  await page.waitForSelector('.stake-list li');
  const top = await page.locator('.stake-list li').first().innerText();
  check('thread sidebar ranks who counts most here', top.includes('@lena-lead') && top.includes('5.22'), top.replace(/\s+/g, ' '));
  check('you are marked in that list', (await page.locator('.stake-me').innerText()).includes('(you)'));

  // discussion pins
  await page.click('nav >> text=Threads');
  await page.click('text=Attachment interface');
  await page.waitForSelector('.picks .pin');
  check('thread page carries discussion pins', (await page.locator('.page .pin').count()) >= 5);
  giscusOpen = true;
  await page.locator('.picks .pin').click();
  await page.waitForSelector('.drawer');
  check('pin opens its own thread', (await page.locator('.drawer-title').innerText()).startsWith('When the crowd and the weighting disagree'));
  check('drawer shows the seeded question', (await page.locator('.drawer-hook').innerText()).length > 10);
  const gh = await page.locator('.drawer-body a', { hasText: 'Open on GitHub' }).getAttribute('href');
  check('drawer links to the right GitHub discussion', gh === 'https://github.com/Arrow-air/arrow-superapp/discussions/6', gh);
  check('focus moves into the drawer', await page.evaluate(() => !!document.activeElement?.closest('.drawer')));
  // Either giscus renders its frame, or we show the fallback. Never a dead end.
  await page.waitForFunction(() => document.querySelector('.drawer iframe.giscus-frame') || document.querySelector('.drawer .card a.btn'), null, { timeout: 15000 });
  const mode = (await page.locator('.drawer iframe.giscus-frame').count()) ? 'giscus frame' : 'fallback link';
  check('drawer ends in a usable state', true, mode);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.drawer', { state: 'detached' });
  check('Escape closes it and returns focus to the pin', await page.evaluate(() => !!document.activeElement?.classList.contains('pin')));
  await page.locator('.demo-strip .pin').click();
  await page.waitForSelector('.drawer');
  check('feedback pin opens the general thread', (await page.locator('.drawer-title').innerText()).startsWith('General feedback'));
  await page.locator('.drawer-close').click();
  await page.waitForSelector('.drawer', { state: 'detached' });
  giscusOpen = false;

  // guide dismissal persists, and reset brings it back
  await page.click('nav >> text=Threads');
  await page.click('.guide >> text=Hide this');
  await page.reload();
  await page.waitForSelector('.thread-item');
  check('dismissed guide stays dismissed', (await page.locator('.guide').count()) === 0);
  page.once('dialog', (d) => d.accept());
  await page.click('text=Reset demo data');
  await page.waitForSelector('.guide');
  check('reset brings the guide back', true);

  check('no console or page errors', errors.length === 0, errors.slice(0, 3).join(' || '));
  console.log(out.join('\n'));
  await browser.close();
  process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0);
})().catch((e) => { console.log(out.join('\n')); console.error('CRASH', e.message.split('\n')[0]); process.exit(2); });
