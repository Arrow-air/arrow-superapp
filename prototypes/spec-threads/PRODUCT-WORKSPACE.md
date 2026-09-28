# Arrow workspace — local pilot

## Demo-ready iteration — 2026-09-27 (`demo-ready-v1`)

Thomas asked for the workspace to be ready to walk Alperen and Gavin through before connecting Discord. A review on 2026-09-27 found the 09-26 build had drifted from the 09-23 brief: weighted support was switched off, rewards were a free-text field, team activity never reached the overview or spec, and signed-out visitors could not read team discussions. This iteration brings the brief back and rebuilds the shared-mode interface around PT2.

**Front page is PT2.** The shared build has its own shell (`src/workspace/`): Overview, Discussions, Spec, Work, People, Sources, plus a freeze review and an inbox. The old sidebar, banner and three levels of tabs are gone in shared mode. The sandbox and the read-only LAN previews keep their existing interface.
- **Overview:** what is happening, the PT2 open questions (live discussions first, then call questions nobody has picked up), the freeze date and readiness, the retro pool, what was recently decided, work underway, and PT2 by system.
- **Spec:** reads as the PT2 spec. For each system it shows the team's decisions (recorded as the answer, not the question), direction from calls and the repository that the team hasn't confirmed yet, the questions still open, and the earlier baseline for reference.
- **Readable by anyone.** `GET /api/state` and `/api/events` are public; writes still need an invited member account. Files still require sign-in.
- **Closing the loop.** Starting from a call question links it to the discussion. Once the discussion is settled, the original record shows "Decided: …" and drops out of the open lists.

**The app is the only way into the spec** (Thomas, 2026-09-28):
- The spec, open questions, freeze and work contain only what happens in the app. An item enters the spec only when a lead settles a discussion.
- Call notes and repository documents are reference material. Undiscussed call questions and call agreements appear under **Suggested from calls** (Discussions tab and an Overview card), each with "Start a discussion".
- Suggestions are never counted as open questions and never carry across a freeze.
- Work reported on calls sits in a collapsed "not tracked here" section.

**Discussion on the aircraft** (Q15, `discussion-at-the-work.md`): the Aircraft tab shows the Spearhead model with discussions anchored to parts, following the model's own subsystem › component › solid hierarchy (`ModelAnchor` on a thread, stored with the model revision). Parts under open discussion are highlighted; discussions show "About … · View in the model".

**Weighted support is back** (DECISIONS 2026-09-17). Weight = (1 + expertise the lead verified for the discussion's system + 1 if you offered to help build it) × role (lead 2, core 1.5, contributor 1).
- Tokens count for nothing until wallets are linked: a typed-in balance is not evidence.
- The lead sets roles and verified expertise on the People page (`setMemberStanding`).
- Self-described skills stay on the profile but do not change weight.

**Keeping the rewards honest:**
- Nobody can support their own contribution.
- The text someone opens a discussion with is contribution #1, so it can earn support.
- Work that grows out of a call question says so and links to the notes, e.g. "Idea from the Sep 25 call notes, which name Erick". The notes alone don't prove who raised an idea, so the proposer award is held until a lead checks and confirms who gets it (`assignProposers`).
- A record's `owner` is shown as "named in the notes", never as "raised by".
- Work records who drafted it and when, and links to the discussion.

**Freeze plan and retro rewards** (DECISIONS 2026-09-23):
- The lead sets the PT2 freeze date and a retro pool, optionally pre-split by system (`setVersionPlan`).
- The freeze review lists every open discussion with settle / defer / decline actions, previews the retro split by weighted net support (including ideas that weren't adopted), and records the allocation snapshot at the freeze (`src/lib/retro.ts`).
- Work drafted from a discussion carries a reward in $ARROW. 25% goes to whoever raised the idea as the proposer award.
- People pages show contributions, weighted support received, retro share, proposer awards and accepted work.
- Call questions nobody picked up before a freeze carry into the next version.
- The frozen spec is marked locked, and inherited decisions appear separately in the next version's spec.
- Everyone is notified of the freeze, and the overview announces it with the split.
- Nothing is paid from the app.

**Fixes:**
- A PT1 question now starts a PT1 discussion.
- "Discuss this" asks for an opening contribution instead of saving an empty thread. Starting a record that is already being discussed joins that discussion.
- The dead Design review button now opens the freeze review.
- The inbox has one unread count, with a badge on the tab and "Mark all read".
- Names appear everywhere, including the GitHub export ("Idea from" / "Drafted by"). Account handles are derived from names, never email addresses.
- Acceptance criteria are no longer shown twice.
- The reason a disabled settle button can't be pressed is shown next to it.
- An unknown project URL shows "not found".
- Work has one-click actions (open for claims, submit for review, accept, request changes); claiming moves work to in progress.
- Inbox items say who did what.
- Spec lines show their one-line content and whether they were agreed or only proposed.
- People lists who the call notes credit but who has no account yet.
- Visitors get a "How to help" strip.
- No more 401 console noise when signed out.

**Existing workspaces migrate on start:** flat one-signal weights become shared weights, handles are renamed, and "Next version" becomes PT3. A snapshot and a `migration` event are written first.

**Verified:**
- Typecheck, **157 unit tests**.
- **42 API acceptance checks** (`server/acceptance-run.ts`; `ACCEPTANCE_BASE` overrides the target).
- **29 shared browser checks** in `e2e/demo-workspace.cjs`, which replaces `shared-workspace.cjs`: two accounts, desktop and mobile, from reading signed out through the freeze and its aftermath.
- The existing six suites: **248 browser checks**.

**Still open for the demo:** the real workspace has one member and one discussion. Everything on the team side is empty until people use it. Discord bridging is the next step.

### Example workspace (for demos)

A second instance holds fictional contributors, so the whole flow can be shown before the real team uses the app. It has its own database (`arrow_workspace_demo`), service (`127.0.0.1:4200`) and private portal ("Arrow workspace (example)"). A banner on every page says the people and activity are fictional; the call and repository records are the real ones.
- **Contents:** five made-up contributors (Mara Quinn, Ravi Menon, Dev Okafor, Lin Takeda, Sofia Reyes) and about two weeks of PT2 activity on the real Spearhead call questions. That includes:
  - an open wing-skin debate where weighting changes which approach leads;
  - a main-board summary waiting for the lead;
  - adopted decisions;
  - a submitted bounty waiting for acceptance, an open research grant, and accepted work;
  - a deferred and a declined idea;
  - a PT1 build question;
  - a 25,000 ARROW PT2 pool with 20% reserved for power, freezing on Oct 18.
- **Accounts:**
  - All seeded lead actions belong to a fictional lead, Nadia Park.
  - The real project lead signs in with their own account as a second lead with no seeded history, so nothing is attributed to a real person.
  - The fictional accounts share one password, kept in `.runtime/demo-server.json`.
- **Seeding:** everything runs through the same domain rules as the real service (`server/demo-seed.ts`), with a scripted clock.

```sh
node scripts/prepare-demo.mjs        # once: create the example database and config
node scripts/service.mjs start --demo
npm run demo:seed                    # reset to the seeded state, e.g. after freezing PT2 in a demo
```

The seed script refuses to run against any database other than `arrow_workspace_demo`.

## Pilot build — 2026-09-26

**Current implementation, 2026-09-26.** Thomas approved the product-review build sequence. This supersedes the earlier pause on backend work **for this isolated local workspace**, not for Arrow's existing hosted demo. Branch: `product-workspace-v1`. The historical prototype files below remain reference material.

## Product model

Spearhead has two clearly labeled layers:

1. **Imported evidence:** 55 source-backed project records, 23 sources, and a separate 16-item repository documentation review. A call summary is not an approval; a reported result is not a released design. Original authorship, source dates, uncertainty, conflicting evidence and prototype applicability remain visible.
2. **Team workspace:** authenticated people contribute, review outcomes, commission work, submit files/evidence, and accept results. Starting from evidence links the source but attributes the new discussion to the person who actually started it.

Design adoption and work commissioning are independent outputs. A contributor can claim available work, report progress and submit results. A project lead must accept completion. Funding status is a manual record; nothing sends a payment. Closed outcomes and accepted results retain their reviewed snapshots; new findings become linked follow-ups.

## Shipped in this iteration

- Neutral app copy; no slogan/persona controls or experiment readout in the real workspace.
- Context-preserving record links, keyboard return focus, shareable search/filter URLs, prototype/system mismatch correction, history-aware back navigation.
- Work queues and status/date sorting; baseline/call-direction/as-built distinctions; searchable source library and citing-record drilldown.
- Invite-only password accounts; server-enforced membership and contributor/reviewer/lead boundaries; one account, one support signal. Self-reported tokens do not confer authority.
- Shared discussions, comments, author edits/history, locally recovered contribution/reply drafts; shared state refresh on navigation and every 30 seconds while visible. Stale writes fail rather than overwrite.
- Reviewed outcome → optional design and work → assignment/claim → progress/blocker notes → uploaded evidence → lead acceptance.
- In-app watch notifications for records, systems and project; assignments/review requests; mention matching by handle; a separate reviewed-activity cursor; my work.
- Project search spanning imported records, team discussions, design, work, sources and people.
- Repository follow-through owners, review status, proposed text and linked resolution artifacts; Markdown draft export. Nothing auto-publishes to GitHub.
- Canonical evidence-JSON preview/apply: stable IDs, reference validation, changed-field preview, retained omitted records, immutable earlier revisions, no-op detection and import revision conflicts. Vector's raw packet is **not** this import format; export the canonical format from Sources first.
- Immutable file uploads (10 MB each), author/revision context and SHA-256 manifests; authenticated downloads; full JSON export and existing work-package Markdown export.
- Isolated PostgreSQL persistence, append-only historical snapshots/audit events, restart supervision, daily local backup and tested full restore into a separate database.

## Architecture and trust boundaries

Vue/Vite serves the UI. `server/index.ts` is the application API; Supabase Auth verifies bearer tokens. The API reuses the tested domain engine from `DemoBackend` through an in-memory transaction adapter, **not browser storage or selectable personas**. Reset/impersonation endpoints are unavailable. Public evidence is readable; membership gates private team records and files.

The private PostgreSQL `arrow_workspace` schema is not exposed through PostgREST. The service owns writes, locks the workspace aggregate and checks its revision, executes domain rules, then atomically commits the new state, historical snapshot and audit event. File/evidence/reconciliation records have separate versioning. An isolated acceptance database contains synthetic test submissions; the actual workspace is not seeded with people, decisions or fabricated work.

This is a deliberately small, single-workspace implementation. The aggregate row/global revision is appropriate for initial use, but large teams will need normalized records, narrower concurrency control and paginated search/activity. Browser draft caches are scoped by account and discussion. They remain on that browser until posted or cleared.

### Local isolation

- Supabase project: `arrow-workspace`, not `flight-tracking` or any hosted Arrow environment.
- API/auth `127.0.0.1:55421`; PostgreSQL `127.0.0.1:55422`; Studio `127.0.0.1:55423`; local mail `127.0.0.1:55424`.
- App service: `127.0.0.1:4196`, exposed through a private OpenClaw portal (`Arrow workspace`). A portal ends when its gateway restarts; reopen it then. Its tokenized launch link belongs only in private chat/runtime state, never this repository.
- Acceptance service: `127.0.0.1:4197`, database `arrow_workspace_acceptance`. Tests assert the database name before resetting fixture state.
- Saved LAN URLs on 4186/4187 remain read-only evidence views with the new polish. They do not pretend to be the shared service and do not receive team passwords.
- Credentials/runtime configs, invitation links, auth fixtures and backups live under gitignored `.runtime/` with private permissions. No service key enters the client bundle.

## Run and operate

From `prototypes/spec-threads`:

```sh
npm ci
supabase start
python3 scripts/bind-local-supabase.py
node scripts/configure-local.mjs
npm run build:shared
node scripts/service.mjs start
```

Supabase CLI development defaults expose ports beyond loopback. The binding script restricts **only this project's** generated ports; it preserves stopped originals and config for rollback, including Kong's injected files and ownership. Recheck bindings after a Supabase recreation. No other project's containers are modified.

For supervised operation on the local Mac, stop the manual service first, then run `python3 scripts/install-local-service.py`. It installs only `com.hex.arrow-workspace` and `com.hex.arrow-workspace-backup`; the backup runs every 24 hours. Restart with:

```sh
launchctl kickstart -k gui/$(id -u)/com.hex.arrow-workspace
curl -fsS http://127.0.0.1:4196/api/health
npm run backup
node scripts/restore-drill.mjs .runtime/backups/<backup>.dump
```

The restore drill verifies the backup digest, restores into a **new** database, then compares workspace state, evidence/file/event/snapshot counts and auth identities. It never replaces the live database. Review the retained restore database before disposal. Backups contain credentials/auth records and private files: keep them private. Current scheduled backups are local, not off-host disaster recovery.

`server.json` can specify `publicOrigin`/`allowedOrigins` and `frameOrigins`. Set these to the actual reverse proxy/Control UI origins. The service defaults to denying framing; a local portal uses explicitly allowed Control UI origins. Do not broadly allow arbitrary origins.

### First account

The first lead supplies their email and chooses their own password through a single-use invitation. A local operator can run:

```sh
node scripts/invite-owner.mjs owner@example.org 'Owner Name'
```

Set `PUBLIC_URL` to the private portal launch URL when preparing that invitation. The result is saved to `.runtime/owner-invitation.json`, never printed or emailed. Once a lead exists, use Inbox → Invite a team member. Invitations expire after two days. Manually granted accounts are not a claim of independently verified email ownership.

### Verification

```sh
npm run typecheck
npm test
npm run build:evidence
# Serve dist-real-next on a staging port, then:
BASE_URL=http://127.0.0.1:4193/ npm run e2e
node scripts/prepare-acceptance.mjs
node scripts/service.mjs start --acceptance
npm run e2e:shared
```

`npm run e2e` now includes evidence and repository review, plus the four existing sandbox suites with the correct isolated dataset flag. Shared tests use separate accounts/browser contexts, actual server requests and the isolated database. They do not post to Discord/GitHub or the actual project.

## Still required before broader deployment

- Choose stable hostname/HTTPS and hosting, external identity provider or production mail/recovery, secure off-host backups, monitoring and deployment rollback. The portal is a **private local pilot**, not a public-production deployment.
- Real-team acceptance: use an actual question/work item, then assess whether returning contributors can find what changed and what needs them. Automated fixture success is not that evidence.
- Membership management/removal UI, richer moderation, paginated activity, notification settings/digest delivery and account recovery UI. Initial admin recovery remains operator-assisted.
- Automatic upstream import adapters and PR publishing are not enabled. Canonical JSON imports and draft exports are explicit review steps; restoring an older evidence version currently uses operator recovery, not a one-click UI.
- Blockers/dependencies are descriptive notes, not an enforced dependency graph. Search is text-based, not indexed full-text search.
- Some old aggregate/legacy views remain for sandbox compatibility. Further component cleanup, bundle splitting and a full accessibility/security review remain appropriate before public release.
- Rich CAD/PCB viewers, part-level annotations, advanced voting/rewards and payments are intentionally deferred until actual use supports them.

Historical design notes are not a competing current specification. [Product review](../../reviews/2026-09-26-product-review/README.md) remains the full backlog; this document describes the implemented slice and its limits.

## Verified delivery — 2026-09-26

- Typecheck passed; **140 unit tests** passed.
- **34 shared API checks** and **25 shared browser checks** passed. The browser test uses independent desktop lead/mobile contributor contexts and exercises source-linked discussion, contribution, outcome, work creation/claim, file upload/download, submission/acceptance, draft reload/edit history, repository action persistence, activity cursor, navigation and mobile layout.
- Existing suites: evidence **61**, repository review **20**, conversation **31**, design/work **53**, examples **37**, briefing **46** — **248** checks, all passed. Standard e2e now runs all six.
- Full dump restored into isolated database `arrow_restore_1790480484612`; backup hash, core table counts, workspace contents and auth identities matched. A prior restore attempt used the restricted `postgres` role and failed on a Supabase extension function; the corrected drill uses the local `supabase_admin` role. Live data was never replaced.
- Supervised restart preserved the actual empty team workspace. No acceptance members, discussions or work packages were inserted there.
- Both saved LAN URLs (4186/4187) verified after delivery: source/review counts, history/search round trip, mobile fit and no runtime errors. Older hashed assets retained for existing tabs.
- Private portal rendered in a standalone browser and within an iframe at the Control UI origin. Its same-origin auth proxy reached credential validation; no browser errors. Portal presentation was requested in this conversation.
- Runtime health and administrative loopback bindings checked. No remote push, hosted deployment, outbound invitations or external publication.
- First owner invitation awaits the owner's chosen email. Account creation is not silently performed under a guessed identity.
