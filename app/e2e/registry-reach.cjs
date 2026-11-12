// Walks Add a person and Reach out (intro calls) against a built demo dist
// (no Supabase env), through the demo menu's roles. As core: the form's
// required fields, the duplicate warning for an existing name, Discord
// handle, GitHub login and email, GitHub logins resolved by the demo's stub
// (an id, or "not found" for no-such-*), a new record and its page; the
// queue, best signal first; the call invite with times picked here and shown
// in the other person's zone; Copy; Mark invited; Call booked and Talked;
// the after-call note writing a call note and the status; the join invite
// with its personal link; Open in Discord when there's an id; the person
// page's buttons opening the right mode. As a lead: Add and invite to join,
// and a duplicate email refused. As a member and signed out, both pages
// refuse. The clock is fixed at Nov 11 2026, 6 pm Central. Screenshots at
// 390 and 1440 px, both themes, to /tmp/registry-reach-shots.
// npm run build && node e2e/registry-reach.cjs
const { chromium } = require('playwright-core');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const PORT = 4317;
const ORIGIN = `http://localhost:${PORT}`;
const BASE = `${ORIGIN}/#`;
const SHOTS = '/tmp/registry-reach-shots';
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
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN });
    const p = await ctx.newPage();
    await p.clock.setFixedTime(NOW);
    p.on('pageerror', (e) => errors.push(String(e)));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('dialog', (d) => d.accept());
    // The demo never asks GitHub; if it did, this would show.
    p.on('request', (r) => { if (r.url().includes('api.github.com')) errors.push(`the demo called GitHub: ${r.url()}`); });
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
  const as = async (p, role) => {
    await p.locator('.demo .trigger').click();
    await p.locator('.demo .seg button', { hasText: role === 'out' ? 'Signed out' : role[0].toUpperCase() + role.slice(1) }).click();
    await p.locator('.demo .trigger').click();
    await p.waitForTimeout(300);
  };
  const addPage = async (p) => { await p.goto(`${BASE}/community/people/add`); await p.waitForSelector('[data-addform], [data-team-only]'); };
  const reach = async (p, query = '') => {
    await p.goto(`${BASE}/community/reach-out${query}`);
    await p.waitForSelector('[data-pipe], [data-team-only]');
    await p.waitForTimeout(200);
  };
  const pipe = async (p, s) => Number(await p.locator(`[data-stage="${s}"] b`).innerText());
  const draft = (p) => p.locator('[data-draft]').inputValue();
  const settle = (p) => p.waitForTimeout(700);

  // Core: Add a person ---------------------------------------------------------------------------
  const p = await open();
  await p.goto(`${BASE}/community/people`);
  await p.waitForSelector('[data-count]');
  await as(p, 'core');
  await p.waitForSelector('[data-add-person]');
  check(await p.locator('[data-add-person]').count() === 1, 'core: People has Add a person');
  check(await p.locator('[data-side="add"]').count() === 1 && await p.locator('[data-side="reach-out"]').count() === 1, 'core: the sidebar\'s Team group has Reach out and Add a person');
  await p.locator('[data-add-person]').click();
  await p.waitForSelector('[data-addform]');
  check(p.url().endsWith('#/community/people/add'), 'Add a person opens its page');
  check((await p.locator('#ap-owner').inputValue()) === 'u-julius', 'the owner starts as you (Julius, core)');
  check((await p.locator('#ap-owner option').allInnerTexts()).join('|') === 'Nobody yet|Alperen|Erick|Gavin|Julius (you)|Thomas', 'the owner picker lists core and leads');
  await p.locator('[data-add]').click();
  await p.waitForTimeout(300);
  check((await p.locator('.formgrid .err').count()) === 2 && p.url().endsWith('/people/add'), 'name and where from are required');
  check(await p.evaluate(() => document.activeElement?.id) === 'ap-name', 'the first missing field gets the focus');
  await shoot(p, '1440-dark-core-add-required');
  await p.locator('#ap-name').fill('Rosa Delgado');
  await settle(p);
  let dupes = await p.locator('[data-dupes]').innerText();
  check(dupes.includes('Maybe already in the registry') && await p.locator('[data-dupe="rosa"]').count() === 1 && await p.locator('[data-dupe="rosa-gh"]').count() === 1, `an existing name warns, linking both Rosas (${dupes.replace(/\s+/g, ' ')})`);
  check((await p.locator('[data-dupe="rosa"]').getAttribute('href')) === '#/community/people/rosa', 'the warning links to the existing record');
  await p.locator('#ap-name').fill('Luis Ortega');
  await p.locator('#ap-discord').fill('@ade.b');
  await settle(p);
  dupes = await p.locator('[data-dupes]').innerText();
  check(dupes.includes('Already in the registry') && dupes.includes('Ade Bankole') && dupes.includes('the same Discord'), 'an existing Discord handle warns: Ade');
  check((await p.locator('[data-discord-note]').innerText()).includes('without an id'), 'Discord usernames are saved without an id, and it says so');
  await p.locator('#ap-discord').fill('luis.fpv');
  await p.locator('#ap-github').fill('kmori');
  await settle(p);
  check((await p.locator('[data-gh-ok]').innerText()).includes('github.com/kmori'), 'a GitHub login resolves to an id (the demo stub)');
  dupes = await p.locator('[data-dupes]').innerText();
  check(dupes.includes('Kenji Mori') && dupes.includes('the same GitHub'), 'an existing GitHub login warns: Kenji');
  await p.locator('#ap-github').fill('no-such-luis');
  await settle(p);
  const ghFail = await p.locator('[data-gh-fail]').innerText();
  check(ghFail.includes('GitHub has nobody called no-such-luis') && ghFail.includes('a lead confirms'), `a login GitHub doesn't know says so, and that a lead will confirm (${ghFail})`);
  await p.locator('#ap-github').fill('bad login!');
  await settle(p);
  check((await p.locator('[data-gh-fail]').innerText()).includes("isn't a GitHub login"), 'a login that can\'t exist is called out');
  await p.locator('#ap-github').fill('https://github.com/luis-builds');
  await settle(p);
  check((await p.locator('[data-gh-ok]').innerText()).includes('github.com/luis-builds'), 'a pasted GitHub link resolves to its login');
  await p.locator('#ap-email').fill('rosa@example.com');
  await settle(p);
  check((await p.locator('[data-dupes]').innerText()).includes('the same email'), 'an existing email warns');
  await p.locator('#ap-email').fill('luis@example.com');
  await p.locator('#ap-source').fill('Flies FPV at the Marfa field on Saturdays');
  await p.locator('#ap-city').fill('Marfa');
  await p.locator('#ap-country').fill('United States');
  await p.locator('#ap-tz').fill('America/Chicago');
  await p.locator('[data-tax="Piloting"]').click();
  await p.locator('[data-tax="Flight Test"]').click();
  check(await p.locator('[data-tax="Piloting"].can.guess').count() === 1, 'the skills guess is picked in its dotted guess style');
  await p.locator('[data-tool="field"]').click();
  await p.locator('[data-tool="aircraft"]').click();
  await p.locator('#ap-note').fill('Flies a 7-inch quad in wind that grounds the rest of us. Asked about Quiver test days.');
  await p.locator('[data-queue]').click();
  await settle(p);
  check((await p.locator('[data-dupes]').innerText()).includes('Nobody in the registry'), 'no duplicates for Luis');
  await shoot(p, '1440-dark-core-add-filled');
  await p.locator('[data-add]').click();
  await p.waitForSelector('[data-name]');
  const luis = decodeURIComponent(p.url().split('/people/')[1]);
  check((await p.locator('[data-name]').innerText()) === 'Luis Ortega' && await p.locator('[data-noaccount]').count() === 1, `Add to registry goes to the new record (${luis})`);
  const banner = await p.locator('[data-noaccount]').innerText();
  check(banner.includes('GitHub luis-builds'), 'it links by the resolved GitHub id when he joins');
  const panel = await p.locator('[data-teampanel]').innerText();
  check(panel.includes('Flies a 7-inch quad') && panel.includes('Piloting') && panel.includes('A field to fly'), 'the first note, the guess and the tools are on his page');
  check(panel.includes('Julius (you)') || (await p.locator('[data-owner-select]').inputValue()) === 'u-julius', 'he is Julius\'s');
  check(panel.includes('put them in the intro-call queue') || panel.includes('Added'), 'the history says he was added');

  // The queue --------------------------------------------------------------------------------------
  await p.locator('[data-side="reach-out"]').click();
  await p.waitForSelector('[data-pipe]');
  check((await p.locator('[data-never-sent]').innerText()).includes('Nothing is sent from here'), 'the page says once that you send it yourself');
  check(await p.locator('text=Nothing is sent from here').count() === 1, 'and only once');
  const queue = await p.locator('[data-q]').evaluateAll((els) => els.map((e) => e.getAttribute('data-q')));
  check(queue.includes(luis) && ['jake', 'diego', 'hannah', 'ade'].every((x) => queue.includes(x)), `the queue: the intro-call queue and people who asked for a call (${queue})`);
  check(!queue.includes('maya') && !queue.includes('rafael') && !queue.includes('lena'), 'not people already talked to, invited, or who didn\'t ask');
  check((await p.locator('[data-ranking]').innerText()).startsWith('Best signal first: a story with specifics'), 'the ranking is said in words under the queue');
  const scores = await p.locator('[data-q]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-score'))));
  check(scores.every((x, i) => i === 0 || scores[i - 1] >= x) && await p.locator('[data-q] [data-signal]').count() === queue.length, `ranked best signal first, each card saying why (${scores})`);
  check(await pipe(p, 'queue') === queue.length && await pipe(p, 'invited') === 3 && await pipe(p, 'booked') === 1 && await pipe(p, 'talked') === 2 && await pipe(p, 'due') === 0,
    `the pipe: to invite ${await pipe(p, 'queue')}, invited ${await pipe(p, 'invited')}, booked ${await pipe(p, 'booked')}, talked ${await pipe(p, 'talked')}, notes due ${await pipe(p, 'due')}`);
  check(await p.locator('text=Say hi').count() === 0 && await p.locator('text=welcome call').count() === 0, 'no Say hi or welcome calls in this phase');

  // The call invite, in Hannah's time ----------------------------------------------------------------
  await p.locator('[data-q="hannah"]').click();
  await p.waitForURL(/person=hannah/);
  await p.waitForSelector('[data-composer][data-mode="call"]');
  let d = await draft(p);
  const theirs = await p.locator('[data-their-time]').allInnerTexts();
  check(theirs.length === 3 && theirs.every((t) => t.endsWith('for Hannah')), `three times, each shown in Hannah's zone (${theirs.join(' | ')})`);
  check(d.startsWith('Hey Hannah, Julius from Arrow here.') && d.includes('I read your profile: “I built the moulds'), 'the draft opens with her name and a line from her story');
  check(d.includes('in your time') && theirs.every((t) => d.includes(t.replace(' for Hannah', ''))), 'the times in the draft are hers');
  check(theirs[0].startsWith('Fri, Nov 13, 9:00 AM'), `the first time is 2 pm Thursday here, 9 am Friday in Auckland (${theirs[0]})`);
  check(d.includes('Or send me a couple that suit you.') && d.trim().endsWith('Julius'), 'it offers to take her times, and is signed by you');
  await p.locator('[data-slot] .input').first().fill('2026-11-16T16:00');
  await p.locator('[data-slot] .input').first().dispatchEvent('change');
  await p.waitForTimeout(200);
  check((await p.locator('[data-their-time]').allInnerTexts()).some((t) => t.startsWith('Tue, Nov 17, 11:00 AM')) && (await draft(p)).includes('Tue, Nov 17, 11:00 AM'), 'a time you change here changes in her zone and in the draft');
  check((await p.locator('[data-their-time]').last().innerText()).startsWith('Tue, Nov 17'), 'the times stay in order');
  await p.locator('[data-slot] .x').last().click();
  check(await p.locator('[data-slot]').count() === 2, 'a time can be dropped');
  await p.locator('[data-draft]').fill(`${await draft(p)}\nPS: bring photos of the foil moulds.`);
  await p.locator('[data-copy]').click();
  await p.waitForTimeout(200);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  check(clip === await draft(p) && clip.includes('PS: bring photos'), 'Copy puts the draft, with your edits, on the clipboard');
  check((await p.locator('[data-copy]').innerText()).includes('Copied'), 'Copy says Copied');
  check(await p.locator('[data-open-discord]').count() === 0 && (await p.locator('[data-no-discord-id]').innerText()).includes('@hannah.lee'), 'no Discord id yet: no Open in Discord, and it says why');
  await shoot(p, '1440-dark-core-reach-call');
  await p.locator('[data-mark="invited"]').click();
  await p.waitForSelector('[data-flash]');
  check((await p.locator('[data-flash]').innerText()).includes('Marked invited, and they\'re yours now'), 'Mark invited records it, and she\'s yours');
  check(await pipe(p, 'invited') === 4 && await pipe(p, 'queue') === queue.length - 1, 'she moves from to invite to invited');
  check((await p.locator('[data-composer] .pill').first().innerText()).includes('Invited'), 'her status says Invited');

  // Booked, then talked, then the after-call note ------------------------------------------------------
  await p.locator('[data-mark="booked"]').click();
  await p.waitForSelector('[data-aftercall]');
  check(await pipe(p, 'booked') === 2, 'Call booked moves her on, and the after-call note is ready');
  await p.locator('[data-mark="talked"]').click();
  await p.waitForTimeout(500);
  check(await pipe(p, 'due') === 1 && await p.locator('[data-notes-due]').count() === 1, 'Talked with no call notes: notes due');
  await p.locator('[data-ac-good]').fill('Composite layups and moulds; logs humidity before every layup.');
  await p.locator('[data-ac-wants]').fill('Learning aero; 5 to 10 hours a week, evenings.');
  await p.locator('[data-ac-next]').fill('Intro to Alperen for Spearhead wing skins.');
  await p.locator('[data-ac-tag-input]').fill('Spearhead wing skins');
  await p.locator('[data-ac-tag-input]').press('Enter');
  await shoot(p, '1440-dark-core-reach-aftercall');
  await p.locator('[data-ac-save]').click();
  await p.waitForSelector('[data-ac-done]');
  check(await pipe(p, 'due') === 0 && await pipe(p, 'talked') === 3, 'saving the note clears notes due');
  await p.goto(`${BASE}/community/people/hannah`);
  await p.waitForSelector('[data-teampanel]');
  const note = await p.locator('[data-note]').first().innerText();
  check(/CALL/i.test(note) && note.includes('Good at: Composite layups') && note.includes('Wants: Learning aero') && note.includes('Next step: Intro to Alperen'), 'the after-call note is a call note on her page');
  check((await p.locator('[data-status-select]').inputValue()) === 'talked' && (await p.locator('[data-next-step]').inputValue()) === 'Intro to Alperen for Spearhead wing skins.', 'status Talked and the next step, from the same save');
  check((await p.locator('[data-goodfor]').allInnerTexts()).some((t) => t.includes('Spearhead wing skins')), 'and the good-for tag');
  const hist = await p.locator('[data-history]').innerText();
  check(hist.includes('You set the status to Invited; took it') && hist.includes('You wrote call notes') && hist.includes('set the next step: “Intro to Alperen') && hist.includes('“Invited to a call”'), `the history has each step (${hist.replace(/\s+/g, ' ').slice(0, 400)})`);

  // The join invite --------------------------------------------------------------------------------------
  await p.goto(`${BASE}/community/people/rosa`);
  await p.waitForSelector('[data-invite-join]');
  await p.locator('[data-invite-join]').click();
  await p.waitForSelector('[data-composer][data-mode="join"]');
  check(p.url().includes('person=rosa') && p.url().includes('invite=join'), 'the person page\'s Invite to join opens Reach out for her, in join mode');
  d = await draft(p);
  check(d.includes(`${ORIGIN}/#/join?ref=invite-julius`) && d.startsWith('Hey Rosa, Julius from Arrow here.'), 'the join invite carries a personal /join link naming the inviter');
  check(d.includes('Thomas pointed me your way'), 'its first line says who on the team pointed you to her');
  check((await p.locator('[data-know]').innerText()).includes('Runs a five-person machine shop'), 'what the team knows sits beside the draft, not in it');
  check(!d.includes('machine shop'), 'the team\'s note never goes into the message');
  check((await p.locator('[data-composer] .why').innerText()).includes('the email on their record'), 'it says how her record will find her');
  const mail = await p.locator('[data-open-mail]').getAttribute('href');
  check(mail.startsWith('mailto:rosa%40example.com?subject=') && mail.includes(encodeURIComponent('ref=invite-julius')), 'Open in your email has the draft, to the address on the record');
  await shoot(p, '1440-dark-core-reach-join');
  await p.locator('[data-mode-call]').click();
  await p.waitForSelector('[data-composer][data-mode="call"]');
  check(!(await draft(p)).includes('/#/join') && !p.url().includes('invite=join'), 'switching to a call invite drafts that instead');
  await p.goto(`${BASE}/community/people/ade`);
  await p.waitForSelector('[data-invite-call]');
  await p.locator('[data-invite-call]').click();
  await p.waitForSelector('[data-composer][data-mode="call"]');
  check(p.url().includes('person=ade') && !p.url().includes('invite=join') && (await draft(p)).startsWith('Hey Ade'), 'Invite to a call opens Reach out for Ade, in call mode');
  await p.goto(`${BASE}/community/people/kenji`);
  await p.waitForSelector('[data-teampanel]');
  await p.locator('[data-teampanel] a', { hasText: 'Invite to a call' }).click();
  await p.waitForSelector('[data-composer]');
  check(p.url().includes('person=kenji') && (await p.locator('[data-composer-name]').innerText()).includes('Kenji Mori'), 'the team panel\'s Invite to a call opens Reach out for Kenji');
  check((await p.locator('[data-no-zone]').count()) === 0 && (await p.locator('[data-their-time]').first().innerText()).includes('for Kenji'), 'Kenji\'s times are in Tokyo time');

  // Open in Discord, once there's an id (phase 2's bot will fill them; here, the demo store).
  await p.evaluate(() => { const k = 'superapp:registry.v3'; const s = JSON.parse(localStorage.getItem(k)); Object.assign(s.people.find((r) => r.id === 'diego'), { discord_id: '123456789012345678', discord_username: 'diegofpv' }); localStorage.setItem(k, JSON.stringify(s)); });
  await p.reload();
  await reach(p, '?person=diego');
  await p.waitForSelector('[data-composer]');
  check((await p.locator('[data-open-discord]').getAttribute('href')) === 'https://discord.com/users/123456789012345678', 'Open in Discord goes to their Discord profile when there\'s an id');

  // A lead: Add and invite to join; a duplicate email refused --------------------------------------------
  await as(p, 'lead');
  await addPage(p);
  await p.locator('#ap-name').fill('Marta Silva');
  await p.locator('#ap-source').fill('Ran the soldering table at the Austin build day');
  await p.locator('#ap-email').fill('ROSA@example.com');
  await p.locator('[data-add]').click();
  await p.waitForSelector('[data-add-err]');
  check((await p.locator('[data-add-err]').innerText()).includes('Already in the registry: Rosa Delgado'), 'lead: an email already on a record is refused');
  await p.locator('#ap-email').fill('marta@example.com');
  await p.locator('#ap-github').fill('martasilva');
  await settle(p);
  await p.locator('[data-add-invite]').click();
  await p.waitForSelector('[data-composer][data-mode="join"]');
  check(p.url().includes('invite=join') && (await p.locator('[data-composer-name]').innerText()) === 'Invite Marta Silva to join', 'lead: Add and invite to join opens Reach out with her join invite');
  d = await draft(p);
  check(d.includes('ref=invite-thomas') && d.startsWith('Hey Marta, Thomas from Arrow here.'), 'the lead\'s invite names Thomas');
  check((await p.locator('[data-composer] .why').innerText()).includes('GitHub (martasilva)'), 'it links by her resolved GitHub');
  await p.locator('[data-mark="invited"]').click();
  await p.waitForSelector('[data-flash]');
  await p.goto(`${BASE}/community/people`);
  await p.waitForSelector('tr[data-person]');
  const marta = p.locator('tr[data-person]', { hasText: 'Marta Silva' });
  check(await marta.count() === 1 && (await marta.innerText()).includes('Invited'), 'lead: she is on the list, invited, after loadCommunity');
  await p.evaluate(() => localStorage.setItem('arrow.theme', 'light'));
  await p.reload();
  await reach(p, '?person=diego');
  check(await p.evaluate(() => document.documentElement.dataset.theme === 'light'), 'the light theme is on');
  await shoot(p, '1440-light-lead-reach');
  await addPage(p);
  await p.locator('#ap-name').fill('Rosa');
  await settle(p);
  await shoot(p, '1440-light-lead-add');
  await p.evaluate(() => localStorage.setItem('arrow.theme', 'dark'));
  await p.reload();

  // A member and signed out: both pages refuse ------------------------------------------------------------
  for (const role of ['member', 'out']) {
    await as(p, role);
    await addPage(p);
    check(await p.locator('[data-team-only]').count() === 1 && !(await p.locator('[data-addform]').count()), `${role}: Add a person says core and leads only`);
    await reach(p, '?person=rosa&invite=join');
    check(await p.locator('[data-team-only]').count() === 1 && !(await p.locator('[data-pipe], [data-composer], [data-q]').count()), `${role}: Reach out says core and leads only`);
    const body = await p.locator('main.slot').innerHTML();
    check(!/Rosa Delgado|rosa@example|invite-|Marta/.test(body), `${role}: nothing of the team's in the page`);
    await p.goto(`${BASE}/community/people`);
    await p.waitForSelector('[data-count]');
    check(!(await p.locator('[data-add-person]').count()) && !(await p.locator('[data-side="add"]').count()) && !(await p.locator('[data-side="reach-out"]').count()), `${role}: no Add a person or Reach out links`);
  }
  await shoot(p, '1440-dark-out-people');
  await p.context().close();

  // Phones -------------------------------------------------------------------------------------------------
  for (const [role, theme] of [['core', 'dark'], ['lead', 'light'], ['member', 'dark']]) {
    const ph = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: theme });
    await ph.goto(`${BASE}/community/people`);
    await ph.waitForSelector('[data-count]');
    if (theme === 'light') { await ph.evaluate(() => localStorage.setItem('arrow.theme', 'light')); await ph.reload(); await ph.waitForSelector('[data-count]'); }
    await as(ph, role);
    await addPage(ph);
    if (role !== 'member') {
      await ph.locator('#ap-name').fill('Rosa');
      await ph.locator('#ap-github').fill('no-such-rosa');
      await settle(ph);
    }
    check(await fits(ph), `390 ${role}: Add a person fits`);
    await shoot(ph, `390-${theme}-${role}-add`);
    await reach(ph, role === 'member' ? '' : '?person=hannah');
    check(await fits(ph), `390 ${role}: Reach out fits`);
    await shoot(ph, `390-${theme}-${role}-reach`);
    if (role !== 'member') {
      await reach(ph, '?person=rosa&invite=join');
      check(await fits(ph), `390 ${role}: the join invite fits`);
      await shoot(ph, `390-${theme}-${role}-reach-join`);
      await reach(ph, '?person=noor');
      check(await ph.locator('[data-aftercall]').count() === 1 && await fits(ph), `390 ${role}: Noor's call is booked: the after-call note shows and fits`);
      await shoot(ph, `390-${theme}-${role}-reach-aftercall`);
    }
    await ph.context().close();
  }

  check(!errors.length, `no console or page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await b.close();
  srv.kill();
  console.log(failed ? `${failed} failed` : 'all ok');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
