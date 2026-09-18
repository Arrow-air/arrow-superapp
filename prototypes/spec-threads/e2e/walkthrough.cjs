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
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push('http ' + r.status() + ': ' + r.url());
    if (/\.woff2?$/.test(r.url()) && !(r.headers()['content-type'] || '').includes('font')) errors.push('font served as non-font: ' + r.url());
  });

  // 1. Needs list
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.need-item');
  check('needs list shows 2 seeded needs', (await page.locator('.need-item').count()) === 2);
  check('list flags the disagreement', await page.locator('.need-item .chip-warn').first().isVisible());
  await page.screenshot({ path: require('node:path').join(SHOTS, 'spec-threads-1-needs.png') });

  // 2. Thread: weighted ordering and divergence banner
  await page.click('text=Attachment interface');
  await page.waitForSelector('.spec');
  check('divergence banner shown', await page.locator('.signal-diverge').first().isVisible());
  const firstAuthor = await page.locator('.spec').first().locator('.spec-meta strong').innerText();
  check('top spec by weighted score is the expert\'s', firstAuthor === '@jun-pcb', firstAuthor);
  const w0 = await page.locator('.spec').first().locator('.score-weighted').innerText();
  const r0 = await page.locator('.spec').first().locator('.score-raw').innerText();
  check('top spec scores', w0 === '+12.61' && r0 === 'raw +3', `${w0} / ${r0}`);
  const leadWeight = await page.locator('.weight-total').innerText();
  check('lead weight box', leadWeight === '5.22', leadWeight);
  await page.screenshot({ path: require('node:path').join(SHOTS, 'spec-threads-2-thread-lead.png'), fullPage: true });

  // 3. Who voted
  await page.locator('.spec').first().locator('text=who voted').click();
  check('voter chips list weights', (await page.locator('.spec').first().locator('.voter').count()) === 3);

  // 4. Switch persona to newcomer: weight 1, no promote button
  await page.selectOption('.persona select', 'm-ade');
  await page.waitForFunction(() => document.querySelector('.weight-total')?.textContent === '1');
  check('newcomer weight is 1', true);
  check('non-lead sees no promote button', (await page.locator('text=Promote to bounty').count()) === 0);

  // 5. Newcomer declares builder intent -> weight 2
  await page.locator('aside input[type=checkbox]').check();
  await page.waitForFunction(() => document.querySelector('.weight-total')?.textContent === '2');
  check('builder intent raises weight to 2', true);

  // 6. Newcomer flips vote on top spec: upvote adds 2
  await page.locator('.spec').first().locator('button[aria-label=Upvote]').click();
  await page.waitForFunction(() => document.querySelector('.spec .score-weighted')?.textContent === '+14.61');
  check('upvote adds weighted 2', true);
  // toggle off
  await page.locator('.spec').first().locator('button[aria-label=Upvote]').click();
  await page.waitForFunction(() => document.querySelector('.spec .score-weighted')?.textContent === '+12.61');
  check('clicking again clears the vote', true);

  // 7. Post a spec with an XSS attempt; must be sanitized
  await page.fill('textarea', '### Sneaky\n\n<img src=x onerror="window.__xss=1"> <script>window.__xss=1</script> **bold**');
  await page.click('text=Post spec');
  await page.waitForFunction(() => document.querySelectorAll('.spec').length === 4);
  await page.waitForTimeout(300);
  check('markdown is sanitized (no script ran)', (await page.evaluate(() => window.__xss)) === undefined);
  check('no onerror attribute survives', (await page.locator('.md img[onerror]').count()) === 0);

  // 8. Comment
  await page.locator('.spec').first().locator('.comment-form input').fill('Agree, this covers the gimbal case.');
  await page.locator('.spec').first().locator('.comment-form button').click();
  await page.waitForSelector('text=Agree, this covers the gimbal case.');
  check('comment posts', true);

  // 9. Lead overrides: promote the crowd favourite (not weighted top) -> needs rationale
  await page.selectOption('.persona select', 'm-lena');
  await page.waitForSelector('text=Promote to bounty');
  const maxSpec = page.locator('.spec', { hasText: 'Go big' });
  await maxSpec.locator('text=Promote to bounty').click();
  check('override asks for a rationale', await maxSpec.locator('text=Why this one?').isVisible());
  await maxSpec.locator('button', { hasText: /^Promote$/ }).click();
  check('blocked without rationale', await maxSpec.locator('.signal-diverge').isVisible());
  await maxSpec.locator('textarea').fill('We expect heavy spray rigs to dominate orders next year, so headroom matters more than weight.');
  await maxSpec.locator('button', { hasText: /^Promote$/ }).click();
  await page.waitForSelector('.bounty-md');
  check('promotion recorded, bounty generated', (await page.locator('.bounty-md').innerText()).includes('# Bounty: Attachment interface'));
  check('rationale published', await page.locator('text=Lead\'s rationale').isVisible());
  check('voting disabled after promotion', await page.locator('button[aria-label=Upvote]').first().isDisabled());
  check('reply box gone after promotion', (await page.locator('h3:has-text("Reply with a spec")').count()) === 0);
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

  // 11. New need flow
  await page.click('nav >> text=Needs');
  await page.click('text=Post a need');
  await page.waitForSelector('h1:has-text("Post a need")');
  await page.selectOption('form select.field', 'spearhead');
  await page.fill('input[placeholder^="Attachment"]', 'Wing spar material');
  await page.fill('textarea', 'Carbon or aluminium?');
  await page.fill('input[placeholder="pcb, power"]', 'Airframe, airframe , structures');
  check('tags dedupe + lowercase in preview', (await page.locator('form .chip').allInnerTexts()).join(',').toLowerCase() === 'airframe,structures');
  await page.click('button:has-text("Post need")');
  await page.waitForSelector('h1:has-text("Wing spar material")');
  check('new need created and opened', true);
  // Lena is NOT lead on spearhead: weight should be member-level w/ expertise match (airframe)
  const lw = await page.locator('.weight-total').innerText();
  check('Quiver lead is plain member on Spearhead (1+1.61+1)*1 = 3.61', lw === '3.61', lw);

  // 12. Persistence across reload, then reset
  await page.reload();
  await page.waitForSelector('h1:has-text("Wing spar material")');
  check('state persists across reload', true);
  page.once('dialog', (d) => d.accept());
  await page.click('text=Reset demo data');
  await page.click('nav >> text=Needs');
  await page.waitForFunction(() => document.querySelectorAll('.need-item').length === 2);
  check('reset restores seed', true);

  // 13. How page + profile + signed out
  await page.click('nav >> text=How weighting works');
  await page.waitForSelector('text=The lead keeps the final say');
  await page.screenshot({ path: require('node:path').join(SHOTS, 'spec-threads-5-how.png'), fullPage: true });
  await page.selectOption('.persona select', '');
  await page.click('nav >> text=Needs');
  await page.click('text=Attachment interface');
  await page.waitForSelector('.spec');
  check('signed out: vote buttons disabled', await page.locator('button[aria-label=Upvote]').first().isDisabled());
  check('signed out: prompted to sign in', await page.locator('text=Sign in to reply.').isVisible());

  // 14. Mobile layout
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('no horizontal overflow at 390px', overflow <= 1, 'overflow px: ' + overflow);
  await page.screenshot({ path: require('node:path').join(SHOTS, 'spec-threads-6-mobile.png'), fullPage: true });

  check('no console or page errors', errors.length === 0, errors.slice(0, 3).join(' || '));
  console.log(out.join('\n'));
  await browser.close();
  process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0);
})().catch((e) => { console.log(out.join('\n')); console.error('CRASH', e.message.split('\n')[0]); process.exit(2); });
