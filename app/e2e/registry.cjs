// Walks the registry's newcomer side against a built demo dist (no Supabase
// env): the join wizard from a ref link to done, with its validation, a
// reload in the middle, "just following" skipping the work steps, editing a
// finished profile; Your Arrow with the saved answers and matches; the
// Contributor Dashboard button; phone width and the light theme; no console
// errors. Screenshots of every step at 390 and 1440 px to /tmp/registry-shots.
// npm run build && node e2e/registry.cjs
const { chromium } = require('playwright-core');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const PORT = 4314;
const BASE = `http://localhost:${PORT}/#`;
const SHOTS = '/tmp/registry-shots';
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
    const ctx = await b.newContext({ timezoneId: 'America/Chicago', colorScheme: 'dark', ...opts });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(String(e)));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('dialog', (d) => d.accept());
    return p;
  };
  // The page scrolls inside the frame's slot, so a full shot grows the window to fit it first.
  const shoot = async (p, name) => {
    await p.waitForTimeout(250);
    const vp = p.viewportSize();
    // On a phone the page itself scrolls, and the footer is fixed to the window's bottom.
    const extra = await p.evaluate(() => { const s = document.querySelector('.slot'); return Math.max(0, s ? s.scrollHeight - s.clientHeight : 0, document.documentElement.scrollHeight - innerHeight); });
    if (extra) await p.setViewportSize({ width: vp.width, height: vp.height + extra });
    await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
    if (extra) await p.setViewportSize(vp);
  };
  const step = (p) => p.locator('section[data-step]').getAttribute('data-step');
  const next = (p) => p.locator('[data-next]').click().then(() => p.waitForTimeout(250));
  const fits = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const progress = (p) => p.locator('.wizprog span').first().innerText();

  // The whole wizard, as Maya. desk: validation and checks; phone: shots and fit.
  async function walk(p, w, desk) {
    const tag = `${w}`;
    await p.goto(`${BASE}/join?ref=x-longshot-teardown`);
    await p.waitForSelector('section[data-step="signin"]');
    await shoot(p, `${tag}-01-signin`);
    if (desk) {
      const discord = p.getByRole('button', { name: /Continue with Discord/ });
      check(await discord.isDisabled() && (await discord.innerText()).toLowerCase().includes('coming soon'), 'Discord is the first button, disabled, "coming soon"');
      check(!(await p.locator('.wizprog').count()), 'the sign-in step has no progress bar');
    } else check(await fits(p), `${w}: sign-in fits the screen`);
    await p.getByRole('button', { name: 'Continue with GitHub' }).click();
    await p.waitForSelector('section[data-step="build"]');
    check(p.url().includes('step=build'), `${w}: GitHub (demo) goes on to "What do you want to build?"`);
    if (desk) {
      check((await progress(p)) === '1 / 7', 'progress counts 7 questions');
      await next(p);
      check(await step(p) === 'build' && (await p.locator('#wtb-err').innerText()).includes('what you want to build'), 'what they want to build is required, with the message under the field');
    }
    await p.locator('#wtb').fill('A Longshot pack for my own Quiver first, then packs for other people\'s');
    await p.locator('[data-lane="hardware"]').click();
    await p.locator('[data-lane="engineer"]').click();
    if (desk) check(!(await p.locator('#wtb-err').count()), 'typing clears the error');
    await shoot(p, `${tag}-02-build`);
    if (!desk) check(await fits(p), `${w}: build step fits`);
    await next(p);

    check(await step(p) === 'skills', `${w}: on to skills`);
    for (const t of ['Electrical', 'Power', 'Assembly', 'Firmware']) await p.locator(`[data-tax="${t}"]`).click();
    await p.locator('[data-tax="Firmware"]').click(); // twice: learning
    if (desk) {
      check((await p.locator('[data-counts]').innerText()) === '3 can do · 1 learning', 'tap once can do, twice learning');
      await p.locator('[data-tax="Mechanical"]').click();
      await p.locator('[data-tax="Mechanical"]').click();
      await p.locator('[data-tax="Mechanical"]').click();
      check((await p.locator('[data-counts]').innerText()) === '3 can do · 1 learning', 'a third tap clears it');
    }
    await p.getByRole('radio', { name: 'Did it for a living' }).click();
    await shoot(p, `${tag}-03-skills`);
    if (!desk) check(await fits(p), `${w}: skills fit`);
    await next(p);

    check(await step(p) === 'story', `${w}: on to the story`);
    await p.getByLabel('Something you\'ve built, and what went wrong').fill('I built a 48 V, 14S5P e-bike pack from salvaged laptop cells. A sense lead chafed through on the frame and took the BMS with it.');
    if (desk) {
      await p.waitForTimeout(150);
      await p.reload();
      await p.waitForSelector('section[data-step="story"]');
      check((await p.getByLabel('Something you\'ve built, and what went wrong').inputValue()).includes('sense lead chafed'), 'a reload in the middle comes back to the same step with the answer');
      await p.goto(`${BASE}/quiver/overview/summary`);
      await p.goto(`${BASE}/join`);
      await p.waitForSelector('section[data-step="story"]');
      check(true, 'leaving and opening /join again resumes where they stopped');
      await p.goBack();
      await p.goForward();
      await p.waitForSelector('section[data-step="story"]');
    }
    await shoot(p, `${tag}-04-story`);
    await next(p);

    check(await step(p) === 'place', `${w}: on to place and shop`);
    await p.locator('#city').fill('Houston');
    await p.locator('#country').fill('United States');
    for (const t of ['solder', 'spot', 'scope', 'fdm']) await p.locator(`[data-tool="${t}"]`).click();
    await p.getByRole('button', { name: 'Build my own Quiver or pack' }).click();
    await p.getByRole('button', { name: 'Help at a build day' }).click();
    await p.getByRole('radio', { name: 'Up to 300 km' }).click();
    await shoot(p, `${tag}-05-place`);
    if (!desk) check(await fits(p), `${w}: place fits`);
    await next(p);

    check(await step(p) === 'time', `${w}: on to time`);
    if (desk) check((await p.locator('#tz').inputValue()) === 'America/Chicago', 'the time zone defaults to the browser\'s');
    await p.getByRole('radio', { name: '5 to 10 h a week' }).click();
    await p.getByRole('button', { name: 'Weekday evenings' }).click();
    await p.getByRole('button', { name: 'Learning', exact: true }).click();
    await p.getByRole('button', { name: 'Build my own', exact: true }).click();
    await shoot(p, `${tag}-06-time`);
    await next(p);

    check(await step(p) === 'links', `${w}: on to links`);
    if (desk) check((await p.getByRole('radio', { name: 'X', exact: true }).getAttribute('aria-checked')) === 'true' && (await p.locator('section[data-step="links"]').innerText()).includes('Filled in from your link (x-longshot-teardown)'), 'how they heard is filled in from the ref');
    await p.locator('#discord').fill('maya.builds');
    await p.locator('#x').fill('@mayabuilds');
    if (desk) {
      await p.locator('#work0').fill('my e-bike pack video');
      await next(p);
      check(await step(p) === 'links' && (await p.locator('section[data-step="links"] .err').first().innerText()).includes('doesn\'t look like a link'), 'a link that isn\'t one is stopped, with the message under it');
    }
    await p.locator('#work0').fill('printables.com/@mokafor');
    await shoot(p, `${tag}-07-links`);
    await next(p);

    check(await step(p) === 'visibility', `${w}: on to who sees what`);
    await p.locator('#name').fill('Maya Okafor');
    if (desk) {
      await p.locator('#blurb').fill('Pack builder, see mokafor.dev for my work');
      await next(p);
      check((await p.locator('section[data-step="visibility"] .err').first().innerText()).includes('Keep links out of the blurb'), 'the blurb takes no links');
      await p.locator('#blurb').fill('x'.repeat(141));
      check((await p.locator('[data-blurb-count]').innerText()) === '-1', 'the blurb counts down to 140');
      await next(p);
      check((await p.locator('section[data-step="visibility"] .err').first().innerText()).includes('140 at most'), 'the blurb is 140 characters at most');
      await p.locator('[data-mapd="Firmware"]').click();
      check((await p.locator('[aria-labelledby="md-l"] + .err').innerText()).includes('3 at most') && (await p.locator('[data-mapd="Firmware"]').getAttribute('aria-pressed')) === 'false', 'the card takes up to 3 disciplines');
    }
    await p.locator('#blurb').fill('Utility field tech in Houston. Built a 14S e-bike pack from salvaged cells. Here to build Longshot packs.');
    await p.locator('[data-toggle="call"]').click();
    await p.getByRole('button', { name: 'Weekday evenings' }).click();
    const preview = await p.locator('[data-card-preview]').innerText();
    if (desk) check(preview.includes('Maya Okafor') && preview.includes('Houston, United States') && preview.includes('Electrical') && preview.includes('maya.builds') && preview.includes('Utility field tech'), 'the public card previews live');
    await shoot(p, `${tag}-08-visibility`);
    if (!desk) check(await fits(p), `${w}: who sees what fits`);
    await p.locator('[data-next]').click();
    await p.waitForSelector('section[data-step="done"]');
    check((await p.locator('section[data-step="done"] h1').innerText()) === 'You\'re in, Maya', `${w}: done: "You're in, Maya"`);
    await p.waitForTimeout(300);
    if (desk) check((await p.locator('.next3 .it').count()) === 3, 'done shows three next steps');
    await shoot(p, `${tag}-09-done`);
    await p.getByRole('link', { name: 'Go to your dashboard' }).click();
    await p.waitForSelector('[data-wtb]');
    await p.waitForTimeout(300);
    await shoot(p, `${tag}-10-you`);
    if (!desk) check(await fits(p), `${w}: Your Arrow fits`);
  }

  // Desk -----------------------------------------------------------------------------------
  const p = await open({ viewport: { width: 1440, height: 900 } });
  await walk(p, 1440, true);
  const you = await p.locator('main').innerText();
  check(/^(Morning|Afternoon|Evening), Maya$/.test(await p.locator('h1.title').innerText()), 'Your Arrow greets them by first name and time of day');
  check(you.includes('You want to build: A Longshot pack for my own Quiver first'), 'what they want to build is the line under it');
  const hello = await p.locator('#hello').inputValue();
  check(hello.startsWith('Hi all, I\'m Maya from Houston.') && hello.includes('a Longshot pack') && hello.includes('electrical, power and assembly'), 'a hello for #introductions drafted from their answers');
  check((await p.getByRole('link', { name: /Open Arrow's Discord/ }).getAttribute('href')) === 'https://discord.com/invite/arrow', 'a link to Arrow\'s Discord');
  check(!(await p.locator('[data-check="call"]').count()), 'no welcome call item while WELCOME_CALL is unset');
  const matches = await p.locator('[data-match]').evaluateAll((els) => els.map((e) => e.getAttribute('data-match') + ' | ' + e.innerText.replace(/\s+/g, ' ')));
  check(matches.length >= 3, `Matched for you lists work (${matches.length})`);
  check(matches.some((m) => m.startsWith('guide:') && /spot welder|Electrical|Power|Assembly/.test(m)), 'a manufacturing-guide step with open questions, matched by what they can do or their tools');
  check(matches.some((m) => m.startsWith('thread:')), 'an open thread in a zone that fits');
  check(matches.every((m) => m.includes('because:')), 'every match says why');
  const card = await p.locator('aside .pcard').innerText();
  check(card.includes('Maya Okafor') && card.includes('Houston, United States') && card.includes('Utility field tech'), 'their public card');
  const rec = await p.locator('[data-record]').innerText();
  check(rec.includes('Joined, heard about Arrow on X (link: x-longshot-teardown)') && rec.includes('Profile done'), 'their record: joined, how they came, profile done');
  await p.locator('[data-match^="guide:"]').first().click();
  await p.waitForTimeout(500);
  check(p.url().includes('/longshot/build/guide?step='), 'a guide match opens the guide at its step');
  await p.goBack();
  await p.waitForSelector('[data-match^="thread:"]');
  await p.locator('[data-match^="thread:"]').first().click();
  await p.waitForSelector('aside.panel h1.title');
  check(p.url().includes('thread='), 'a thread match opens the thread in the panel');
  // Their comment shows on their record.
  await p.locator('aside.panel').getByRole('textbox', { name: 'New comment' }).fill('I can weld these on my capacitor welder and report back.');
  await p.locator('aside.panel').getByRole('button', { name: 'Comment', exact: true }).click();
  await p.waitForTimeout(300);
  await p.getByRole('link', { name: 'Contributor Dashboard' }).click();
  await p.waitForSelector('[data-record]');
  check(p.url().endsWith('#/you'), 'the Contributor Dashboard button opens Your Arrow');
  const rec2 = await p.locator('[data-record]').innerText();
  check(rec2.includes('Commented on') || rec2.includes('Started a thread'), 'what they wrote in the app shows on their record');
  check(await p.locator('[data-check="real"]').evaluate((e) => e.classList.contains('done')), 'and ticks "Do one real thing"');
  await p.locator('[data-copy]').click();
  await p.waitForTimeout(100);
  check((await p.locator('[data-copy]').innerText()) === 'Copied', 'Copy copies the hello');
  await p.getByRole('checkbox', { name: 'I posted my hello' }).click();
  check((await p.locator('h2#gs-h .n').innerText()) === '3 of 3', 'ticking the hello completes the list');

  // Edit: same steps, prefilled; the last saves and goes back to Your Arrow.
  await p.getByRole('link', { name: 'Edit profile' }).click();
  await p.waitForSelector('section[data-step="build"]');
  check((await p.locator('#wtb').inputValue()).startsWith('A Longshot pack') && (await p.locator('[data-lane="hardware"]').getAttribute('aria-checked')) === 'true', 'a finished profile opens /join prefilled to edit');
  check(!(await p.getByRole('button', { name: 'Back' }).count()), 'editing starts at what they want to build, no sign-in step');
  await p.locator('#wtb').fill('A Longshot pack for my own Quiver, then a build day in Houston');
  for (let i = 0; i < 6; i++) await next(p);
  check(await step(p) === 'visibility' && (await p.locator('#name').inputValue()) === 'Maya Okafor' && (await p.locator('[data-next]').innerText()) === 'Save', 'every step comes back filled in; the last says Save');
  check((await p.locator('[data-toggle="call"]').getAttribute('aria-checked')) === 'true' && (await p.getByRole('button', { name: 'Weekday evenings' }).getAttribute('aria-pressed')) === 'true', 'the intro-call choice and its times come back too');
  await p.locator('[data-next]').click();
  await p.waitForSelector('[data-wtb]');
  check((await p.locator('[data-wtb]').innerText()).includes('then a build day in Houston'), 'Save goes to Your Arrow with the change');
  await p.goto(`${BASE}/join?step=links`);
  await p.waitForSelector('section[data-step="links"]');
  check((await p.locator('#x').inputValue()) === 'mayabuilds' && (await p.locator('#work0').inputValue()) === 'https://printables.com/@mokafor', 'links come back as handles and addresses');

  // Light theme at the desk.
  await p.evaluate(() => { localStorage.setItem('arrow.theme', 'light'); });
  await p.goto(`${BASE}/join?step=visibility`);
  await p.reload();
  await p.waitForSelector('section[data-step="visibility"]');
  await shoot(p, '1440-light-08-visibility');
  await p.goto(`${BASE}/join?step=skills`);
  await p.waitForSelector('section[data-step="skills"]');
  await shoot(p, '1440-light-03-skills');
  await p.goto(`${BASE}/you`);
  await p.waitForSelector('[data-wtb]');
  await p.waitForTimeout(300);
  await shoot(p, '1440-light-10-you');

  // Just following along: no work questions.
  const f = await open({ viewport: { width: 1440, height: 900 } });
  await f.goto(`${BASE}/you`);
  await f.waitForSelector('.start');
  check((await f.locator('.start').innerText()).includes('Fill in your profile'), 'Your Arrow without a profile asks for one');
  await f.getByRole('link', { name: 'Fill in your profile' }).click();
  await f.waitForSelector('section[data-step="signin"]');
  await f.getByRole('button', { name: 'Continue with email' }).click();
  await f.waitForSelector('section[data-step="build"]');
  await f.locator('#wtb').fill('Nothing yet. I want to watch Quiver fly');
  await f.locator('[data-lane="engineer"]').click();
  await f.locator('[data-lane="follow"]').click();
  check((await f.locator('[data-lane="engineer"]').getAttribute('aria-checked')) === 'false', '"Just following along" stands on its own');
  check((await progress(f)) === '1 / 3', 'following: 3 questions');
  await next(f);
  check(await step(f) === 'links', '"Just following along" skips the work steps');
  await next(f);
  check(await step(f) === 'visibility', 'then who sees what');
  await f.locator('#name').fill('Sam Watcher');
  await next(f);
  check((await f.locator('#vcountry').getAttribute('aria-invalid')) === 'true', 'the map needs a country');
  await f.locator('[data-toggle="map"]').click();
  await next(f);
  await f.waitForSelector('section[data-step="done"]');
  await f.goto(`${BASE}/join?step=skills`);
  await f.waitForSelector('section[data-step]');
  check(await step(f) === 'visibility' || await step(f) === 'build' || await step(f) === 'links', 'a follower can\'t be sent to a work step');
  await f.goto(`${BASE}/you`);
  await f.waitForSelector('[data-wtb]');
  check((await f.locator('main').innerText()).includes('You\'re following along') && !(await f.locator('[data-match]').count()), 'Your Arrow shows a follower where things happen, no matched work');
  check((await f.locator('aside .why').first().innerText()).includes('Not on the map'), 'their card says they\'re off the map');

  // Phone: the same walk, a shot of every step.
  const ph = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await walk(ph, 390, false);
  await ph.evaluate(() => { localStorage.setItem('arrow.theme', 'light'); });
  await ph.reload();
  await ph.waitForSelector('[data-wtb]');
  await ph.waitForTimeout(300);
  await shoot(ph, '390-light-10-you');
  check(await fits(ph), '390 light: Your Arrow fits');

  check(!errors.length, `no console or page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await b.close();
  srv.kill();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
