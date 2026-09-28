// The default public build (specs.arrowair.com): the example workspace in the visitor's browser.
// Walks the whole flow with personas: contribute as Sofia, settle and accept as Nadia, freeze, reset.
const { chromium } = require('playwright-core'), assert = require('node:assert/strict'), fs = require('node:fs');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4199/';
const OUT = '/tmp/arrow-example-e2e'; fs.mkdirSync(OUT, { recursive: true });
let n = 0; const check = (name, value) => { assert.ok(value, name); console.log('PASS ' + name); n++; };
const P = (q = '') => BASE + '#/p/spearhead' + q;

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const text = () => p.locator('main').innerText();
  const as = async (label) => { await p.getByLabel('Demo persona').selectOption({ label }); await p.waitForTimeout(300); };
  try {
    await p.goto(P());
    await p.getByRole('heading', { name: /Open questions for PT2/ }).waitFor();
    check('the example says it is fictional and runs in the browser', (await p.locator('.pw-banner').innerText()).includes('fictional') && (await p.locator('.pw-banner').innerText()).includes('stay in this browser'));
    check('the example opens with live discussions and suggestions from calls', (await p.locator('.pw-overview .pw-q').count()) >= 2 && (await p.locator('.pw-suggest .pw-item').count()) > 0);
    check('no server-only inbox in the example', (await p.locator('.pw-tab-inbox').count()) === 0);

    // Sofia picks up a call question and posts.
    await as('Sofia Reyes · contributor');
    await p.goto(P('?view=discussions&record=tail-gps-placement'));
    await p.getByRole('button', { name: 'Discuss this', exact: true }).click();
    await p.getByLabel('Your opening contribution').fill('Mount it off-board on a short mast; the tail PCB is noisy and we can move a mast without a board respin.');
    await p.getByRole('button', { name: 'Start discussion' }).click();
    await p.locator('.discussion-panel').waitFor();
    check('a contributor starts a discussion from a call question', (await p.locator('.approach').first().innerText()).includes('short mast'));
    check('nobody can support their own post', await p.getByRole('button', { name: 'Support this approach' }).first().isDisabled());

    // Nadia settles the main-board discussion with a decision and funds work.
    await as('Nadia Park · lead');
    await p.goto(P('?view=discussions'));
    await p.getByRole('link', { name: /Confirm the main-board interfaces/ }).first().click();
    await p.locator('.discussion-panel').waitFor();
    await p.getByRole('button', { name: /^Summary/ }).click();
    await p.getByRole('checkbox', { name: /Adopt into the PT2 spec/ }).check();
    check('the decision line is prefilled from the summary', (await p.getByLabel('Decision in one line').inputValue()).startsWith('Main board'));
    await p.getByLabel('Decision in one line').fill('Main board: six PWM, per-motor temperature, two CAN buses, gasoline outputs unpopulated');
    await p.getByRole('button', { name: 'Adopt and settle' }).click();
    await p.locator('.outcome-decision').waitFor();
    await p.goto(P('?view=spec&system=avionics'));
    await p.locator('#spec-avionics').waitFor();
    check('the decision lands in the spec as its answer', (await p.locator('#spec-avionics .pw-spec-line[data-kind="decided"]').first().innerText()).includes('six PWM'));

    // Nadia accepts Mara's submitted work.
    await p.goto(P('?view=work'));
    await p.getByRole('link', { name: /Tail servo regulator/ }).first().click();
    await p.getByRole('button', { name: 'Accept results' }).click();
    await p.getByText('ACCEPTED RESULTS', { exact: true }).waitFor();
    check('the lead accepts submitted work in one click', true);

    // Freeze PT2: defer what's left, freeze, see the recorded split.
    await p.goto(P('?view=freeze'));
    await p.locator('.pw-freeze-row').first().waitFor();
    for (let i = 0; i < 10 && await p.getByRole('button', { name: 'Defer', exact: true }).count(); i++) {
      await p.getByRole('button', { name: 'Defer', exact: true }).first().click();
      await p.getByRole('button', { name: 'Defer to PT3' }).click();
      await p.waitForTimeout(250);
    }
    p.once('dialog', (d) => d.accept());
    await p.getByRole('button', { name: 'Freeze PT2' }).click();
    await p.getByRole('heading', { name: /PT2 froze/ }).waitFor();
    check('freezing records the retro split in the browser', (await text()).includes('25,000 ARROW retro pool, recorded at the freeze'));
    await p.screenshot({ path: OUT + '/after-freeze.png', fullPage: true });

    // The aircraft model: parts carry discussions, and a new one can start from a part.
    await as('Sofia Reyes · contributor');
    await p.goto(P('?view=model'));
    await p.waitForFunction(() => window.__arrowModel?.ready, null, { timeout: 60000 });
    check('the aircraft model loads with its parts', (await p.evaluate(() => window.__arrowModel.meshes)) > 300);
    const canvas = await p.locator('.pw-model-canvas canvas').boundingBox();
    await p.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await p.waitForTimeout(300);
    check('clicking the model selects a part', (await p.evaluate(() => window.__arrowModel.selection)).length > 0);
    await p.evaluate(() => window.__arrowModel.select('fuselage/fuselage:1+fuselage_body:1+bulkheads:1/sta2'));
    await p.locator('.pw-model-title').filter({ hasText: 'Bulkheads' }).waitFor();
    check('a selected part lists the discussions about it', (await p.locator('.pw-model-panel').innerText()).includes('pass-through for the pusher battery harness'));
    await p.getByRole('button', { name: 'Start a discussion about this' }).click();
    await p.getByLabel('About').selectOption({ index: 1 });
    await p.getByLabel('Question or proposed change').fill('Can the bulkheads drop to 3 mm plywood for PT2?');
    await p.getByLabel('Context').fill('They look over-built for the loads in the stability note. Worth a quick FEA before cutting the next set.');
    await p.getByRole('button', { name: 'Post', exact: true }).click();
    await p.locator('.discussion-panel').waitFor();
    check('a discussion started on the model says which part it is about', (await p.locator('.pw-anchor').innerText()).includes('Fuselage › Bulkheads'));
    await p.getByRole('link', { name: 'View in the model →' }).click();
    await p.waitForFunction(() => window.__arrowModel?.ready && window.__arrowModel.selection === 'fuselage/fuselage:1+fuselage_body:1+bulkheads:1/', null, { timeout: 60000 });
    check('the discussion links back to its part in the model', (await p.locator('.pw-model-panel').innerText()).includes('drop to 3 mm plywood'));

    // Reset restores the example for the next visitor or demo.
    p.once('dialog', (d) => d.accept());
    await p.getByRole('button', { name: 'Reset the example' }).click();
    await p.locator('.pw-pill-live').filter({ hasText: 'PT2' }).waitFor();
    check('reset restores the example', (await p.locator('.pw-pill-live').innerText()).includes('PT2'));

    check('mobile layout fits', await (async () => { await p.setViewportSize({ width: 390, height: 844 }); await p.goto(P()); await p.waitForTimeout(500); return p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1); })());
    check('no runtime or console errors', errors.length === 0);
    console.log(n + ' example browser checks passed');
  } catch (e) {
    console.log('Errors', errors);
    await p.screenshot({ path: OUT + '/failure.png', fullPage: true });
    throw e;
  } finally { await b.close(); }
})();
