# Prototype 2: spec threads → freeze → spec, grant, or defer

**Live demo: https://specs.arrowair.com** (demo mode: data stays in your own browser, nothing is shared between visitors)

**The question this tests:** if outside contributions are addressed to the *next* version of an aircraft, and the lead has to resolve every thread at a freeze, does the discussion write the specs and grants by itself? And does weighting still change anything compared with one person one vote?

Prototype 1 asked only the second half. Prototype 2 keeps all of it (the weighting, tallies, readout, and tests) and changes what a thread *is*, per the 2026-09-23 call. See `meetings/2026-09-23/notes.md`, `ideas/next-version-contributions.md`, `ideas/spec-thread-to-bounty.md`, and `ROADMAP.md` → "Next iteration".

## How it works

1. A **project** is building one version and discussing the next. Spearhead builds PT1 while PT2 is in discussion. Outside ideas go to PT2; that is the honest offer, and it keeps them from being noise for the PT1 team.
2. Someone posts a **thread**: a question addressed to the version in discussion, optionally filed under an aircraft system. "Gasoline engine integration: what does the engine PCB have to do?"
3. People reply with **positions**. A full spec or a short expert hint both count.
4. Members **vote** positions up or down. Votes are weighted, exactly as in prototype 1:

   ```
   weight = (base + tokens + expertise + builder) × role
   ```

   | Term | Rewards | Rule |
   |---|---|---|
   | base | showing up | everyone gets it |
   | tokens | skin in the game | logarithmic in $ARROW held, capped. 100× the tokens is about 3× the term |
   | expertise | knowing the subject | flat bonus if any of your tags matches the thread's tags |
   | builder | living with the result | flat bonus if you publicly declare you will build or operate it |
   | role | accountability | multiplier for lead / core / member, set **per project** |

5. The lead reads and votes along the way. No obligation to act until the **freeze**.
6. At the freeze the lead resolves every open thread one of four ways:
   - **Reject**, with a line of why, published on the thread.
   - **Promote to spec.** The chosen position becomes a requirement in the project's **decision register**.
   - **Turn into a grant.** A **grant draft** is written from the thread: the question, the chosen position as the spec, every constraint anyone named (list items, anything with a number and a unit), the proposer(s) with attribution, and a **proposer award** (default 25% of the grant). The lead edits it before it is real, then publishes it or opens it as an issue in `Arrow-air/grant-and-bounties`.
   - **Defer** to the next version. The thread stays open with its votes and history, addressed to PT3 instead.

   Choosing any position other than the weighted top requires a written rationale, published on the decision or the grant.
7. A version cannot be frozen with anything still open. Once frozen, the next planned version opens for discussion.

The **Readout** page counts how often weighting changed the winner, how often leads overrode it and why, how threads end at the freeze, and what the grants carry for their proposers.

## Discussing the prototype, inside the prototype

Key features carry a dashed **Discuss** pin that opens a GitHub Discussion in this repo, rendered in place by [giscus](https://giscus.app). Pins and their discussion numbers live in `src/discuss/anchors.ts`. The freeze, resolutions, and grant drafts reuse the existing pins (lead override, bounty) until there are discussions of their own.

## Run it

```bash
cd prototypes/spec-threads
npm install
npm run dev
```

It starts in **demo mode**: no server, no accounts. Data lives in your browser. The seed has Spearhead (PT1 building, PT2 in discussion with a freeze date, PT3 planned; one PT2 thread already in the register), Quiver (the power-budget thread from prototype 1, arranged so the crowd and the weighting disagree), and Quiver Mini (empty on purpose; the re-run of the earlier experiment). Use "Acting as" to be the lead (Omar on Spearhead, Lena on Quiver), the expert, a whale, or a newcomer. "Reset demo data" restores the seed.

Everything in the seed is illustrative. The people are made up and the engineering numbers are placeholders, not Spearhead or Quiver specifications.

```bash
npm test          # 53 unit tests: weighting, tallies, resolutions, freeze, grant drafts, demo backend flow
npm run typecheck
npm run build

# browser walkthrough, 80 checks incl. the full freeze flow, mobile layout, and discussion pins; uses your installed Chrome
npm run preview -- --port 4179   # terminal 1
npm run e2e                      # terminal 2
```

## Layout

| Path | What |
|---|---|
| `src/lib/weights.ts` | The weighting formula and tallying. Pure functions. **Start here if you want to argue with the numbers.** |
| `src/lib/resolution.ts` | The four resolutions: who can, when a rationale is required, what each one writes |
| `src/lib/grant.ts` | Grant drafts from a thread: constraint extraction, proposer share, markdown |
| `src/lib/versions.ts` | Which version is in build or discussion, defer targets, the freeze check |
| `src/lib/analyze.ts` | Per-thread analysis shared by the thread page, the freeze screen, and the readout |
| `src/lib/types.ts` | The model: projects, versions, threads, positions, resolutions, decisions, grants |
| `src/data/backend.ts` | The one interface the UI talks to |
| `src/data/demoBackend.ts`, `seed.ts` | Browser-storage backend and its seed. The resolution rules run here, not in the UI |
| `src/data/supabaseBackend.ts` | Prototype 1 shape only; see status below |
| `src/components/ResolvePanel.vue` | The four resolution actions, shared by the thread page and the freeze screen |
| `src/pages/` | Projects, project, thread, freeze, register, grants, grant, readout, how it works, profile |
| `e2e/walkthrough.cjs` | Browser walkthrough |

Stack matches `Arrow-air/flight-tracking`: Vue 3, Vite, TypeScript, Supabase, and the same design tokens.

## Hosting

Deployed on Arrow's Openship as project `spec-threads`, root directory `prototypes/spec-threads`. Auto-deploy is on: every push to `main` of this repo rebuilds it, including notes-only pushes. Prototype 2 was built on the `spec-threads-v2` branch for that reason.

## Status, honestly

**Works and is verified:** everything in demo mode. Unit tests, typecheck, production build, and the browser walkthrough all pass, including the whole freeze flow and a check that markdown typed by users cannot run scripts.

**Backend:** Thomas's call on 2026-09-23 was to leave it alone and stay in demo mode. `supabaseBackend.ts` and the migration are still the prototype 1 shape (needs, specs, promotions), never run against a database, and only kept compilable against the new interface. Before dogfooding on real Spearhead PT2 discussion, the migration needs versions, resolutions, decisions, and grants, and GitHub sign-in has to be tried for real. Until then, demo mode is one browser, one person.

## What it does not do yet

- **Retro session award.** The upvote-weighted bucket per version, optionally pre-split by aircraft system, allocated across threads at the freeze. Slice two; the freeze screen has a place for it. See `ideas/retro-rewards-reddit-coordinape.md`, Q31.
- **Agent-drafted grants.** The draft is a deterministic template. An agent pass over the thread is a later button, and only useful once there is a real corpus to feed it (Q30).
- **Token balances are self-reported. Expertise tags are self-declared. No rewards move. No notifications, editing, or moderation.** As in prototype 1.
- **Body text uses your system font.** Arrow's Neue Haas Grotesk is commercially licensed, so it is not shipped in this public repo.

## Running the actual experiment

The demo proves the instrument works. It proves nothing about Arrow. To learn something, the tool has to hold real Spearhead PT2 discussion, which means the shared backend first. Then: let PT2 threads run to the freeze, have Alperen resolve them on the freeze screen, and read the Readout together. Did the discussion write the grants, or did the lead still write them? Did anyone outside the team post a position that became a spec? Did weighting change a winner? Did the lead override, and does the rationale hold up?
