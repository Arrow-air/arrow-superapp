const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { approveBrief } = require('./brief-helper.cjs');
const BASE = process.env.BASE_URL || 'http://localhost:4186/';
const SHOTS = '/tmp/arrow-working-brief-review';
fs.mkdirSync(SHOTS, { recursive: true });
let checks = 0;
function check(name, condition) { assert.ok(condition, name); console.log('PASS ' + name); checks++; }
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const persona = async id => { await page.getByLabel('Demo persona').selectOption(id); await page.waitForFunction(id => document.querySelector('.persona select').value === id, id); };
  try {
    await page.goto(BASE + '#/p/spearhead?view=shape&thread=n-engine');
    await page.waitForSelector('.working-brief');
    check('curated starter is proposed, not pre-approved', await page.locator('.brief-item-status.proposed').count() === 5);
    check('source-linked independent requirement is visible', (await page.locator('[data-item-id="bi-kill"] .brief-sources').innerText()).includes('rosa-ranch'));
    check('approval blocked by unanswered questions and unreviewed material', await page.getByRole('button', { name: 'Approve this brief' }).isDisabled());
    await page.screenshot({ path: SHOTS + '/brief-desktop.png', fullPage: true });
    await page.locator('[data-item-id="bi-kill"] .brief-sources button').filter({ hasText: 'rosa-ranch' }).click();
    await page.waitForSelector('.brief-source-card.source-selected[open]');
    check('source opens the exact discussion contribution', (await page.locator('.source-selected .md').innerText()).includes('RC link'));
    await page.reload(); await page.waitForSelector('.brief-source-card.source-selected[open]');
    check('exact source deep link survives reload', new URLSearchParams(page.url().split('?')[1]).get('source') === 'position:s-kill');
    await persona('m-ade');
    await page.waitForFunction(() => !document.querySelector('.brief-decision'));
    check('contributor cannot approve or accept requirements', await page.getByRole('button', { name: 'Approve this brief' }).count() === 0);
    const hint = page.locator('.approach').filter({ hasText: 'Hint: whatever the board' });
    if (!(await hint.evaluate(n => n.open))) await hint.locator('> summary').click();
    await hint.getByRole('button', { name: 'Capture in brief' }).click();
    await page.waitForSelector('.brief-editor');
    check('capture preserves the selected source', await page.locator('.brief-source-picker input[value="position:s-kill"]').isChecked());
    await page.getByLabel('Brief item type').selectOption('question');
    await page.getByLabel('Brief item wording').fill('Does the independent path remain available after an FC reset?');
    await page.getByRole('button', { name: 'Save proposal' }).click();
    await page.waitForSelector('.brief-item-text:has-text("after an FC reset")');
    check('member adds a question without making it a requirement', await page.locator('.brief-item:has-text("after an FC reset") .brief-item-status').innerText() === 'OPEN QUESTION');
    await persona('m-omar');
    await page.waitForSelector('.brief-decision');
    await approveBrief(page);
    check('lead can resolve items, consider all sources, and approve a revision', await page.locator('.working-brief .workspace-badge').innerText() === 'Lead reviewed');
    await page.screenshot({ path: SHOTS + '/brief-approved.png', fullPage: true });
    const first = page.locator('.approach').first();
    if (!(await first.evaluate(n => n.open))) await first.locator('> summary').click();
    await first.locator('.workspace-comment-form input').fill('New concern: bus power may be lost during engine shutdown.');
    await first.getByRole('button', { name: 'Reply', exact: true }).click();
    await page.waitForSelector('.working-brief .workspace-badge:has-text("New discussion")');
    check('new reply invalidates the previously approved brief', await page.getByRole('button', { name: 'Approve this brief' }).isDisabled());
    await approveBrief(page);
    await page.locator('.lead-disclosure > summary').click();
    await page.locator('.lead-disclosure .btn-grant').click();
    check('grant selector describes an anchor, not a single winning specification', (await page.locator('.resolve-form').innerText()).includes('Scope comes from the approved working brief'));
    await page.locator('.resolve-form button[type=submit]').click();
    await page.waitForSelector('.grant-card'); await page.locator('.grant-card').click();
    await page.waitForSelector('.workspace-grant');
    const scope = await page.locator('.workspace-grant textarea').nth(0).inputValue();
    const requirements = await page.locator('.workspace-grant textarea').nth(1).inputValue();
    check('grant combines DroneCAN with the independent kill requirement', requirements.includes('DroneCAN') && requirements.includes('hardware engine-kill'));
    check('grant includes acceptance checks and resolved questions', scope.includes('Acceptance check:') && scope.includes('Resolved questions'));
    check('unreviewed numeric suggestions are not promoted into requirements', !requirements.includes('25 g') && !requirements.includes('50 V'));
    check('grant retains an immutable source snapshot', await page.locator('.brief-snapshot').count() === 1);
    const exportText = await page.locator('.bounty-md').innerText();
    check('export links retain workspace origin and target version', exportText.includes(BASE.replace(/\/$/, '') + '/#/p/') && exportText.includes('version=sh-pt2'));
    await page.locator('.brief-snapshot > summary').click();
    await page.locator('.workspace-grant textarea').first().fill('A deliberately edited grant scope.');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.waitForSelector('span:has-text("Saved.")');
    check('editing grant text leaves approved provenance intact', (await page.locator('.brief-snapshot').innerText()).includes('independent'));
    await page.reload(); await page.waitForSelector('.workspace-grant');
    check('grant edits survive reload', await page.locator('.workspace-grant textarea').first().inputValue() === 'A deliberately edited grant scope.');
    await page.goto(BASE + '#/p/spearhead?view=shape&thread=n-engine&version=sh-pt2');
    await page.waitForSelector('.working-brief');
    check('resolved brief is read-only', await page.getByRole('button', { name: 'Add to the brief' }).count() === 0);
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      check('no horizontal overflow at ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (width === 390) { await page.locator('.brief-jump').click(); await page.screenshot({ path: SHOTS + '/brief-mobile.png', fullPage: true }); }
    }
    check('no runtime errors', errors.length === 0);
    console.log(`${checks} brief checks passed. Screenshots: ${SHOTS}`);
  } catch (e) { await page.screenshot({ path: SHOTS + '/failure.png', fullPage: true }); console.error('Browser errors:', errors); throw e; }
  finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
