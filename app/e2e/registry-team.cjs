// Walks the Community workspace against a built demo dist (no Supabase env),
// as each role the demo menu offers: signed out (the public cards), a member
// (people with accounts, their profiles, nothing of the team's), core and a
// lead (everyone, the team's columns and panel). Saved views and their
// counts, search, a view clearing the chips, adding and editing notes, owner,
// status, next step and good for, a skill check, and a lead settling a
// "same person?" card both ways. The clock is fixed at Nov 11 2026, 6 pm
// Central, so the date views count the same every run. Screenshots at 390
// and 1440 px, both themes, to /tmp/registry-team-shots.
// npm run build && node e2e/registry-team.cjs
const { chromium } = require('playwright-core');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const PORT = 4316;
const BASE = `http://localhost:${PORT}/#`;
const SHOTS = '/tmp/registry-team-shots';
const NOW = new Date('2026-11-11T18:00:00-06:00');
const exe = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find((p) => fs.existsSync(p));
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const f of fs.readdirSync(SHOTS)) fs.unlinkSync(`${SHOTS}/${f}`);
  const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2000));
  const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const open = async (opts) => {
    const ctx = await b.newContext({ timezoneId: 'America/Chicago', colorScheme: 'dark', viewport: { width: 1440, height: 900 }, ...opts });
    const p = await ctx.newPage();
    await p.clock.setFixedTime(NOW);
    p.on('pageerror', (e) => errors.push(String(e)));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('dialog', (d) => d.accept());
    return p;
  };
  const shoot = async (p, name) => {
    await p.waitForTimeout(250);
    const vp = p.viewportSize();
    const extra = await p.evaluate(() => { const s = document.querySelector('.slot'); return Math.max(0, s ? s.scrollHeight - s.clientHeight : 0, document.documentElement.scrollHeight - innerHeight); });
    if (extra) await p.setViewportSize({ width: vp.width, height: vp.height + extra });
    await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
    if (extra) await p.setViewportSize(vp);
  };
  const fits = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  /** The demo menu's View as. */
  const as = async (p, role) => {
    await p.locator('.demo .trigger').click();
    await p.locator('.demo .seg button', { hasText: role === 'out' ? 'Signed out' : role[0].toUpperCase() + role.slice(1) }).click();
    await p.locator('.demo .trigger').click();
    await p.waitForTimeout(300);
  };
  const people = async (p, query = '') => {
    await p.goto(`${BASE}/community/people${query}`);
    await p.waitForSelector('[data-count]');
    await p.waitForFunction(() => !document.querySelector('.people .state[role="status"]'));
  };
  const count = async (p) => parseInt(await p.locator('[data-count]').innerText(), 10);
  const side = async (p, id) => { const n = p.locator(`[data-side="${id}"] .n`); return (await n.count()) ? Number(await n.innerText()) : null; };
  const sideIds = (p) => p.locator('[data-side]').evaluateAll((els) => els.map((e) => e.getAttribute('data-side')));
  const names = (p) => p.locator('tr[data-person] .nm').allInnerTexts();
  const person = async (p, id) => {
    await p.goto(`${BASE}/community/people/${id}`);
    await p.waitForSelector('[data-name], [data-public], [data-missing]');
  };
  const html = (p) => p.locator('.slot').innerHTML();

  // Signed out --------------------------------------------------------------------------------
  const p = await open();
  await people(p);
  check(await p.locator('.sketch.people').count() === 1 && (await p.locator('.toolbar .name').first().innerText()) === 'Community', 'the project switcher says Community, with its own thumbnail');
  await as(p, 'out');
  await people(p);
  check((await p.locator('.demo .trigger').innerText()).includes('signed out'), 'the demo menu has Signed out');
  check(await p.locator('[data-card]').count() === 12 && await count(p) === 12, 'signed out: the 12 public cards');
  check(!(await p.locator('table.list').count()), 'signed out: no table of profiles');
  check(JSON.stringify(await sideIds(p)) === JSON.stringify(['view:all', 'cat:Engineering', 'cat:Flight Systems', 'cat:Flight Ops', 'cat:Manufacturing', 'cat:Design', 'cat:Content', 'cat:Growth']), `signed out: only All people and the taxonomy (${await sideIds(p)})`);
  check(!(await p.getByRole('link', { name: /Reach out/ }).count()), 'signed out: no Reach out tab');
  let body = await html(p);
  check(!/Ade Bankole|Kenji Mori|rosa@example|Notes|owner|no account/i.test(body), 'signed out: nobody the team added, no notes, owners or emails');
  check((await p.locator('.lede').innerText()).includes('Sign in to see members'), 'signed out: says what signing in shows');
  await p.locator('[data-search]').fill('nairobi');
  await p.waitForTimeout(400);
  check(await p.locator('[data-card]').count() === 1, 'signed out: search finds Samuel by his city');
  await shoot(p, '1440-out-people');
  await person(p, 'maya');
  check(await p.locator('[data-public]').count() === 1 && !(await p.locator('[data-said]').count()), 'signed out: a person is their public card, no Said');
  body = await html(p);
  check(!body.includes('Longshot pack for my own') && !body.includes('14S5P'), 'signed out: what she wants to build and her story are not in the page');
  await shoot(p, '1440-out-person');
  await person(p, 'ade');
  check(await p.locator('[data-missing]').count() === 1, 'signed out: someone the team added isn\'t there');

  // A member ------------------------------------------------------------------------------------
  await as(p, 'member');
  await people(p);
  check(await count(p) === 13, `member: 13 people with accounts (${await count(p)})`);
  check(JSON.stringify((await sideIds(p)).filter((x) => x.startsWith('view:'))) === JSON.stringify(['view:all', 'view:new', 'view:shop']), 'member: views All, New this week, Has a shop');
  check(await side(p, 'view:new') === 2 && await side(p, 'view:shop') === 4, `member: counts new 2, shop 4 (${await side(p, 'view:new')}, ${await side(p, 'view:shop')})`);
  check(!(await p.locator('[data-chip="call"]').count()) && await p.locator('[data-chip="shop"]').count() === 1, 'member: Has a shop chip, no Open to a call');
  check(!(await p.locator('th', { hasText: 'Status' }).count()) && !(await p.locator('[data-notes], [data-owner]').count()), 'member: no status, owner or notes columns');
  body = await html(p);
  check(!/Ade Bankole|Kenji Mori|no account|rosa@example|owner:|Julius's guess/i.test(body), 'member: nobody the team added and nothing of the team\'s in the page');
  check(!(await p.getByRole('link', { name: /Reach out/ }).count()), 'member: no Reach out tab');
  check(!(await p.locator('.lede').innerText()).toLowerCase().includes('note'), 'member: the page doesn\'t mention the team\'s notes');
  await p.locator('[data-search]').fill('lathe');
  await p.waitForTimeout(400);
  check(JSON.stringify(await names(p)) === '["Jake Whitfield"]', 'member: search covers tools (lathe: Jake)');
  await p.locator('[data-search]').fill('spearhead');
  await p.waitForTimeout(400);
  check((await names(p)).length === 5, `member: search covers what they want to build (spearhead: ${(await names(p)).join(', ')})`);
  await p.locator('[data-side="cat:Manufacturing"]').click();
  await p.waitForTimeout(300);
  check(await count(p) === 3 && (await p.locator('[data-viewname]').innerText()) === 'Can do: Manufacturing' && (await p.locator('[data-search]').inputValue()) === '', 'member: a taxonomy group filters, and starts clean');
  await shoot(p, '1440-member-people');
  await person(p, 'maya');
  check(await p.locator('[data-said]').count() === 1 && (await p.locator('[data-wtb]').innerText()).includes('A Longshot pack for my own Quiver'), 'member: Maya\'s profile, with what she wants to build');
  check((await p.locator('[data-story]').innerText()).includes('14S5P'), 'member: her story');
  check(!(await p.locator('[data-teampanel]').count()) && !(await p.locator('[data-callok]').count()), 'member: no team panel, no intro-call answer');
  body = await html(p);
  check(!/20 minutes\. Field tech|Watched her pack build|Team only|owner|Talked|Longshot pack build weekend/i.test(body), 'member: no notes, status, owner or next step anywhere in the page');
  await shoot(p, '1440-member-person');
  for (const id of ['ade', 'rosa', 'kenji']) {
    await person(p, id);
    check(await p.locator('[data-missing]').count() === 1, `member: ${id} (added by the team) isn't there`);
  }

  // Core ------------------------------------------------------------------------------------------
  await as(p, 'core');
  await people(p);
  check(await count(p) === 16, `core: everyone (16): ${await count(p)}`);
  const want = { 'view:all': 16, 'view:new': 3, 'view:call': 5, 'view:shop': 5, 'view:team': 3, 'view:waiting': 2, 'view:quiet': 1 };
  const got = {};
  for (const k of Object.keys(want)) got[k] = await side(p, k);
  check(JSON.stringify(got) === JSON.stringify(want), `core: saved views and counts ${JSON.stringify(got)}`);
  for (const [v, n, who] of [['new', 3, 'Jake Whitfield'], ['call', 5, 'Diego Ramírez'], ['team', 3, 'Rosa Delgado'], ['waiting', 2, 'Hannah Lee'], ['quiet', 1, 'Priya Raman']]) {
    await p.locator(`[data-side="view:${v}"]`).click();
    await p.waitForTimeout(250);
    check(await count(p) === n && (await names(p)).includes(who), `core: ${v} lists ${n}, ${who} among them`);
  }
  check(!(await p.locator('[data-match]').count()), 'core: no "same person?" cards (a lead settles them)');
  check(await p.getByRole('link', { name: /Reach out/ }).count() >= 1, 'core: the Reach out tab and sidebar link');
  await people(p);
  const ade = p.locator('tr[data-person="ade"]');
  // The demo's core is Julius, who added Ade; Erick (a lead) added Kenji.
  check((await ade.innerText()).includes('NO ACCOUNT') && (await ade.innerText()).includes('added by you') && (await ade.innerText()).includes('Your guess'), 'core: Ade is listed with no account, added by you, your guess');
  check((await p.locator('tr[data-person="kenji"]').innerText()).includes("Erick's guess"), 'core: Kenji shows Erick\'s guess');
  check(await ade.locator('.dchip.guess').count() === 2, 'core: the guess is drawn dotted');
  check((await p.locator('tr[data-person="maya"] [data-notes]').innerText()).trim() === '2', 'core: Maya\'s note count');
  // A view starts clean.
  await p.locator('[data-search]').fill('austin');
  await p.locator('[data-chip="shop"]').click();
  await p.waitForTimeout(400);
  check(p.url().includes('q=austin') && p.url().includes('shop=1') && JSON.stringify(await names(p)) === '["Omar Farouk","Rosa Delgado"]', `core: search (where we know them from, too) and the shop chip narrow it (${await count(p)})`);
  await p.locator('[data-side="view:call"]').click();
  await p.waitForTimeout(400);
  check(!p.url().includes('q=') && !p.url().includes('shop') && (await p.locator('[data-search]').inputValue()) === '' && (await p.locator('[data-chip="shop"]').getAttribute('aria-pressed')) === 'false', 'core: picking a view clears the search and chips');
  await p.locator('[data-chip="call"]').click();
  await p.waitForTimeout(300);
  check(await count(p) === 5 && p.url().includes('call=1'), 'core: the Open to a call chip');
  await shoot(p, '1440-core-people');

  // Core on a person: notes, owner, status, next step, good for, a skill check.
  await person(p, 'ade');
  check(await p.locator('[data-noaccount]').count() === 1 && (await p.locator('[data-said]').innerText()).includes('hasn\'t joined'), 'core: Ade has the No account banner and an empty Said');
  check((await p.locator('[data-invite-join]').getAttribute('href')).includes('/community/reach-out?person=ade&invite=join') && (await p.locator('[data-invite-call]').getAttribute('href')).includes('/community/reach-out?person=ade'), 'core: Invite to join and to a call link to Reach out');
  check((await p.locator('[data-know]').innerText()).includes('Electrical') && (await p.locator('[data-know]').innerText()).includes('your guess'), 'core: What we know shows the team\'s guess');
  await p.locator('[data-note-body]').fill('Talked in #longshot: he grades cells by internal resistance before he matches them.');
  await p.locator('[data-kind="call"]').click();
  await p.locator('[data-add-note]').click();
  await p.waitForTimeout(400);
  check((await p.locator('[data-note-count]').innerText()) === '2' && (await p.locator('[data-note]').first().innerText()).includes('grades cells'), 'core: a call note added, newest first');
  check((await p.locator('[data-note]').first().innerText()).includes('You'), 'core: written by you');
  // Julius (the demo's core) wrote the first note on Ade: he may edit it.
  const juliusNote = p.locator('[data-note]', { hasText: 'Answers cell-matching' });
  await juliusNote.locator('[data-edit-note]').click();
  await p.locator('[data-edit-body]').fill('Answers cell-matching and BMS questions in #longshot, better than our guide does. Works at a battery recycler in Dallas.');
  await p.locator('[data-save-edit]').click();
  await p.waitForTimeout(400);
  check((await p.locator('[data-note]', { hasText: 'battery recycler in Dallas.' }).innerText()).includes('edited'), 'core: edits their own note, marked edited');
  await p.locator('[data-owner-select]').selectOption({ label: 'Gavin' });
  await p.waitForTimeout(400);
  check((await p.locator('[data-owner-select] option:checked').innerText()) === 'Gavin', 'core: owner changed to Gavin');
  await p.locator('[data-status-select]').selectOption('invited');
  await p.waitForTimeout(400);
  check((await p.locator('.phead [data-status]').innerText()) === 'Invited', 'core: status set to Invited, in the header too');
  await p.locator('[data-next-step]').fill('Julius: DM him about the pack build weekend');
  await p.locator('[data-save-next]').click();
  await p.waitForTimeout(400);
  await p.locator('[data-goodfor-input]').fill('Cell grading');
  await p.locator('[data-goodfor-input]').press('Enter');
  await p.waitForTimeout(400);
  check((await p.locator('[data-goodfor]').allInnerTexts()).some((t) => t.includes('Cell grading')), 'core: good for gained a tag');
  await p.locator('[data-kind="skill"]').click();
  await p.locator('[data-skill-discipline]').selectOption('Electrical');
  await p.locator('[data-skill-verdict]').selectOption('talked');
  await p.locator('[data-note-body]').fill('Walked me through cell matching; knows the BMS balancing limits.');
  await p.locator('[data-add-note]').click();
  await p.waitForTimeout(400);
  const elec = p.locator('[data-skill]', { hasText: 'Electrical' });
  check((await elec.innerText()).includes('talked it through') && await elec.locator('.dchip.checked').count() === 1, 'core: a skill check marks Electrical checked');
  const hist = await p.locator('[data-history]').innerText();
  check(/set the status to Invited/.test(hist) && /gave it to Gavin/.test(hist) && /set the next step: “Julius: DM him/.test(hist) && /wrote call notes/.test(hist), 'core: history has the outreach changes and notes');
  await shoot(p, '1440-core-person-ade');
  await person(p, 'rosa');
  check(!(await p.locator('[data-note]', { hasText: 'Met her at the Austin' }).locator('[data-edit-note]').count()), 'core: can\'t edit Thomas\'s note');
  check((await p.locator('[data-email]').innerText()).includes('rosa@example.com'), 'core: sees the email the team saved, marked team only');
  await people(p, '?view=team');
  check((await p.locator('tr[data-person="ade"] [data-owner]').innerText()).includes('Gavin') && (await p.locator('tr[data-person="ade"] [data-status]').innerText()) === 'Invited', 'core: the list shows Ade\'s new owner and status');
  await person(p, 'maya');
  check((await p.locator('[data-teampanel]').innerText()).includes('Longshot pack build') && (await p.locator('[data-skill]', { hasText: 'Electrical' }).innerText()).includes('seen their work'), 'core: Maya\'s team panel: good for, Julius\'s skill checks');
  check((await p.locator('[data-callok]').innerText()).startsWith('Open to one'), 'core: sees she\'s open to a call');
  await shoot(p, '1440-core-person-maya');
  await p.locator('[data-take]').click();
  await p.waitForTimeout(400);
  check((await p.locator('[data-owner-select] option:checked').innerText()).includes('(you)'), 'core: Take it makes you the owner');

  // A lead --------------------------------------------------------------------------------------
  await as(p, 'lead');
  await people(p);
  check(await p.locator('[data-match]').count() === 1 && (await p.locator('[data-match]').innerText()).includes('Rosa Delgado'), 'lead: a "same person?" card for Rosa');
  await shoot(p, '1440-lead-people');
  await person(p, 'kenji');
  const erickNote = p.locator('[data-note]', { hasText: 'Three good PRs' });
  check(await erickNote.locator('[data-edit-note]').count() === 1, 'lead: can edit Erick\'s note');
  await erickNote.locator('[data-edit-note]').click();
  await p.locator('[data-edit-body]').fill('Three good PRs to project-quiver last spring, then nothing. Never on Discord. Email him about QuiverHub telemetry.');
  await p.locator('[data-save-edit]').click();
  await p.waitForTimeout(400);
  check((await p.locator('[data-note]', { hasText: 'Email him about' }).innerText()).includes('edited'), 'lead: edited someone else\'s note');
  // Different people: the card goes, both records stay.
  await people(p);
  await p.locator('[data-different]').click();
  await p.waitForTimeout(500);
  check(!(await p.locator('[data-match]').count()) && (await p.locator('[data-linkmsg]').innerText()).includes('different people') && await count(p) === 16, 'lead: Different people settles the card, both records stay');

  // A fresh browser: Link them folds the account into Rosa's record.
  const q = await open();
  await people(q);
  await as(q, 'lead');
  await people(q);
  await person(q, 'rosa');
  check(await q.locator('[data-match]').count() === 1, 'lead: the card shows on Rosa\'s page too');
  await shoot(q, '1440-lead-person-rosa');
  await people(q);
  await q.locator('[data-link]').click();
  await q.waitForTimeout(500);
  check((await q.locator('[data-linkmsg]').innerText()).includes('Linked'), 'lead: Link them');
  check(await count(q) === 15 && await side(q, 'view:team') === 2, `lead: one Rosa now, and two people without accounts (${await count(q)}, ${await side(q, 'view:team')})`);
  await person(q, 'rosa');
  check(!(await q.locator('[data-noaccount]').count()) && !(await q.locator('.phead .pill.plum').count()), 'lead: Rosa\'s record has her account now: no banner');
  check((await q.locator('[data-linked]').innerText()).includes('rdelgado-waco') && (await q.locator('[data-teampanel]').innerText()).includes('Met her at the Austin'), 'lead: her GitHub came over and the team\'s notes stayed');
  check((await q.locator('[data-history]').innerText()).includes('Joined, and their account linked'), 'lead: history says she joined');

  // Light theme, and phones.
  await q.evaluate(() => localStorage.setItem('arrow.theme', 'light'));
  await q.reload();
  await people(q);
  await shoot(q, '1440-light-lead-people');
  await person(q, 'maya');
  await shoot(q, '1440-light-lead-person');

  for (const [role, theme] of [['out', 'dark'], ['member', 'dark'], ['core', 'light'], ['lead', 'dark']]) {
    const ph = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: theme });
    await people(ph);
    if (theme === 'light') { await ph.evaluate(() => localStorage.setItem('arrow.theme', 'light')); await ph.reload(); }
    await as(ph, role);
    await people(ph);
    check(await fits(ph), `390 ${role}: the list fits`);
    await shoot(ph, `390-${theme}-${role}-people`);
    for (const id of role === 'core' || role === 'lead' ? ['maya', 'rosa'] : ['maya']) {
      await person(ph, id);
      check(await fits(ph), `390 ${role}: ${id}'s page fits`);
      await shoot(ph, `390-${theme}-${role}-person-${id}`);
    }
    await ph.context().close();
  }

  check(!errors.length, `no console or page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await b.close();
  srv.kill();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
