// The registry's live path, against a Supabase mocked in the browser (no
// database is touched): /join signed out, the GitHub round trip coming back
// to the wizard's next step, each step saved with sa_save_profile (the ref,
// the browser's time zone), a reload mid-way, a database error shown by its
// field, finish, Your Arrow, and the Contributor Dashboard button signed in
// and out. Builds its own copy with fake env vars into /tmp.
// node e2e/registry-mock.cjs
const { chromium } = require('playwright-core');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const PORT = 4315, ORIGIN = `http://localhost:${PORT}`;
let failed = 0; const check = (ok, w) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${w}`); if (!ok) failed++; };
(async () => {
  const built = spawnSync('npx', ['vite', 'build', '--outDir', '/tmp/reg-live-dist', '--emptyOutDir', '--logLevel', 'error'], {
    stdio: 'inherit', env: { ...process.env, VITE_SUPABASE_URL: 'https://mock.supabase.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_mock' },
  });
  if (built.status !== 0) throw new Error('build failed');
  const srv = spawn('npx', ['vite', 'preview', '--outDir', '/tmp/reg-live-dist', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2000));
  const exe = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find((x) => fs.existsSync(x));
  const b = await chromium.launch({ executablePath: exe });
  const ctx = await b.newContext({ timezoneId: 'Europe/Berlin' });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  const calls = [];
  const USER = { id: '11111111-1111-1111-1111-111111111111', email: 'maya@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'github' }, user_metadata: {}, created_at: '2026-11-11T00:00:00Z' };
  const session = () => ({ access_token: 'h.' + Buffer.from(JSON.stringify({ sub: USER.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url') + '.s', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: USER });
  let profile = null;
  await ctx.route('https://mock.supabase.test/**', async (route) => {
    const u = new URL(route.request().url());
    const body = route.request().postData();
    if (u.pathname === '/auth/v1/authorize') return route.fulfill({ status: 302, headers: { location: `${ORIGIN}/?code=abc123` } });
    if (u.pathname === '/auth/v1/token') return route.fulfill({ json: session() });
    if (u.pathname === '/auth/v1/user') return route.fulfill({ json: USER });
    if (u.pathname.startsWith('/rest/v1/rpc/')) {
      const fn = u.pathname.slice('/rest/v1/rpc/'.length);
      const args = body ? JSON.parse(body) : {};
      calls.push({ fn, args });
      if (fn === 'sa_join') return route.fulfill({ json: { user_id: USER.id, display_name: 'mokafor', avatar_url: null, github: 'mokafor', role: 'member' } });
      if (fn === 'sa_registry_claim') return route.fulfill({ json: { person_id: null, linked: false, how: null, possible: 0 } });
      if (fn === 'sa_my_profile') return route.fulfill({ json: profile });
      if (fn === 'sa_save_profile') {
        const f = args.p_profile;
        profile = profile ?? { id: 'p1', name: 'mokafor', city: null, country: null, lat: null, lng: null, tz: null, disciplines: [], blurb: null, discord: null, github: 'mokafor', joined: '2026-11', has_account: true, map: 'off', ref: f.ref ?? null, claimed_at: new Date().toISOString(), profile: { wants_to_build: null, lanes: [], can: [], learn: [], experience: null, story: null, tools: [], build: [], travel: null, hours: null, availability: null, wants: [], never: null, links: [], blurb: null, map_disciplines: [], agent_drafted: false, updated_at: '', finished_at: null, call_ok: false, call_windows: null, heard_from: null } };
        for (const k of ['city', 'country', 'tz', 'map']) if (k in f) profile[k] = f[k];
        if (f.display_name) profile.name = f.display_name;
        if (f.discord) profile.discord = f.discord;
        for (const [k, v] of Object.entries(f)) if (k in profile.profile) profile.profile[k] = v;
        if (f.availability !== undefined) profile.profile.availability = f.availability;
        profile.profile.updated_at = new Date().toISOString();
        if (args.p_finish) profile.profile.finished_at = new Date().toISOString();
        if (f.blurb === 'BAD') return route.fulfill({ status: 400, json: { code: '22023', message: 'Keep links out of the blurb; add them under Links' } });
        return route.fulfill({ json: profile });
      }
      return route.fulfill({ json: null });
    }
    if (u.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
    return route.fulfill({ json: {} });
  });
  // Signed out: the sign-in step; GitHub leaves the page and comes back to /join.
  await p.goto(`${ORIGIN}/#/join?ref=dm-thomas`);
  await p.waitForSelector('section[data-step="signin"]');
  check(true, 'signed out: /join opens on sign-in');
  await p.getByRole('button', { name: 'Continue with GitHub' }).click();
  await p.waitForSelector('section[data-step="build"]', { timeout: 10000 });
  check(p.url().includes('#/join'), `back from GitHub, the wizard carries on at the next step (${p.url()})`);
  check(!(await p.evaluate(() => localStorage.getItem('superapp:join-pending'))), 'the pending join is forgotten');
  check(calls.some((c) => c.fn === 'sa_join') && calls.some((c) => c.fn === 'sa_my_profile'), 'joined the workspace and read their profile');
  await p.locator('#wtb').fill('Packs for Quiver');
  await p.locator('[data-lane="hardware"]').click();
  await p.locator('[data-next]').click();
  await p.waitForSelector('section[data-step="skills"]');
  const s1 = calls.filter((c) => c.fn === 'sa_save_profile').at(-1);
  check(s1 && s1.args.p_finish === false && s1.args.p_profile.wants_to_build === 'Packs for Quiver' && s1.args.p_profile.ref === 'dm-thomas', `step 1 saved, with the ref: ${JSON.stringify(s1?.args)}`);
  // Reload mid-way: resumes from the browser's answers.
  await p.locator('[data-tax="Power"]').click();
  await p.reload();
  await p.waitForSelector('section[data-step="skills"]', { timeout: 10000 });
  check((await p.locator('[data-counts]').innerText()).startsWith('1 can do'), 'live reload resumes at the step with the tap kept');
  for (let i = 0; i < 5; i++) { await p.locator('[data-next]').click(); await p.waitForTimeout(300); }
  check((await p.locator('section[data-step]').getAttribute('data-step')) === 'visibility', 'on to who sees what');
  const tzSaved = calls.filter((c) => c.fn === 'sa_save_profile').at(-1).args.p_profile.tz;
  check(tzSaved === 'Europe/Berlin', `time zone from the browser saved (${tzSaved})`);
  check((await p.locator('#name').inputValue()) === 'mokafor', 'name prefilled from the account');
  if (await p.locator('#vcountry').count()) await p.locator('#vcountry').fill('Germany');
  await p.locator('#blurb').fill('BAD');
  await p.locator('[data-next]').click();
  await p.waitForTimeout(500);
  check((await p.locator('section[data-step="visibility"] .err').first().innerText()).includes('Keep links out'), 'a database error shows next to its field');
  await p.locator('#blurb').fill('Pack builder in Berlin.');
  await p.locator('[data-next]').click();
  await p.waitForSelector('section[data-step="done"]', { timeout: 10000 });
  const fin = calls.filter((c) => c.fn === 'sa_save_profile').at(-1);
  check(fin.args.p_finish === true && fin.args.p_profile.blurb === 'Pack builder in Berlin.' && fin.args.p_profile.map === 'country', `finish saves with finish=true: map ${fin.args.p_profile.map}`);
  check(!(await p.evaluate(() => localStorage.getItem('superapp:join-draft.v1'))), 'the browser draft is cleared once saved');
  await p.getByRole('link', { name: 'Go to your dashboard' }).click();
  await p.waitForSelector('[data-wtb]');
  check((await p.locator('[data-wtb]').innerText()).includes('Packs for Quiver'), '/you shows the saved answer');
  check((await p.getByRole('link', { name: 'Contributor Dashboard' }).getAttribute('href')) === '#/you', 'dashboard button → /you when signed in');
  // Signed out: the button points at /join, and /you sends them there.
  const p2 = await (await b.newContext()).newPage();
  await p2.route('https://mock.supabase.test/**', (r) => r.fulfill({ json: [] }));
  await p2.goto(`${ORIGIN}/#/you`);
  await p2.waitForURL(/#\/join/, { timeout: 8000 });
  check(p2.url().includes('#/join'), 'signed out, /you goes to /join');
  check((await p2.getByRole('link', { name: 'Contributor Dashboard' }).getAttribute('href')) === '#/join', 'dashboard button → /join when signed out');
  check(!errors.length, `no page errors ${errors.join(' | ')}`);
  await b.close(); srv.kill(); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
