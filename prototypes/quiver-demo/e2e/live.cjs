// Live mode against a Supabase with the sa_ migration and seed: signed-out
// reading, the sign-in prompt, email sign-in, a vote that survives reload, a
// new thread, a lead decision funded as a bounty, a member claiming it.
//   BASE=http://localhost:4331 SUPA=http://127.0.0.1:55321 ANON=… SERVICE=… node e2e/live.cjs
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const { BASE, SUPA, ANON, SERVICE } = process.env;
const exe = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find((p) => fs.existsSync(p));
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };
const stamp = Date.now();
const users = { lead: `sa-lead-${stamp}@test.local`, member: `sa-member-${stamp}@test.local` };
const PASS = `pw-${stamp}-x`;

async function makeUser(email, name) {
  const r = await fetch(`${SUPA}/auth/v1/admin/users`, { method: 'POST', headers: admin, body: JSON.stringify({ email, password: PASS, email_confirm: true, user_metadata: { name } }) });
  return (await r.json()).id;
}
async function signIn(p, email) {
  await p.getByRole('button', { name: 'Use email and password instead' }).click();
  await p.getByRole('dialog').getByLabel('Email').fill(email);
  await p.getByRole('dialog').getByLabel('Password').fill(PASS);
  await p.getByRole('dialog').getByRole('button', { name: 'Sign in', exact: true }).click();
  await p.waitForFunction(() => document.querySelector('footer.footer')?.innerText.includes('Test '), null, { timeout: 15000 });
}

(async () => {
  const leadId = await makeUser(users.lead, 'Test Lead');
  const memberId = await makeUser(users.member, 'Test Member');
  const b = await chromium.launch({ executablePath: exe });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  const panel = p.locator('aside.panel');

  await p.goto(`${BASE}/#/quiver/overview/gps-rf`);
  await p.waitForSelector('.row[data-thread="Q-3"]', { timeout: 20000 });
  check(true, 'signed out, the seeded threads load from the database');
  await p.locator('.row[data-thread="Q-3"]').click();
  await panel.getByRole('button', { name: 'Vote up' }).first().click();
  check(await p.locator('.dlg').isVisible(), 'voting while signed out opens sign-in');
  await signIn(p, users.member);
  check((await p.locator('footer.footer').innerText()).includes('Test Member'), 'member is signed in and shown in the footer');

  await panel.getByRole('button', { name: 'Vote up' }).first().click();
  await p.waitForTimeout(1500);
  await p.reload();
  await p.waitForSelector('aside.panel .cm-vote .n', { timeout: 20000 });
  await p.waitForTimeout(1000);
  check((await panel.locator('.cm-vote .n').first().innerText()).trim() === '1', 'the vote is saved and survives a reload');

  await p.goto(`${BASE}/#/quiver/overview/power`);
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: 'New thread' }).click();
  await p.getByLabel('Title').fill(`Live test thread ${stamp}`);
  await p.getByRole('button', { name: 'Start thread' }).click();
  await p.waitForSelector('aside.panel h1.title', { timeout: 15000 });
  const tid = new URL(p.url().replace('/#', '')).searchParams.get('thread');
  check(/^Q-\d+$/.test(tid ?? '') && (await panel.locator('h1.title').innerText()).includes(`${stamp}`), `new thread ${tid} is created in the database`);
  await panel.getByLabel('New comment').fill('Do the obvious thing');
  await panel.getByRole('button', { name: 'Comment', exact: true }).click();
  await p.waitForTimeout(1500);
  await panel.locator('.cm.top').first().getByRole('button', { name: 'Reply', exact: true }).click();
  await panel.getByRole('textbox', { name: 'Reply' }).fill('Agreed, nested reply');
  await panel.locator('.cm-reply').getByRole('button', { name: 'Reply', exact: true }).click();
  await p.waitForTimeout(1500);
  check((await panel.innerText()).includes('Do the obvious thing'), 'top-level comment saved');
  check((await panel.locator('.cm-kids .cm').first().innerText()).includes('Agreed, nested reply'), 'nested reply saved under it');
  check(!(await panel.getByText('Outcome, as lead').count()), 'a member sees no lead controls');

  // Lead: sign in fresh in a new context, set role through the database the way a grant or lead would.
  await fetch(`${SUPA}/rest/v1/sa_members?user_id=eq.${leadId}`, { method: 'PATCH', headers: admin, body: JSON.stringify({ role: 'lead' }) }).catch(() => {});
  const c2 = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const q = await c2.newPage(); q.on('dialog', (d) => d.accept()); q.on('pageerror', (e) => errors.push(String(e)));
  await q.goto(`${BASE}/#/quiver/overview/power?thread=${tid}`);
  await q.waitForSelector('aside.panel h1.title', { timeout: 20000 });
  await q.locator('.signin').click();
  await signIn(q, users.lead);
  // The member row is created at sign-in; make it lead and reload.
  await fetch(`${SUPA}/rest/v1/sa_members?user_id=eq.${leadId}`, { method: 'PATCH', headers: admin, body: JSON.stringify({ role: 'lead' }) });
  await q.reload();
  await q.waitForSelector('aside.panel h1.title', { timeout: 20000 });
  await q.waitForTimeout(1500);
  const lp = q.locator('aside.panel');
  check(await lp.getByText('Outcome, as lead').count() > 0, 'the lead sees the outcome controls');
  await lp.getByLabel('Decision note').fill('Simple and cheap.');
  await lp.getByRole('button', { name: 'Record decision' }).click();
  await q.waitForTimeout(1500);
  check(/D-\d{3}/.test(await lp.locator('.pipe').innerText()), 'lead decision is recorded with a D-number');
  await lp.getByRole('button', { name: 'Fund it as a bounty or grant' }).click();
  await lp.getByLabel('Acceptance').fill('It works.');
  await lp.getByLabel('Reward in ARROW').fill('300');
  await lp.getByRole('button', { name: 'Draft bounty' }).click();
  await q.waitForTimeout(1500);
  await lp.getByRole('button', { name: 'Publish bounty' }).click();
  await q.waitForTimeout(1500);
  check((await lp.locator('.wc .stage').innerText()) === 'Open', 'bounty drafted and published');

  await p.goto(`${BASE}/#/quiver/overview/power?thread=${tid}`);
  await p.waitForSelector('aside.panel .wc', { timeout: 20000 });
  await panel.getByRole('button', { name: 'Claim this bounty' }).click();
  await p.waitForTimeout(1500);
  check((await panel.locator('.wc .stage').innerText()) === 'In progress' && (await panel.locator('.wc').innerText()).includes('You took it on'), 'the member claims it');
  const award = await panel.locator('.wc .award').innerText();
  check(award.includes('75 ARROW') && award.includes('You'), `proposer award goes to the position's author, seen by them as You (${award.replace(/\s+/g, ' ').slice(0, 90)})`);

  check(!errors.length, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await b.close();
  // Clean up the test accounts; their rows cascade or null out.
  for (const id of [leadId, memberId]) await fetch(`${SUPA}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: admin });
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
