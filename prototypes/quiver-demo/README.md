# quiver-demo: Gavin's frame with real Quiver work in it

**Question:** does Gavin's app frame, with working zones in the sidebar, hold up as the place Quiver's work happens: attachments, software, the aircraft, building it and selling it?

**Worked would look like:** anyone on Quiver can open the zone they care about (an attachment, QuiverHub, GPS and RF), see what exists for it, and weigh in on its open questions; the Thursday calls can run off it; decisions land in a numbered register.

Forked from `prototypes/app-frame` on `sl33ty/explore/app-frame` at `31d499a` (Gavin, 2026-09-29). The frame, tokens, command palette, drawers and the thread detail design are his. Gavin's own prototype is untouched; changes to his frame come over by hand.

## How it works

- **Tabs are places, then views.** Attachments, Software, Aircraft, Build and Selling hold the working zones; after the divider, Discussion, Decisions and Work cut across all of them.
- **A zone is one page that scrolls:** what it is (and, for an attachment, its status, port, power and data), its discussion as rows, then what the call notes and GitHub already say about it.
- **A thread is a side panel, the same everywhere.** Rows in a zone, the Discussion index, the decision register, the Road to selling cards, call notes and People all open the same panel over the page (`?thread=Q-3`). Esc or ✕ closes it; ⤢ expands it. Nothing opens on its own.
- **Inside a thread, one order:** the question, positions to vote on, "Add a position", the lead's decision (one control, a required note, an override warning), then replies.
- **Demo scaffolding lives in one footer menu:** view as member, core or lead; intent to build; reset.
- **Discussion → spec → funded work** (ported from `spec-threads`). A lead gives each thread an outcome: adopt a position into the spec (a D-number, a required note, an override warning), decline it with a reason, or defer it to Dev Kit v1.2. A decision can then be funded as a bounty (a fixed deliverable anyone claims) or a grant (scoped work someone takes on), with acceptance criteria and an ARROW reward. Work moves draft → open → claimed → in review → accepted. The adopted idea's author gets a 25% proposer award; when the notes are the only evidence of who raised it, the award is held until a lead confirms. The thread panel shows where each thread is: Discussion → Decided → Bounty/Grant. Work › Grants & bounties lists them all.
- **Retro pool and freeze** (DECISIONS 2026-09-23). A lead sets a retro pool and freeze date for v1.1. The pool splits across every position on a v1.1 thread by weighted net support, adopted or not (`modules/threads/retro.ts`, whole tokens, largest remainders); the v1.1 page previews it from the votes in the browser. Freezing needs every v1.1 thread settled (adopt, decline, or defer; "defer the rest" clears the way), then records the split and locks the spec. Nothing is paid from the app.
- **Dev Kit v1.1 and the 3D model.** Overview opens on the v1.1 improvements page: every thread aimed at the next revision, grouped by structure, GPS and RF, propulsion, power and avionics, with the decided change list. The 3D model (Overview › 3D model) is the Dev Kit assembly; click any part, or pick it from the parts list, to see its threads or propose a change for v1.1. The thread is anchored to the part's BOM number and lands in the zone that part belongs to (`src/data/model.ts`).

## What is real

- **GitHub data**, generated at build time: the Dev Kit BOM (96 parts), the task board (T-01 to T-18), issues, and open pull requests. `scripts/build-data.mjs` is carried over from `prototypes/quiver-app`; `scripts/build-prs.mjs` is new.
- **3D model** (`public/quiver.glb`): the Dev Kit assembly exported from the build123d CAD on project-quiver main (unchanged since 2026-06-12), compressed to 1.7 MB, carried over from `prototypes/quiver-app`. Every mesh sits under a node named for its BOM number; the 47 parts in it are clickable. Fasteners were left out of the export, and the Fusion changes in PR #266 are not in it until that merges.
- **Attachments** (`src/data/attachments.ts`): the payloads in `payload-systems` (latch and multispectral camera flown as V1, RAM ball mount prototyped), the spreader adapter (#233), and the six concepts with written requirements. Each links to its source.
- **Sep 29 call notes** (`src/data/calls.ts`): curated from the transcript, Quiver items only, each naming who said it. The recording and the full transcript are not in the app.
- **Seeded threads** (`src/modules/threads/data.ts`): seventeen open questions. The V2 choices come from the latch and camera V1 notes; QuiverHub's next scope from T-12; the rest from #234, #248, PR #267 and the Sep 29 call. Every position says where it came from: a person named in the notes (linked to the note) or a document, issue or pull request. Nobody has voted.
- **People** (`src/data/people.ts`): only what the task board or the notes say about them, with the source on each line. No roles, holdings or vote weight until people join.

## What is demo

- No backend. Votes, replies, new threads, positions and decisions stay in this browser (localStorage). "Reset demo" in the footer puts the seed back.
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
| Overview | Summary (areas, what needs input, road to selling, recent decisions), People, Call notes |
| Attachments | Catalog, attachment interface, developer guide; payload latch, multispectral camera, RAM ball mount, spreader adapter; concepts ready for contributors; new ideas |
| Software | Quiver SDK, QuiverHub, ground station and remote; autonomy and obstacle avoidance, parameters and failsafes, flight logs and data |
| Aircraft | Next revision (structure, GPS and RF, power, avionics); testing; operating; CAD and the BOM |
| Build | Assembly, configuration guide, case and shipping; bringing on manufacturers, suppliers and cost |
| Selling | Road to selling; where we sell, customers and applications, pricing, sales page, what goes back to the DAO |
| Discussion | Every thread across zones, by area; suggested from calls |
| Decisions | The register |
| Work | Task board and open pull requests, read-only from GitHub |

## Live (superapp-beta.arrowair.com)

With `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` set at build time, the app runs against the shared Arrow Supabase (the flight tracking app's), so people sign in with the same GitHub or email accounts. Reads are public; every write is a database function that checks who is signed in and, for lead actions, their role. Thomas and Erick are granted lead by GitHub login; leads set everyone else's role on the People page.

- Schema: `supabase/migrations/20261001000000_superapp_quiver.sql` (sa_-prefixed tables and functions only; nothing existing is touched).
- Deleting threads (`20261001100000_sa_delete_thread.sql`): leads delete any thread, authors their own until someone else takes part, never once work is funded. Soft: the row keeps who, when and why, and the thread and everything on it disappear from reads.
- Starting content: `npx tsx scripts/build-seed-sql.ts > supabase/seed_quiver.sql` (idempotent).
- Applied to production by POSTing the SQL to the Supabase pg-meta endpoint (`/pg/query`, service key), after a `pg_dumpall` on the box.
- Hosting: Openship, `npm run build` then `npm start` (serve on $PORT), root `prototypes/quiver-demo`.
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

Checks, against a build:

```
npm run build
npm run typecheck
node e2e/flow.cjs    # zone → panel, vote, decide, fund → claim → accept, v1.1 spec, 3D model part proposals, retro pool, decline, defer, freeze, reload, reset
node e2e/shots.cjs   # screenshots of the main screens to /tmp/quiver-demo-shots
```
