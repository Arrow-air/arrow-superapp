# Arrow superapp

The app: the Quiver and Longshot workspaces, live at [superapp-beta.arrowair.com](https://superapp-beta.arrowair.com). Sign in with the same GitHub or email account as flights.arrowair.com. The project switcher in the workspace header moves between them.

Agreed with Gavin on 2026-10-01 as the canonical version. It began as `prototypes/quiver-demo`, a fork of Gavin's `prototypes/app-frame` (branch `sl33ty/explore/app-frame` at `31d499a`); the frame, tokens, command palette, drawers and the thread design are his. His later app-frame work (merged to main as #13, through `d28575e`) is ported in too: the CAD explorer, thread types, the new-thread composer, option cards, and the design freeze clock. His Back this / poll-bar voting was tried and reverted (Thomas, 2026-10-01): voting stays Reddit-style arrows.

**What it's for:** anyone on Quiver can open the zone they care about (an attachment, QuiverHub, GPS and RF), see what exists for it, and weigh in on its open questions; calls can run off it; decisions land in a numbered register and can be funded as bounties or grants.

## How it works

- **Tabs are places, then views.** Overview, Attachments, Software, Build and Selling hold the working zones; after the divider, Discussion, Decisions and Work cut across all of them.
- **A zone is one page that scrolls:** what it is (and, for an attachment, its status, port, power and data), its discussion as rows, then what the call notes and GitHub already say about it.
- **A thread is a side panel, the same everywhere.** Rows in a zone, the Discussion index, the decision register, the Road to selling cards, call notes and People all open the same panel over the page (`?thread=Q-3`). Esc or ✕ closes it; ⤢ expands it. Nothing opens on its own.
- **Inside a thread, one order:** the question, then one Reddit-style comment tree with voting at every level. Every comment has Reddit-style up/down arrows with its weighted score. Top-level comments are the options: lettered A, B, C on their own cards; one can lead and a lead can adopt one. Replies nest under any option to any depth. The lead's decision block (a required note, an override warning) closes the thread.
- **Thread types** (Gavin's): questions grass, proposals teal, ideas amber, in rows, the thread header and the composer. Every place a thread starts uses one composer (`modules/threads/NewThread.vue`): a header strip that reads "New thread in *zone* about *part*", the title as the first line, the type chosen inside the box.
- **Design freeze clock** (Gavin's, `frame/freeze.ts`): counts down to the v1.1 freeze date a lead sets on the v1.1 page (end of that day, UTC), in the footer, the version menu, the model page and on each open v1.1 thread (grey, amber inside 14 days, red inside 48 hours). From the date, new threads go to v1.2; open ones still get settled, deferred or declined before the lead records the freeze. No date set, no clock.
- **Demo scaffolding lives in one footer menu:** view as member, core or lead; intent to build; reset.
- **Discussion → spec → funded work** (ported from `spec-threads`). A lead gives each thread an outcome: adopt a position into the spec (a D-number, a required note, an override warning), decline it with a reason, or defer it to Dev Kit v1.2. A decision can then be funded as a bounty (a fixed deliverable anyone claims) or a grant (scoped work someone takes on), with acceptance criteria and an ARROW reward. Work moves draft → open → claimed → in review → accepted. The adopted idea's author gets a 25% proposer award; when the notes are the only evidence of who raised it, the award is held until a lead confirms. The thread panel shows where each thread is: Discussion → Decided → Bounty/Grant. Work › Grants & bounties lists them all.
- **Retro pool and freeze** (DECISIONS 2026-09-23). A lead sets a retro pool and freeze date for v1.1. The pool splits across every position on a v1.1 thread by weighted net support, adopted or not (`modules/threads/retro.ts`, whole tokens, largest remainders); the v1.1 page previews it from the votes in the browser. Freezing needs every v1.1 thread settled (adopt, decline, or defer; "defer the rest" clears the way), then records the split and locks the spec. Nothing is paid from the app.
- **Dev Kit v1.1 and the 3D model.** Overview opens on the v1.1 improvements page: every thread aimed at the next revision, grouped by structure, GPS and RF, propulsion, power, avionics, and harness and wiring, with the decided change list. The 3D model (Overview › 3D model) is the Dev Kit assembly in Gavin's CAD explorer: a blueprint viewer (3D, top, front and side views; perspective or orthographic; grid; camera glides; right-drag pans) beside an inspector that drills down from the areas a change would be discussed in, to an area's parts, to one part, as tiles cut from the model. Layers switch assemblies off; Start a thread is pinned to the inspector's foot. The thread is anchored to the part's BOM number and lands in the zone that part belongs to (`src/data/model.ts`). The bill of materials shows open threads per part.

## Longshot

Longshot, Arrow's own battery pack, has its own workspace beside Quiver (added 2026-10-10 at Thomas's request): the whole project explained, with the same threads, votes, decisions, bounties, freeze and retro pool.

- **Tabs:** Overview (at a glance, 3D model, boards, people, call notes; PT2 improvements), Pack (cells, busbars, enclosure, mounting), Electronics (BMS, telemetry and CAN, charging, connector and sense boards), Aircraft (Quiver, Spearhead, testing), Build (bill of materials, building packs, suppliers and cost, safety, budget and proposal), then Discussion, Decisions and Work.
- **Every zone opens on what the record says**, a line per fact with its source: the repository and its issues, the proposal the DAO approved, the call notes on the Spearhead wiki (where Longshot's battery and BMS calls are recorded), Tattu's charger pages. Facts the sources disagree on show both (copper or brass busbars, polycarbonate or acrylic plates).
- **Threads L-1 to L-15** (`src/projects/longshot/threads.ts`) are seeded from those sources, with positions only where a source states them and people only as the notes name them. Longshot's integration into Quiver (fit, BMS protocol, failsafes, charging both packs, the first test) stays in Quiver's workspace as Q-18 to Q-22; Longshot's zones link to them under "Also discussed in Quiver".
- **3D model** (`public/longshot.glb`, 1 MB): the PT1 main assembly from the build123d model in project-longshot (PR #27), every part node named for its BOM part number; regenerate with `scripts/model/` (see its README).
- **Boards:** BMSJ in KiCanvas, the full BMS design imported from Julius's Vector BMS. Its schematic is complete; the layout hasn't started (only the connector is on the outline). BMSZ and the KiCad SL_PCB are basic layouts, so they're left out.
- **Bill of materials** from the build123d `BOM.csv`, and the known PT1 cost from `engineering/builds/PT1/BOM.md`. **Issues and pull requests** from GitHub, read-only.
- **Next version:** "Longshot PT2" (working name), with its own freeze clock and retro pool; the version after is "Longshot PT3". Version names differ between projects because the database keys freezes by version name.

How projects fit together: each project has its tabs (`src/frame/nav.ts`, `src/projects/longshot/nav.ts`) and its plan (`src/projects/plans.ts`: thread prefix, next version, next-version zones). Zone ids are unique across projects, so a thread's zone names its project; the frame keeps `currentProject` in step with the route, and the store's `projectThreads` is what each view lists. Part numbers and board ids never collide either.

## What is real

- **GitHub data**, generated at build time: the Dev Kit BOM (96 parts), the task board (T-01 to T-18), issues, and open pull requests. `scripts/build-data.mjs` is carried over from `prototypes/quiver-app`; `scripts/build-prs.mjs` is new.
- **3D model** (`public/quiver.glb`): the Dev Kit assembly exported from the build123d CAD on project-quiver main (unchanged since 2026-06-12), compressed to 1.7 MB, carried over from `prototypes/quiver-app`. Every mesh sits under a node named for its BOM number; the 47 parts in it are clickable. Fasteners were left out of the export, and the Fusion changes in PR #266 are not in it until that merges.
- **Attachments** (`src/data/attachments.ts`): the payloads in `payload-systems` (latch and multispectral camera flown as V1, RAM ball mount prototyped), the spreader adapter (#233), and the six concepts with written requirements. Each links to its source.
- **Sep 29 call notes** (`src/data/calls.ts`): curated from the transcript, Quiver items only, each naming who said it. The recording and the full transcript are not in the app.
- **Seeded threads** (`src/modules/threads/data.ts`): twenty-two starting questions, including the Longshot battery integration. The V2 choices come from the latch and camera V1 notes; QuiverHub's next scope from T-12; the rest from #234, #248, PR #267 and the Sep 29 call. Every position says where it came from: a person named in the notes (linked to the note) or a document, issue or pull request. Nobody has voted.
- **People** (`src/data/people.ts`): only what the task board or the notes say about them, with the source on each line. No roles, holdings or vote weight until people join.

## Demo mode

- Without the Supabase env vars (below), the same build is a self-contained demo: votes, comments, new threads and decisions stay in the browser (localStorage), and "Reset demo" in the footer puts the seed back.
- The footer's Demo menu switches between member, core and lead, so you can see weight change and decide as a lead. The weight formula is the real one from `spec-threads`.
- The wallet shows nothing: no wallet is linked.

## Cherry-picked from the spec workspace

- **Zones as the anchor** for discussion at the work (`ideas/discussion-at-the-work.md`), extended from model parts to any place work happens.
- **Suggested from calls**: call questions and gaps that no thread carries, with "Start a discussion". The thread belongs to whoever starts it; the notes are credited as the source.
- **Decision register**: decided threads get D-001 upward, with the choice, who decided, the note, and an override flag. This is what T-09 is funded to produce.
- **Provenance on every item** and "named in the notes" wording, never "raised by", when the notes are the only evidence.

## Layout

| Tab | Zones and views |
|---|---|
| Overview | Dev Kit v1.1 (improvements, 3D model, PCBs, structure and enclosure, GPS and RF, propulsion, power and battery, avionics and network); operating (pilot's handbook, maintenance); Quiver at a glance, People, Call notes |
| Attachments | Catalog, attachment interface, developer guide; payload latch, multispectral camera, RAM ball mount, spreader adapter; concepts ready for contributors; new ideas |
| Software | Quiver SDK, QuiverHub, ground station and remote; autonomy and obstacle avoidance, parameters and failsafes, flight logs and data |
| Build | Bill of materials, assembly, configuration guide, case and shipping; bringing on manufacturers, suppliers and cost |
| Selling | Road to selling; where we sell, customers and applications, pricing, sales page, what goes back to the DAO |
| Discussion | Every thread across zones, by area; suggested from calls |
| Decisions | The register |
| Work | Grants and bounties; task board and open pull requests, read-only from GitHub |

## Live (superapp-beta.arrowair.com)

With `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` set at build time, the app runs against the shared Arrow Supabase (the flight tracking app's), so people sign in with the same GitHub or email accounts. Reads are public; every write is a database function that checks who is signed in and, for lead actions, their role. Thomas and Erick are granted lead by GitHub login; leads set everyone else's role on the People page.

- Schema: `supabase/migrations/20261001000000_superapp_quiver.sql` (sa_-prefixed tables and functions only; nothing existing is touched).
- Threaded comments (`20261001200000_sa_threaded_comments.sql`): comments live in `sa_positions` with `parent_id`; `sa_comment(thread, text, parent)` writes them; only top-level comments can be adopted. Existing replies were moved in (seeded ones under the option they answer).
- Reopening decisions (`20261001400000_sa_reopen_decision.sql`): a lead puts a decided or declined thread back into discussion ("Reopen as discussion" in the thread, optional reason). The outcome moves to the thread's history; votes and comments stay; draft or open work from it is withdrawn (kept, marked Withdrawn). Not once someone has claimed the work, not for decisions made outside the app, not in a frozen version. Decided again, the thread keeps its D-number.
- Drafts and flaky connections (`src/lib/drafts.ts`, `20261003000000_sa_retry_safe_writes.sql`): every composer keeps its text in the browser until the server confirms the save, so a dropped connection, a closed panel or a reload loses nothing; a failed save says why under the box and leaves the text there. Each draft carries a send key reused on every retry, so a save that landed but whose answer was lost isn't posted twice (`sa_comment` and `sa_start_thread` return the existing row for a repeated key).
- Editing threads (`20261001800000_sa_edit_thread.sql`): a thread's author or a lead edits its title and description in place (Edit in the thread's meta line); it shows "edited". Not once its version is frozen, since the frozen spec lists the titles. Earlier versions are kept in `sa_thread_edits` (no API access).
- Thread votes (`20261001700000_sa_thread_votes.sql`): up and down arrows on the thread itself, beside its title in the panel and on every thread row; weighted like comment votes; the same vote again takes it back; locked once the thread is decided or declined. `sa_vote_thread` is the only write.
- Editing comments (`20261001600000_sa_edit_comment.sql`): authors edit their own comments in place (Edit next to Reply); the comment shows "edited". Never the adopted option, which the decision quotes. Every earlier version is kept in `sa_comment_edits` (no API access), so what people voted on stays on record.
- Deleting bounties and grants (`20261001500000_sa_delete_work.sql`): leads only, while nobody has taken the work on (draft, open, or withdrawn after a reopen); "Delete bounty" on the work card, including withdrawn work shown on its thread. The row moves to `sa_deleted_work` (no API access); the decision can be funded again. W-numbers are not reused.
- Deleting comments (`20261001300000_sa_delete_comment.sql`): leads delete any comment or reply, anyone their own; the adopted option stays. Soft, Reddit style: the row keeps its place so replies under it stay (shown as "Deleted" or "Removed by a lead"), its words, author and source are cleared, and the original goes to `sa_deleted_comments`, which the API can't read. Votes on it stop counting; nothing new lands on it.
- Deleting threads (`20261001100000_sa_delete_thread.sql`): leads delete any thread, authors their own until someone else takes part, never once work is funded. Soft: the row keeps who, when and why, and the thread and everything on it disappear from reads.
- Projects (`20261010000000_sa_projects.sql`): `sa_projects` lists each project and its thread prefix (Q, L). `sa_start_thread` takes `p_project` (Quiver when a client names none) and numbers threads per project; `sa_settle` numbers decisions per project. Quiver keeps its counters (`thread`, `decision`); Longshot counts under `thread:longshot` and `decision:longshot`. Work stays W-1 upward across projects.
- Starting content: `npx tsx scripts/build-seed-sql.ts > supabase/seed_quiver.sql` and `npx tsx scripts/build-seed-sql.ts longshot > supabase/seed_longshot.sql` (idempotent).
- Applied to production by POSTing the SQL to the Supabase pg-meta endpoint (`/pg/query`, service key), after a `pg_dumpall` on the box.
- Hosting: Openship project `superapp-beta`, branch `main`, root `app/`: `npm run build` then `npm start` (serve on $PORT). Every push to `main` redeploys.
- `e2e/live.cjs` runs the signed-in path against any Supabase with the migration (BASE, SUPA, ANON, SERVICE env).

## Run

```
npm install
npm run dev
```

Refresh the GitHub data (needs a `project-quiver` and `quiver-sdk` checkout, and `gh`):

```
QUIVER_SRC=/path/to/project-quiver QUIVER_SDK=/path/to/quiver-sdk npm run data
```

Longshot's (a `project-longshot` checkout and `gh`): issues, pull requests and the BOM, then the BMSJ board. The 3D model has its own steps in `scripts/model/README.md`.

```
LONGSHOT_REPO=/path/to/project-longshot node scripts/build-longshot.mjs
LONGSHOT_REPO=/path/to/project-longshot node scripts/build-pcbs.mjs longshot
```

Checks, against a build:

```
npm run build
npm run typecheck
node e2e/flow.cjs    # zone → panel, vote, decide, fund → claim → accept, v1.1 spec, 3D model part proposals, retro pool, decline, defer, freeze, reload, reset; then Longshot: project switch, L-numbering, its own register and freeze, Quiver threads from Longshot, model, boards, BOM
node e2e/shots.cjs   # screenshots of the main screens to /tmp/superapp-shots
```
