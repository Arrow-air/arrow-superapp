// Shared workspace, two real accounts on two devices, against the isolated acceptance database.
// Walks the PT2 loop: read signed out → discuss a call question → weighted support → freeze plan
// and retro split → settle with a one-line decision → spec and record update → roles → freeze.
const { chromium } = require('playwright-core'), assert = require('node:assert/strict'), fs = require('node:fs');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4197/';
const users = JSON.parse(fs.readFileSync('.runtime/acceptance-users.json', 'utf8'));
const OUT = '/tmp/arrow-demo-e2e'; fs.mkdirSync(OUT, { recursive: true });
let n = 0; const check = (name, value) => { assert.ok(value, name); console.log('PASS ' + name); n++; };
const P = (q = '') => BASE + '#/p/spearhead' + q;

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const anonCtx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const leadCtx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const memberCtx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const anon = await anonCtx.newPage(), lead = await leadCtx.newPage(), member = await memberCtx.newPage();
  const errors = [];
  for (const p of [anon, lead, member]) { p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); }
  const settle = (p) => p.waitForTimeout(400);
  async function login(p, u) {
    await p.goto(BASE + '#/sign-in');
    await p.getByLabel('Email', { exact: true }).fill(u.email);
    await p.getByLabel('Password', { exact: true }).fill(u.password);
    await p.locator('main').getByRole('button', { name: 'Sign in', exact: true }).click();
    await p.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
  }
  const text = async (p) => p.locator('main').innerText();
  try {
    // Signed out: the project is readable and says what is happening.
    await anon.goto(P());
    await anon.getByRole('heading', { name: /Open questions for PT2/ }).waitFor();
    check('signed-out overview leads with PT2; call questions are suggestions, not open questions', (await text(anon)).includes('PT2 in design discussion') && (await anon.locator('.pw-overview .pw-q').count()) === 0 && (await anon.locator('.pw-suggest .pw-item').count()) > 3);
    await anon.goto(P('?view=discussions&record=servo-redundancy'));
    await anon.getByRole('heading', { name: 'How should the tail servo regulators fail independently?' }).waitFor();
    check('signed-out record invites sign-in instead of a dead end', (await text(anon)).includes('to start a discussion'));
    await anon.goto(P('?view=spec'));
    await anon.getByRole('heading', { name: 'PT2 spec' }).waitFor();
    check('the spec holds only what was settled in the app', (await anon.locator('.pw-spec').count()) >= 4 && (await anon.locator('.pw-spec-line:not([data-kind="decided"])').count()) === 0 && (await text(anon)).includes('Call notes and repository documents aren'));
    await anon.goto(P('?view=discussions&status=suggested'));
    await anon.locator('.pw-q').first().waitFor();
    check('call questions wait under Suggested from calls', (await anon.locator('.pw-q').count()) > 3);
    await anon.goto(BASE + '#/p/other-project');
    await anon.getByRole('heading', { name: 'Project not found' }).waitFor();
    check('unknown project is not silently shown as Spearhead', true);

    await login(lead, users[0]); await login(member, users[1]);

    // A PT1 question stays with the aircraft in build.
    await member.goto(P('?view=discussions&record=motor-imbalance'));
    await member.getByRole('button', { name: 'Discuss this', exact: true }).click();
    check('starting a discussion asks for an opening contribution first', await member.getByRole('button', { name: 'Start discussion' }).isDisabled());
    await member.getByLabel('Your opening contribution').fill('Log the heading and wind for each hover so we can separate tail loading from motor variation.');
    await member.getByRole('button', { name: 'Start discussion' }).click();
    await member.locator('.discussion-panel').waitFor();
    check('a PT1 question becomes a PT1 discussion', (await member.locator('.discussion-heading').innerText()).includes('PT1'));

    // A PT2 question from a call becomes a real discussion.
    await member.goto(P('?view=discussions&record=servo-redundancy'));
    await member.getByRole('button', { name: 'Discuss this', exact: true }).click();
    await member.getByLabel('Your opening contribution').fill('Separate regulators per servo keep one failure from taking out both tail surfaces.');
    await member.getByRole('button', { name: 'Start discussion' }).click();
    await member.locator('.discussion-panel').waitFor();
    const threadUrl = member.url();
    check('the opening post is contribution #1, credited to its author', (await member.locator('.approach').first().innerText()).includes('Separate regulators per servo'));
    check('nobody can support their own contribution', await member.getByRole('button', { name: 'Support this approach' }).first().isDisabled());
    await member.getByLabel('Add to the conversation').fill('Proposal: one regulator per servo, each with its own fuse, fed from the tail board.');
    await member.getByRole('button', { name: /Post contribution/ }).click();
    await member.locator('.approach').nth(1).waitFor();

    // The lead supports it; weighting is visible.
    await lead.goto(threadUrl);
    await lead.locator('.approach').first().waitFor();
    await lead.getByRole('button', { name: 'Support this approach' }).first().click();
    await lead.locator('.support-button.selected').first().waitFor();
    await settle(lead);
    check('support is weighted by role', (await lead.locator('.support-row').first().innerText()).includes('+2 weighted'));
    await lead.getByText('How support is weighted').click();
    check('the weight explanation names role and verified expertise', (await lead.locator('.weight-disclosure').innerText()).includes('verified'));

    // Freeze plan and retro split.
    await lead.goto(P('?view=freeze'));
    await lead.getByLabel('Freeze date').fill('2026-11-15');
    await lead.getByLabel('Retro pool ($ARROW)').fill('10000');
    await lead.getByRole('button', { name: 'Save plan' }).click();
    await lead.getByRole('status').filter({ hasText: 'Saved.' }).waitFor();
    await lead.locator('.pw-retro-line').first().waitFor();
    check('retro split previews the member’s share from weighted support', (await lead.locator('.pw-retro-line').first().innerText()).includes('Acceptance member') && (await lead.locator('.pw-retro-line').first().innerText()).includes('10,000 ARROW'));
    check('the header shows the freeze date', (await lead.locator('.pw-head-meta').innerText()).includes('Nov 15'));

    // Settle with a one-line decision.
    await lead.goto(threadUrl + '&tab=draft');
    await lead.getByRole('checkbox', { name: /Adopt into the PT2 spec/ }).check();
    check('the reason the settle button is disabled sits next to it', (await lead.locator('.settle-blockers').innerText()).includes('Save the summary first') && await lead.getByRole('button', { name: 'Adopt and settle' }).isDisabled());
    await lead.getByRole('button', { name: /^(Write a summary|Edit summary)$/ }).click();
    await lead.getByLabel('Draft document').fill('Separate regulator per tail servo, each fused, fed from the tail board.\n\nKeeps a single regulator failure from disabling both tail surfaces.');
    await lead.getByLabel('Unresolved questions').fill('');
    await lead.getByRole('button', { name: 'Save summary' }).click();
    await lead.locator('.outcome-document').waitFor();
    check('the decision line is prefilled from the summary', (await lead.getByLabel('Decision in one line').inputValue()).startsWith('Separate regulator per tail servo'));
    await lead.getByLabel('Decision in one line').fill('Separate fused regulator per tail servo');
    await lead.getByRole('button', { name: 'Adopt and settle' }).click();
    await lead.locator('.outcome-result').waitFor();
    check('the outcome shows the decision line', (await text(lead)).includes('Adopted into the spec') && (await lead.locator('.outcome-decision').innerText()).includes('Separate fused regulator per tail servo'));

    await lead.goto(P('?view=spec&system=power'));
    await lead.locator('#spec-power').waitFor();
    check('the decision appears in the spec as its answer', (await lead.locator('#spec-power .pw-spec-line[data-kind="decided"]').first().innerText()).includes('Separate fused regulator per tail servo'));
    await lead.goto(P('?view=discussions&record=servo-redundancy'));
    await lead.locator('.pw-callout').waitFor();
    check('the original call question now shows it was answered', (await lead.locator('.pw-callout').innerText()).includes('Decided: Separate fused regulator per tail servo'));
    await lead.goto(P());
    await lead.getByRole('heading', { name: 'Recently decided' }).waitFor();
    check('the overview lists the decision and no longer lists the question as open', (await text(lead)).includes('Separate fused regulator per tail servo') && !(await lead.locator('.pw-overview .pw-q').allInnerTexts()).some((t) => t.includes('tail servo regulators')));

    // Roles and verified expertise change weight.
    await lead.goto(P('?view=people'));
    await lead.getByRole('link', { name: /Acceptance member/ }).click();
    await lead.getByLabel('Role').selectOption('core');
    await lead.getByRole('checkbox', { name: 'Power' }).check();
    await lead.getByRole('button', { name: 'Save', exact: true }).click();
    await lead.getByRole('status').filter({ hasText: 'Saved.' }).waitFor();
    check('verified expertise shows on the profile and raises weight in that system', (await text(lead)).includes('✓ Power') && (await text(lead)).includes('in Power discussions'));

    // The member hears about it, on a phone.
    await member.goto(P('?view=inbox'));
    await member.getByRole('heading', { name: 'Inbox' }).waitFor();
    await member.locator('.pw-note').first().waitFor();
    check('the member has unread updates', (await member.locator('.pw-note.unread').count()) > 0);
    await member.getByRole('button', { name: 'Mark all read' }).click();
    await member.waitForFunction(() => !document.querySelector('.pw-note.unread'));
    await member.waitForFunction(() => !document.querySelector('.pw-tab-inbox .pw-count'), null, { timeout: 5000 }).catch(() => {});
    check('mark all read clears the badge', (await member.locator('.pw-tab-inbox .pw-count').count()) === 0);
    check('mobile layout fits the viewport', await member.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await member.goto(P());
    await member.screenshot({ path: OUT + '/member-mobile-overview.png', fullPage: true });
    check('mobile overview fits', await member.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

    // Freeze PT2: settle what is left, then freeze and record the split.
    await lead.goto(P('?view=freeze'));
    for (let i = 0; i < 20 && await lead.getByRole('button', { name: 'Defer', exact: true }).count(); i++) {
      await lead.getByRole('button', { name: 'Defer', exact: true }).first().click();
      await lead.getByRole('button', { name: 'Defer to PT3' }).click();
      await settle(lead);
    }
    lead.once('dialog', (d) => d.accept());
    await lead.getByRole('button', { name: 'Freeze PT2' }).click();
    await lead.getByRole('heading', { name: /PT2 froze/ }).waitFor();
    check('freezing records the retro split and opens PT3', (await text(lead)).includes('10,000 ARROW retro pool, recorded at the freeze') && (await lead.locator('.pw-pill-live').innerText()).includes('PT3'));
    await lead.goto(P());
    await lead.locator('.pw-frozen').waitFor();
    check('the overview announces the freeze and its split', (await lead.locator('.pw-frozen').innerText()).includes('PT2 froze') && (await lead.locator('.pw-frozen').innerText()).includes('10,000 ARROW'));
    check('PT3 counts only its own decisions', (await lead.locator('.pw-stats').innerText()).includes('Decided for PT3\n0'));
    await lead.goto(P('?view=discussions'));
    await lead.getByRole('heading', { name: 'Discussions' }).waitFor();
    check('nothing lands in PT3 that was never discussed', (await lead.locator('.pw-q').count()) === 0 && (await text(lead)).includes('No open discussions'));
    await member.goto(P('?view=inbox'));
    await member.locator('.pw-note').first().waitFor();
    check('everyone hears about the freeze', /froze the version/i.test(await member.locator('.pw-note').first().innerText()));
    await lead.screenshot({ path: OUT + '/lead-after-freeze.png', fullPage: true });

    check('no runtime or console errors', errors.length === 0);
    console.log(n + ' shared browser checks passed');
  } catch (e) {
    console.log('Errors', errors);
    await lead.screenshot({ path: OUT + '/failure-lead.png', fullPage: true });
    await member.screenshot({ path: OUT + '/failure-member.png', fullPage: true });
    throw e;
  } finally { await b.close(); }
})();
