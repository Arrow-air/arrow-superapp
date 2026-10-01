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
async function tokenFor(email) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASS }) });
  return (await r.json()).access_token;
}
/** Call an sa_ function as a user; resolves to the HTTP status. */
async function rpcAs(email, fn, args) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${await tokenFor(email)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  return r.status;
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
  await panel.getByRole('button', { name: 'Upvote thread' }).click();
  await p.waitForTimeout(1500);
  await p.reload();
  await p.waitForSelector('aside.panel .head-top .tv .n', { timeout: 20000 });
  await p.waitForTimeout(1000);
  check((await panel.locator('.head-top .tv .n').innerText()).trim() === '1' && (await panel.getByRole('button', { name: 'Upvote thread' }).getAttribute('aria-pressed')) === 'true', 'a thread upvote is saved and survives a reload');

  await p.goto(`${BASE}/#/quiver/overview/power`);
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: 'New thread' }).click();
  await p.getByLabel('Title').fill(`Live test thread ${stamp}`);
  await p.getByRole('button', { name: 'Post thread' }).click();
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

  // Editing your own comment: saved, marked edited, the earlier text kept privately.
  const own = panel.locator('.cm.top').filter({ hasText: 'Do the obvious thing' });
  await own.getByRole('button', { name: /^Edit option / }).click();
  await panel.getByRole('textbox', { name: 'Edit comment' }).fill('Do the obvious thing, carefully');
  await panel.getByRole('button', { name: 'Save' }).click();
  await p.waitForTimeout(1500);
  await p.reload();
  await p.waitForSelector('aside.panel .cm.top', { timeout: 20000 });
  await p.waitForTimeout(1000);
  const edits = await (await fetch(`${SUPA}/rest/v1/sa_comment_edits?thread_id=eq.${tid}&select=text`, { headers: admin })).json();
  check((await panel.innerText()).includes('Do the obvious thing, carefully') && (await panel.locator('.cm.top .edited').count()) > 0 && edits.some((e) => e.text === 'Do the obvious thing'), 'a member edits their own comment; it shows as edited and the old text is kept privately');
  check(await rpcAs(users.member, 'sa_edit_comment', { p_comment: 'Q-6-p1', p_text: 'hijack' }) >= 400, 'the database refuses editing someone else\'s comment');

  // Deleting comments: your own reply; never someone else's.
  await panel.getByLabel('New comment').fill('Second idea, posted to be removed');
  await panel.getByRole('button', { name: 'Comment', exact: true }).click();
  await p.waitForTimeout(1500);
  const replyNode = panel.locator('.cm-kids .cm').filter({ hasText: 'Agreed, nested reply' });
  await replyNode.getByRole('button', { name: 'Delete this reply' }).click();
  await replyNode.getByRole('button', { name: 'Yes, delete' }).click();
  await p.waitForTimeout(1500);
  await p.reload();
  await p.waitForSelector('aside.panel .cm.top', { timeout: 20000 });
  await p.waitForTimeout(1000);
  check(!(await panel.innerText()).includes('Agreed, nested reply') && (await panel.innerText()).includes('Do the obvious thing'), 'a member deletes their own reply and it stays gone after a reload');
  check(await rpcAs(users.member, 'sa_delete_comment', { p_comment: 'Q-6-p1' }) >= 400, 'the database refuses a member deleting someone else\'s comment');

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
  check(await rpcAs(users.member, 'sa_vote_thread', { p_thread: tid, p_value: 1 }) >= 400, 'the database refuses thread votes once it is decided');
  check(!(await lp.locator('.cm.top.decided').getByRole('button', { name: /^Delete option / }).count()), 'the adopted option has no Delete');
  const adopted = (await (await fetch(`${SUPA}/rest/v1/sa_threads?id=eq.${tid}&select=settled`, { headers: admin })).json())[0].settled.positionId;
  check(await rpcAs(users.lead, 'sa_delete_comment', { p_comment: adopted }) >= 400, 'the database keeps the adopted option even for a lead');
  check(await rpcAs(users.member, 'sa_edit_comment', { p_comment: adopted, p_text: 'Changed after adoption' }) >= 400, 'the adopted option can\'t be edited, even by its author');
  const spam = lp.locator('.cm.top').filter({ hasText: 'Second idea, posted to be removed' });
  await spam.getByRole('button', { name: /^Delete option / }).click();
  await spam.getByRole('button', { name: 'Yes, delete' }).click();
  await q.waitForTimeout(1500);
  const gone = (await (await fetch(`${SUPA}/rest/v1/sa_positions?thread_id=eq.${tid}&deleted_at=not.is.null&select=id,text,author_id,removed`, { headers: admin })).json());
  const kept = gone.length ? (await (await fetch(`${SUPA}/rest/v1/sa_deleted_comments?id=eq.${gone.find((g) => g.removed)?.id}&select=text`, { headers: admin })).json()) : [];
  check(!(await lp.innerText()).includes('Second idea, posted to be removed') && gone.some((g) => g.removed && g.text === '' && !g.author_id) && kept[0]?.text === 'Second idea, posted to be removed', 'a lead removes a member\'s comment: blanked publicly, kept privately');
  const anonRead = await fetch(`${SUPA}/rest/v1/sa_deleted_comments?select=id`, { headers: { apikey: ANON } });
  check(anonRead.status >= 400 || (await anonRead.json()).length === 0, 'deleted text is not readable through the API');
  // Reopen as discussion, then decide again: the D-number comes back.
  const decNo = (/D-\d{3}/.exec(await lp.locator('.pipe').innerText()) ?? [''])[0];
  await lp.getByRole('button', { name: 'Reopen as discussion' }).click();
  await lp.getByLabel('Why reopen').fill('Checking the reopen path');
  await lp.getByRole('button', { name: 'Reopen', exact: true }).click();
  await q.waitForTimeout(1500);
  check((await lp.getByText('Outcome, as lead').count()) > 0 && (await lp.innerText()).includes(`${decNo} (adopted`) && (await lp.innerText()).includes('Checking the reopen path'), 'a lead reopens the decision; it goes on the thread\'s record');
  await lp.getByLabel('Decision note').fill('Simple and cheap, still.');
  await lp.getByRole('button', { name: 'Record decision' }).click();
  await q.waitForTimeout(1500);
  check((await lp.locator('.pipe').innerText()).includes(decNo), `decided again, it keeps ${decNo}`);
  // A draft bounty, deleted: gone from the thread, kept privately; the decision can be funded again.
  await lp.getByRole('button', { name: 'Fund it as a bounty or grant' }).click();
  await lp.getByLabel('Acceptance').fill('Draft to delete.');
  await lp.getByLabel('Reward in ARROW').fill('50');
  await lp.getByRole('button', { name: 'Draft bounty' }).click();
  await q.waitForTimeout(1500);
  const draftId = (await lp.locator('.wc .wc-head .mono').innerText()).trim();
  await lp.getByRole('button', { name: `Delete ${draftId}` }).click();
  await lp.getByRole('button', { name: 'Yes, delete' }).click();
  await q.waitForTimeout(1500);
  const keptWork = await (await fetch(`${SUPA}/rest/v1/sa_deleted_work?id=eq.${draftId}&select=id,acceptance`, { headers: admin })).json();
  check(!(await lp.locator('.wc').count()) && keptWork[0]?.acceptance === 'Draft to delete.', `a lead deletes draft ${draftId}: gone from the thread, kept privately`);
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
  check(await rpcAs(users.lead, 'sa_reopen', { p_thread: tid }) >= 400, 'the database keeps a decision once its bounty is claimed');
  const claimed = (await (await fetch(`${SUPA}/rest/v1/sa_work?thread_id=eq.${tid}&select=id`, { headers: admin })).json())[0]?.id;
  check(claimed && await rpcAs(users.lead, 'sa_delete_work', { p_work: claimed }) >= 400, 'the database keeps a bounty once it is claimed');
  const award = await panel.locator('.wc .award').innerText();
  check(award.includes('75 ARROW') && award.includes('You'), `proposer award goes to the position's author, seen by them as You (${award.replace(/\s+/g, ' ').slice(0, 90)})`);

  check(!errors.length, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await b.close();
  // Clean up the test accounts; their rows cascade or null out.
  for (const id of [leadId, memberId]) await fetch(`${SUPA}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: admin });
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
