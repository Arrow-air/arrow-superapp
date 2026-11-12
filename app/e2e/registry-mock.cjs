// The registry's live path, against a Supabase mocked in the browser (no
// database is touched): /join signed out, the GitHub round trip coming back
// to the wizard's next step, each step saved with sa_save_profile (the ref,
// the browser's time zone), a reload mid-way, a database error shown by its
// field, finish, Your Arrow, and the Contributor Dashboard button signed in
// and out. Then Community as core: the People list and a person page from
// the registry RPCs, with status, owner and a note written back through them.
// Builds its own copy with fake env vars into /tmp.
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
  // Signed out, Community asks only for the public cards.
  const outFns = [];
  p2.on('request', (r) => { const m = r.url().match(/\/rest\/v1\/rpc\/(\w+)/); if (m) outFns.push(m[1]); });
  await p2.goto(`${ORIGIN}/#/community/people`);
  await p2.waitForSelector('[data-count]');
  await p2.waitForTimeout(500);
  check(outFns.includes('sa_registry_cards') && !outFns.some((f) => f !== 'sa_registry_cards'), `signed out (live): Community calls sa_registry_cards only (${outFns.join(', ')})`);
  const outText = await p2.locator('main.slot').innerText(); check(outText.includes("Nobody is on the map yet"), "signed out (live): an empty map says so");
  // Community as core: the list and a person page, from sa_registry_people and
  // sa_registry_person; owner, status and a note go through their RPCs.
  const CORE = { ...USER, id: '22222222-2222-2222-2222-222222222222', email: 'julius@example.com' };
  const THOMAS = '33333333-3333-3333-3333-333333333333';
  const coreSession = () => ({ ...session(), access_token: 'h.' + Buffer.from(JSON.stringify({ sub: CORE.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url') + '.s', user: CORE });
  const members = [
    { user_id: CORE.id, display_name: 'Julius', avatar_url: null, github: 'julius', role: 'core' },
    { user_id: THOMAS, display_name: 'Thomas', avatar_url: null, github: 'thomas', role: 'lead' },
  ];
  const pr = { wants_to_build: 'A Longshot pack for my own Quiver', lanes: ['hardware'], can: ['Electrical', 'Power'], learn: ['Firmware'], experience: null, story: 'Built a 14S e-bike pack.', tools: ['solder', 'spot', 'scope'], build: ['own'], travel: 'up to 300 km', hours: '5–10 h/wk', availability: 'Weekday evenings', wants: ['paid'], never: null, links: [{ url: 'https://youtube.com/@mayabuilds', label: 'YouTube' }], blurb: 'Pack builder.', map_disciplines: ['Electrical'], agent_drafted: false, updated_at: '2026-11-04T15:00:00Z', finished_at: '2026-11-04T15:00:00Z', call_ok: true, call_windows: 'Weekday evenings', heard_from: 'X' };
  const team = { outreach: [{ kind: 'intro', owner_id: THOMAS, status: 'talked', next_step: 'Invite to the build weekend', good_for: ['Longshot pack build'], intro_queue: false, updated_at: '2026-11-06T15:00:00Z' }], guess: null, note_count: 1, open_matches: 0 };
  const maya = { id: 'aaaaaaaa-0000-0000-0000-000000000001', name: 'Maya Okafor', city: 'Houston', country: 'United States', lat: 29.76, lng: -95.37, tz: 'America/Chicago', disciplines: ['Electrical'], blurb: 'Pack builder.', discord: 'maya.builds', github: 'mokafor', joined: '2026-11', has_account: true, profile: pr, map: 'city', ref: 'x-longshot', claimed_at: '2026-11-04T15:00:00Z', email: null, source: 'X · Longshot pack teardown', added_by: null, user_id: '44444444-4444-4444-4444-444444444444', created_at: '2026-11-04T15:00:00Z', ...team };
  const ade = { id: 'aaaaaaaa-0000-0000-0000-000000000002', name: 'Ade Bankole', city: 'Dallas', country: 'United States', lat: null, lng: null, tz: 'America/Chicago', disciplines: [], blurb: null, discord: 'ade.b', github: null, joined: '2026-11', has_account: false, profile: null, map: 'off', ref: null, claimed_at: null, email: null, source: 'Answers BMS questions in #longshot', added_by: CORE.id, user_id: null, created_at: '2026-11-05T15:00:00Z', outreach: [{ kind: 'intro', owner_id: CORE.id, status: 'new', next_step: null, good_for: [], intro_queue: true, updated_at: '2026-11-05T15:00:00Z' }], guess: { disciplines: ['Electrical', 'Power'], tools: [], updated_at: '2026-11-05T15:00:00Z' }, note_count: 0, open_matches: 0 };
  const notes = [{ id: 'n1', kind: 'call', body: '20 minutes. Field tech at a utility.', author_id: THOMAS, created_at: '2026-11-06T15:00:00Z', edited_at: null, edits: [] }];
  const coreCalls = [];
  const c = await b.newContext({ timezoneId: 'America/Chicago' });
  await c.addInitScript((s) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); }, coreSession());
  await c.route('https://mock.supabase.test/**', async (route) => {
    const u = new URL(route.request().url());
    const body = route.request().postData();
    if (u.pathname === '/auth/v1/user') return route.fulfill({ json: CORE });
    if (u.pathname === '/auth/v1/token') return route.fulfill({ json: coreSession() });
    if (u.pathname === '/rest/v1/sa_members') return route.fulfill({ json: members });
    if (u.pathname.startsWith('/rest/v1/rpc/')) {
      const fn = u.pathname.slice('/rest/v1/rpc/'.length);
      const args = body ? JSON.parse(body) : {};
      coreCalls.push({ fn, args });
      if (fn === 'sa_join') return route.fulfill({ json: members[0] });
      if (fn === 'sa_registry_claim') return route.fulfill({ json: { person_id: null, linked: false, how: null, possible: 0 } });
      if (fn === 'sa_registry_people') return route.fulfill({ json: [maya, ade] });
      if (fn === 'sa_registry_person') {
        const who = args.p_person === maya.id ? maya : args.p_person === ade.id ? ade : null;
        if (!who) return route.fulfill({ status: 400, json: { code: 'P0001', message: 'No such person' } });
        return route.fulfill({ json: { ...who, notes: who === maya ? notes : [], skill_checks: [], matches: [], outreach: who.outreach.map((o) => ({ ...o, history: [] })) } });
      }
      if (fn === 'sa_set_outreach') { if (args.p_status) maya.outreach[0].status = args.p_status; if (args.p_owner) maya.outreach[0].owner_id = args.p_owner; return route.fulfill({ status: 204, body: '' }); }
      if (fn === 'sa_add_note') { notes.unshift({ id: 'n2', kind: args.p_kind, body: args.p_body, author_id: CORE.id, created_at: new Date().toISOString(), edited_at: null, edits: [] }); return route.fulfill({ json: 'n2' }); }
      return route.fulfill({ json: null });
    }
    if (u.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
    return route.fulfill({ json: {} });
  });
  const cp = await c.newPage();
  cp.on('pageerror', (e) => errors.push(String(e)));
  await cp.goto(`${ORIGIN}/#/community/people`);
  await cp.waitForSelector('tr[data-person]', { timeout: 10000 });
  check(coreCalls.some((x) => x.fn === 'sa_registry_people') && !coreCalls.some((x) => x.fn === 'sa_registry_matches'), 'core (live): the list reads sa_registry_people; core doesn\'t ask for "same person?" cards');
  check((await cp.locator('tr[data-person]').count()) === 2 && (await cp.locator(`tr[data-person="${ade.id}"]`).innerText()).includes('NO ACCOUNT'), 'core (live): Maya and Ade, Ade with no account');
  check((await cp.locator(`tr[data-person="${maya.id}"] [data-owner]`).innerText()).includes('Thomas'), 'core (live): owner named from the workspace members');
  check(await cp.getByRole('link', { name: /Reach out/ }).count() >= 1, 'core (live): the Reach out tab');
  await cp.locator(`tr[data-person="${maya.id}"] .nm`).click();
  await cp.waitForSelector('[data-teampanel]', { timeout: 10000 });
  check(coreCalls.some((x) => x.fn === 'sa_registry_person' && x.args.p_person === maya.id), 'core (live): the page reads sa_registry_person');
  check((await cp.locator('[data-note]').first().innerText()).includes('Thomas') && (await cp.locator('[data-wtb]').innerText()).includes('A Longshot pack'), 'core (live): Thomas\'s call note and what she wants to build');
  await cp.locator('[data-status-select]').selectOption('active');
  await cp.waitForTimeout(500);
  const so = coreCalls.filter((x) => x.fn === 'sa_set_outreach').at(-1);
  check(so && so.args.p_person === maya.id && so.args.p_status === 'active' && so.args.p_kind === 'intro' && so.args.p_unassign === false, `core (live): status through sa_set_outreach ${JSON.stringify(so?.args)}`);
  await cp.locator('[data-take]').click();
  await cp.waitForTimeout(500);
  const take = coreCalls.filter((x) => x.fn === 'sa_set_outreach').at(-1);
  check(take.args.p_owner === CORE.id, 'core (live): Take it sends your own account id');
  await cp.locator('[data-note-body]').fill('Sent her the pack guide.');
  await cp.locator('[data-add-note]').click();
  await cp.waitForTimeout(500);
  const an = coreCalls.filter((x) => x.fn === 'sa_add_note').at(-1);
  check(an && an.args.p_kind === 'note' && an.args.p_body === 'Sent her the pack guide.' && an.args.p_discipline === null, 'core (live): a note through sa_add_note');
  check((await cp.locator('[data-note]').first().innerText()).includes('Sent her the pack guide'), 'core (live): the new note shows after a reload of the person');
  await cp.goto(`${ORIGIN}/#/community/people/aaaaaaaa-0000-0000-0000-00000000dead`);
  await cp.waitForSelector('[data-missing]', { timeout: 10000 });
  check(true, 'core (live): an unknown person says so');

  check(!errors.length, `no page errors ${errors.join(' | ')}`);
  await b.close(); srv.kill(); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
