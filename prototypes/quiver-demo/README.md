# quiver-demo: Gavin's frame with real Quiver work in it

**Question:** does Gavin's app frame, with working zones in the sidebar and his threads module in every zone, hold up for real Quiver coordination: the blockers to selling, the next revision, go-to-market, and the decisions that come out of the Thursday calls?

**Worked would look like:** the Quiver team can run a call off it. Each agenda item is a thread in the zone it belongs to, with the positions people already stated; the lead decides on the call; decisions land in a numbered register; call notes that nobody picked up are one click from becoming a thread.

Forked from `prototypes/app-frame` on `sl33ty/explore/app-frame` at `31d499a` (Gavin, 2026-09-29). The frame, tokens, command palette, drawers and the threads module are his. Gavin's own prototype is untouched; changes to his frame come over by hand.

## What is real

- **GitHub data**, generated at build time: the Dev Kit BOM (96 parts), the task board (T-01 to T-18), issues, and open pull requests. `scripts/build-data.mjs` is carried over from `prototypes/quiver-app`; `scripts/build-prs.mjs` is new.
- **Sep 29 call notes** (`src/data/calls.ts`): curated from the transcript, Quiver items only, each naming who said it. The recording and the full transcript are not in the app.
- **Seeded threads** (`src/modules/threads/data.ts`): twelve open questions from the call and from #234, #248 and PR #267. Every position says where it came from: a person named in the notes (linked to the note) or an issue or pull request. Nobody has voted.
- **People** (`src/data/people.ts`): only what the task board or the notes say about them, with the source on each line. No roles, holdings or vote weight until people join.

## What is demo

- No backend. Votes, replies, new threads, positions and decisions stay in this browser (localStorage). "Reset demo" in the footer puts the seed back.
- "View as" Member / Core / Lead on any thread shows how weight changes and lets you decide as a lead. The weight formula is the real one from `spec-threads`.
- The wallet shows nothing: no wallet is linked.

## Cherry-picked from the spec workspace

- **Zones as the anchor** for discussion at the work (`ideas/discussion-at-the-work.md`), extended from model parts to any place work happens.
- **Suggested from calls**: call questions and gaps that no thread carries, with "Start a discussion". The thread belongs to whoever starts it; the notes are credited as the source.
- **Decision register**: decided threads get D-001 upward, with the choice, who decided, the note, and an override flag. This is what T-09 is funded to produce.
- **Provenance on every item** and "named in the notes" wording, never "raised by", when the notes are the only evidence.

## Layout

| Tab | Zones and views |
|---|---|
| Overview | Road to selling (the four blockers, then its threads), People, Call notes |
| Design | Next revision: structure and enclosure, GPS and RF, power and battery, payload and attachments, avionics, CAD; the BOM |
| Testing | Obstacle avoidance, GPS interference, endurance |
| Docs | Configuration guide, Pilot's handbook, attachment developer guide, assembly |
| Go-to-market | Where we sell, who we sell to, sales page, what goes back to the DAO |
| Work | Task board and open pull requests, read-only from GitHub |
| Discussion | Every thread across zones, filterable by tab; suggested from calls |
| Decisions | The register |

Every zone page shows what already exists for it (tasks, issues, PRs, parts, call notes) above its threads.

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
node e2e/flow.cjs    # vote, decide as lead, register, new thread, propose, start from a suggestion, reload, reset
node e2e/shots.cjs   # screenshots of the main screens to /tmp/quiver-demo-shots
```
