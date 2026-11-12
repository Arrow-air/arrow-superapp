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
      if (fn === 'sa_registry_claim') return route.fulfill({ json: { person_id: null, linked: false, how: null } });
      if (fn === 'sa_my_profile') return route.fulfill({ json: profile });
      if (fn === 'sa_delete_my_profile') { profile = null; return route.fulfill({ status: 204, body: '' }); }
      if (fn === 'sa_save_profile') {
        const f = args.p_profile;
        profile = profile ?? { id: 'p1', name: 'mokafor', city: null, country: null, lat: null, lng: null, tz: null, disciplines: [], blurb: null, discord: null, github: 'mokafor', joined: '2026-11', has_account: true, map: 'off', ref: f.ref ?? null, claimed_at: new Date().toISOString(), profile: { wants_to_build: null, lanes: [], can: [], learn: [], experience: null, story: null, tools: [], build: [], travel: null, hours: null, availability: null, wants: [], never: null, links: [], blurb: null, map_disciplines: [], agent_drafted: false, updated_at: '', finished_at: null, call_ok: false, call_windows: null, heard_from: null } };
        for (const k of ['city', 'country', 'tz', 'map']) if (k in f) profile[k] = f[k];
        if (f.display_name) profile.name = f.display_name;
        if (f.discord) profile.profile.discord_said = f.discord;
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
  check((await p.locator('[data-toggle="map"]').getAttribute('aria-checked')) === 'false', 'the map starts off');
  await p.locator('[data-toggle="map"]').click();
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
  // Delete my profile (live): a confirm, then sa_delete_my_profile; the account stays signed in.
  await p.locator('[data-delete-profile]').click();
  await p.locator('[data-confirm-delete] [data-confirm]').click();
  await p.waitForSelector('[data-profile-deleted]', { timeout: 10000 });
  check(calls.some((c) => c.fn === 'sa_delete_my_profile') && (await p.locator('main').innerText()).includes('Fill in your profile'), 'Delete my profile calls sa_delete_my_profile; the account stays, with a fresh start');
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
  const added = [];
  const everyone = () => [maya, ade, ...added];
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
      if (fn === 'sa_registry_claim') return route.fulfill({ json: { person_id: null, linked: false, how: null } });
      if (fn === 'sa_registry_people') return route.fulfill({ json: everyone() });
      if (fn === 'sa_registry_person') {
        const who = everyone().find((x) => x.id === args.p_person);
        if (!who) return route.fulfill({ status: 400, json: { code: 'P0001', message: 'No such person' } });
        return route.fulfill({ json: { ...who, notes: who === maya ? notes : [], skill_checks: [], matches: [], outreach: who.outreach.map((o) => ({ ...o, history: [] })) } });
      }
      if (fn === 'sa_set_outreach') {
        const o = everyone().find((x) => x.id === args.p_person)?.outreach[0];
        if (o) { if (args.p_status) o.status = args.p_status; if (args.p_owner) o.owner_id = args.p_owner; if (args.p_next_step !== null) o.next_step = args.p_next_step; if (args.p_good_for) o.good_for = args.p_good_for; }
        return route.fulfill({ status: 204, body: '' });
      }
      if (fn === 'sa_add_note') {
        if (args.p_person === maya.id) notes.unshift({ id: 'n2', kind: args.p_kind, body: args.p_body, author_id: CORE.id, created_at: new Date().toISOString(), edited_at: null, edits: [] });
        const who = everyone().find((x) => x.id === args.p_person);
        if (who && args.p_kind === 'call') who.call_notes = (who.call_notes ?? 0) + 1;
        return route.fulfill({ json: 'n2' });
      }
      if (fn === 'sa_find_people') {
        const hit = (args.p_discord === 'ade.b' || (args.p_name ?? '').toLowerCase().startsWith('ade b')) ? [{ id: ade.id, name: ade.name, github: null, discord: 'ade.b', email: null, has_account: false, source: ade.source, why: [args.p_discord === 'ade.b' ? 'discord' : 'name'] }] : [];
        return route.fulfill({ json: hit });
      }
      if (fn === 'sa_add_person') {
        if (args.p_email === 'ade@example.com') return route.fulfill({ status: 409, json: { code: '23505', message: 'Already in the registry: Ade Bankole' } });
        const id = `bbbbbbbb-0000-0000-0000-00000000000${added.length + 1}`;
        added.push({ ...ade, id, name: args.p_name, discord: args.p_discord_username, github: args.p_github_login, github_id: args.p_github_id, email: args.p_email, source: args.p_source, tz: args.p_tz,
          outreach: [{ kind: 'intro', owner_id: args.p_owner, status: 'new', next_step: null, good_for: [], intro_queue: args.p_intro_queue, updated_at: new Date().toISOString() }],
          guess: { disciplines: args.p_guess_disciplines ?? [], tools: args.p_guess_tools ?? [], updated_at: new Date().toISOString() }, note_count: args.p_note ? 1 : 0 });
        return route.fulfill({ json: id });
      }
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


  // Add a person (live): GitHub logins resolved by GitHub's API (mocked here),
  // the duplicate check, a refused duplicate, then a saved record.
  const ghAsked = [];
  await c.route('https://api.github.com/users/**', (route) => {
    const login = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop());
    ghAsked.push(login);
    if (login === 'kmori') return route.fulfill({ json: { login: 'KMori', id: 4242, name: 'Kenji Mori', type: 'User' } });
    if (login === 'ghost404') return route.fulfill({ status: 404, json: { message: 'Not Found' } });
    if (login === 'busy') return route.fulfill({ status: 403, headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'X-RateLimit-Remaining, X-RateLimit-Reset', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 600) }, json: { message: 'API rate limit exceeded' } });
    return route.abort('internetdisconnected');
  });
  await cp.goto(`${ORIGIN}/#/community/people/add`);
  await cp.waitForSelector('[data-addform]', { timeout: 10000 });
  const gh = async (login) => { await cp.locator('#ap-github').fill(login); await cp.waitForTimeout(900); return cp.locator('[data-gh]').innerText(); };
  check((await gh('kmori')).includes('github.com/KMori (Kenji Mori)'), 'core (live): a GitHub login resolves through api.github.com');
  check((await gh('ghost404')).includes('GitHub has nobody called ghost404') , 'core (live): GitHub\'s 404 is "nobody called"');
  const rl = await gh('busy');
  check(rl.includes("won't answer more lookups") && rl.includes('saved without an id'), `core (live): rate limited says so, and that the login is saved without an id (${rl})`);
  check((await gh('nowhere')).includes("Couldn't reach GitHub"), 'core (live): no network says so');
  await gh('kmori');
  check(ghAsked.filter((x) => x === 'kmori').length === 1, 'core (live): a login GitHub answered is asked once');
  await cp.locator('#ap-name').fill('Ade Bankole');
  await cp.locator('#ap-discord').fill('ade.b');
  await cp.waitForTimeout(900);
  const fp = coreCalls.filter((x) => x.fn === 'sa_find_people').at(-1);
  check(fp && fp.args.p_discord === 'ade.b' && fp.args.p_github === 'kmori' && fp.args.p_github_id === 4242, `core (live): the duplicate check sends the handles and the resolved id ${JSON.stringify(fp?.args)}`);
  check((await cp.locator('[data-dupes]').innerText()).includes('Already in the registry') && await cp.locator(`[data-dupe="${ade.id}"]`).count() === 1, 'core (live): Ade shows as already in the registry');
  await cp.locator('#ap-name').fill('Luis Ortega');
  await cp.locator('#ap-discord').fill('luis.fpv');
  await cp.locator('#ap-source').fill('Flies FPV at the Marfa field');
  await cp.locator('#ap-email').fill('ade@example.com');
  await cp.locator('#ap-tz').fill('America/Chicago');
  await cp.locator('[data-tax="Piloting"]').click();
  await cp.locator('[data-queue]').click();
  await cp.locator('[data-add]').click();
  await cp.waitForSelector('[data-add-err]', { timeout: 10000 });
  let ap = coreCalls.filter((x) => x.fn === 'sa_add_person').at(-1);
  check((await cp.locator('[data-add-err]').innerText()).includes('Already in the registry: Ade Bankole') && cp.url().endsWith('/people/add'), 'core (live): a duplicate refused by sa_add_person shows its error and stays');
  check(ap.args.p_github_login === 'KMori' && ap.args.p_github_id === 4242 && ap.args.p_discord_username === 'luis.fpv' && ap.args.p_discord_id === null
    && ap.args.p_owner === CORE.id && ap.args.p_intro_queue === true && ap.args.p_tz === 'America/Chicago' && JSON.stringify(ap.args.p_guess_disciplines) === '["Piloting"]',
    `core (live): sa_add_person gets GitHub's login and id, the Discord username with no id, owner, queue, zone and guess ${JSON.stringify(ap.args)}`);
  await cp.locator('#ap-email').fill('luis@example.com');
  await gh('busy');
  await cp.locator('[data-add]').click();
  await cp.waitForSelector('[data-name]', { timeout: 10000 });
  ap = coreCalls.filter((x) => x.fn === 'sa_add_person').at(-1);
  check(ap.args.p_github_login === 'busy' && ap.args.p_github_id === null && ap.args.p_email === 'luis@example.com', 'core (live): a login GitHub couldn\'t check is saved without an id');
  check(cp.url().endsWith(`/community/people/${added[0].id}`) && (await cp.locator('[data-name]').innerText()) === 'Luis Ortega', 'core (live): Add to registry goes to the new record');
  check(coreCalls.filter((x) => x.fn === 'sa_registry_people').length >= 2, 'core (live): the list is reloaded after adding');

  // Reach out (live): Ade's call is booked; the after-call note writes a call
  // note, then the status, next step and good-for in one save.
  ade.outreach[0].status = 'booked';
  await cp.goto(`${ORIGIN}/#/community/reach-out?person=${ade.id}`);
  await cp.waitForSelector('[data-aftercall]', { timeout: 10000 });
  check((await cp.locator('[data-later]').innerText()).includes('booked'), 'core (live): a booked call folds the invite away');
  await cp.locator('[data-ac-good]').fill('Cell grading and matching.');
  await cp.locator('[data-ac-next]').fill('Pack build day in Dallas');
  await cp.locator('[data-ac-tag-input]').fill('Longshot BMS');
  await cp.locator('[data-ac-tag-input]').press('Enter');
  const before = coreCalls.length;
  await cp.locator('[data-ac-save]').click();
  await cp.waitForSelector('[data-ac-done]', { timeout: 10000 });
  const writes = coreCalls.slice(before).filter((x) => x.fn === 'sa_add_note' || x.fn === 'sa_set_outreach');
  check(writes.length === 2 && writes[0].fn === 'sa_add_note' && writes[0].args.p_kind === 'call' && writes[0].args.p_person === ade.id
    && writes[0].args.p_body === 'Good at: Cell grading and matching.\nNext step: Pack build day in Dallas', `core (live): the call note first ${JSON.stringify(writes[0]?.args)}`);
  check(writes[1]?.fn === 'sa_set_outreach' && writes[1].args.p_status === 'talked' && writes[1].args.p_next_step === 'Pack build day in Dallas'
    && JSON.stringify(writes[1].args.p_good_for) === '["Longshot BMS"]' && writes[1].args.p_kind === 'intro', `core (live): then the status, next step and good for ${JSON.stringify(writes[1]?.args)}`);
  check((await cp.locator('[data-composer] .pill').first().innerText()).includes('Talked'), 'core (live): Ade shows as talked');
  // Mark invited (live) on someone in the queue: Luis, added above.
  await cp.goto(`${ORIGIN}/#/community/reach-out?person=${added[0].id}&invite=join`);
  await cp.waitForSelector('[data-composer][data-mode="join"]', { timeout: 10000 });
  check((await cp.locator('[data-draft]').inputValue()).includes(`${ORIGIN}/#/join?ref=invite-julius`), 'core (live): the join invite names the signed-in inviter');
  await cp.locator('[data-mark="invited"]').click();
  await cp.waitForSelector('[data-flash]', { timeout: 10000 });
  const mi = coreCalls.filter((x) => x.fn === 'sa_set_outreach').at(-1);
  check(mi.args.p_person === added[0].id && mi.args.p_status === 'invited' && mi.args.p_note === 'Invited to join' && mi.args.p_owner === null, `core (live): Mark invited, already his owner's ${JSON.stringify(mi.args)}`);
  check(!coreCalls.some((x) => /send|message|dm|email/i.test(x.fn)), 'core (live): nothing is ever sent');

  // A lead (live): a "same person?" card with its evidence, a link the database
  // refuses (its reason shown), Unlink on a linked record, Delete this record.
  const LEAD = { ...USER, id: THOMAS, email: 'thomas@example.com' };
  const leadSession = () => ({ ...session(), access_token: 'h.' + Buffer.from(JSON.stringify({ sub: LEAD.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url') + '.s', user: LEAD });
  const kai = { ...ade, id: 'cccccccc-0000-0000-0000-000000000001', name: 'Kai Mori', discord: null, github: 'kai-real', github_id: 777, email: null, source: 'Commits in quiver', added_by: THOMAS, guess: null };
  const pat = { ...maya, id: 'cccccccc-0000-0000-0000-000000000002', name: 'Pat Shop', added_by: THOMAS, has_account: true, user_id: '55555555-5555-5555-5555-555555555555',
    city: null, country: null, guess: { disciplines: [], tools: [], city: 'Alpine', country: 'United States', updated_at: '2026-11-05T15:00:00Z' } };
  let leadPeople = [maya, kai, pat];
  const match = { id: 'dddddddd-0000-0000-0000-000000000001', person_id: kai.id, person_name: 'Kai Mori', user_id: '66666666-6666-6666-6666-666666666666', account_person_id: null, account_name: 'Kai Mori',
    account_email: 'kai.fake@example.com', account_created_at: '2026-11-11T20:00:00Z', account_github: 'kai-fake', account_discord: null,
    record_email: null, record_github: 'kai-real', record_github_resolved: true, record_discord: null, record_discord_resolved: false, reason: 'same name', created_at: '2026-11-11T20:00:00Z' };
  const leadCalls = [];
  const lc = await b.newContext({ timezoneId: 'America/Chicago' });
  await lc.addInitScript((x) => { localStorage.setItem('sb-mock-auth-token', JSON.stringify(x)); }, leadSession());
  await lc.route('https://mock.supabase.test/**', async (route) => {
    const u = new URL(route.request().url());
    const body = route.request().postData();
    if (u.pathname === '/auth/v1/user') return route.fulfill({ json: LEAD });
    if (u.pathname === '/auth/v1/token') return route.fulfill({ json: leadSession() });
    if (u.pathname === '/rest/v1/sa_members') return route.fulfill({ json: members });
    if (u.pathname.startsWith('/rest/v1/rpc/')) {
      const fn = u.pathname.slice('/rest/v1/rpc/'.length);
      const args = body ? JSON.parse(body) : {};
      leadCalls.push({ fn, args });
      if (fn === 'sa_join') return route.fulfill({ json: members[1] });
      if (fn === 'sa_registry_claim') return route.fulfill({ json: { person_id: null, linked: false, how: null } });
      if (fn === 'sa_registry_people') return route.fulfill({ json: leadPeople });
      if (fn === 'sa_registry_matches') return route.fulfill({ json: [match] });
      if (fn === 'sa_registry_person') {
        const who = leadPeople.find((x) => x.id === args.p_person);
        if (!who) return route.fulfill({ status: 400, json: { code: 'P0001', message: 'No such person' } });
        return route.fulfill({ json: { ...who, notes: [], skill_checks: [], matches: who === kai ? [match] : [], outreach: who.outreach.map((o) => ({ ...o, history: [] })) } });
      }
      if (fn === 'sa_link_person') return route.fulfill({ status: 403, json: { code: '42501', message: 'This record holds a GitHub account that this account doesn\'t sign in with. If it\'s them, they sign in with that GitHub and it links by itself; if the record is wrong, fix it first.' } });
      if (fn === 'sa_unlink_person') { Object.assign(pat, { has_account: false, user_id: null }); return route.fulfill({ json: 'eeeeeeee-0000-0000-0000-000000000001' }); }
      if (fn === 'sa_delete_person') { leadPeople = leadPeople.filter((x) => x.id !== args.p_person); return route.fulfill({ status: 204, body: '' }); }
      return route.fulfill({ json: null });
    }
    if (u.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
    return route.fulfill({ json: {} });
  });
  const lp = await lc.newPage();
  lp.on('pageerror', (e) => errors.push(String(e)));
  await lp.goto(`${ORIGIN}/#/community/people`);
  await lp.waitForSelector('[data-match]', { timeout: 10000 });
  const ev = await lp.locator('[data-evidence]').innerText();
  check(ev.includes('kai.fake@example.com') && /kai-fake\s*· signed in with/.test(ev) && ev.includes('kai-real · resolved to an account'), `lead (live): the card shows sa_registry_matches' evidence (${ev.replace(/\s+/g, ' ')})`);
  await lp.locator('[data-link]').click();
  await lp.waitForSelector('[data-refused]', { timeout: 10000 });
  check((await lp.locator('[data-refused]').innerText()).includes('holds a GitHub account that this account doesn\'t sign in with')
    && leadCalls.some((x) => x.fn === 'sa_link_person' && x.args.p_match === match.id && x.args.p_same === true), 'lead (live): a link the database refuses shows its reason');
  await lp.goto(`${ORIGIN}/#/community/people/${pat.id}`);
  await lp.waitForSelector('[data-teampanel]', { timeout: 10000 });
  check((await lp.locator('[data-guess-place]').innerText()).includes('Alpine'), 'lead (live): the team\'s place guess shows in the team panel');
  await lp.locator('[data-unlink]').click();
  await lp.locator('[data-confirm-unlink] [data-confirm]').click();
  await lp.waitForSelector('[data-unlinked]', { timeout: 10000 });
  check(leadCalls.some((x) => x.fn === 'sa_unlink_person' && x.args.p_person === pat.id), 'lead (live): Unlink calls sa_unlink_person after the confirm');
  await lp.goto(`${ORIGIN}/#/community/people/${kai.id}`);
  await lp.waitForSelector('[data-delete-record]', { timeout: 10000 });
  await lp.locator('[data-delete-record]').click();
  await lp.locator('[data-confirm-delete] [data-confirm]').click();
  await lp.waitForURL(/\/community\/people$/, { timeout: 10000 });
  check(leadCalls.some((x) => x.fn === 'sa_delete_person' && x.args.p_person === kai.id), 'lead (live): Delete this record calls sa_delete_person after the confirm, then the list');
  // Core never gets the lead's buttons.
  await cp.goto(`${ORIGIN}/#/community/people/${ade.id}`);
  await cp.waitForSelector('[data-teampanel]', { timeout: 10000 });
  check(!(await cp.locator('[data-lead-actions], [data-delete-record], [data-unlink]').count()), 'core (live): no Unlink or Delete this record');

  check(!errors.length, `no page errors ${errors.join(' | ')}`);
  await b.close(); srv.kill(); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
