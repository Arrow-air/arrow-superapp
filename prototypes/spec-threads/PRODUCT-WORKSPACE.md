# Arrow workspace — local pilot

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
