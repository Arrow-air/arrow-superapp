# Prototype 1: spec threads → bounty

**Live demo: https://specs.arrowair.com** (demo mode: data stays in your own browser, nothing is shared between visitors)

**The question this tests:** if Arrow decides medium-sized design questions in a weighted public thread, with the project lead keeping the final say, do we get better specs than one lead deciding alone? And does weighting change anything compared with one person one vote?

See `ideas/spec-thread-to-bounty.md`, `ideas/weighted-voting.md`, and `ideas/decision-ladder.md` for where this came from.

## How it works

1. Someone posts a **need**: a decision Arrow has to make, tagged by subject. "Attachment interface: how much power should it supply?"
2. People reply with **specs**. A full spec or a short expert hint both count.
3. Members **vote** specs up or down. Votes are weighted:

   ```
   weight = (base + tokens + expertise + builder) × role
   ```

   | Term | Rewards | Rule |
   |---|---|---|
   | base | showing up | everyone gets it |
   | tokens | skin in the game | logarithmic in $ARROW held, capped. 100× the tokens is about 3× the term |
   | expertise | knowing the subject | flat bonus if any of your tags matches the need's tags |
   | builder | living with the result | flat bonus if you publicly declare you will build or operate it |
   | role | accountability | multiplier for lead / core / member, set **per project** |

4. Every spec shows its **weighted** score and its **raw** one-person-one-vote score side by side, plus a bar with one block per voter sized by their weight, so you can see who is behind a score. When the two tallies disagree about the winner, the thread puts both picks side by side at the top. A sidebar lists who counts for how much on that need.
5. The **project lead promotes** one spec to a bounty. The lead can pick any spec. If it is not the weighted top, the lead must write down why, and that rationale is published on the bounty.
6. Promotion closes the thread and generates bounty markdown, with a one-click link to open it as an issue in `Arrow-air/grant-and-bounties`.

The **Readout** page counts what matters: how often weighting changed the winner, how often leads overrode the weighted result and why, and how many people took part.

## Discussing the prototype, inside the prototype

Key features carry a dashed **Discuss** pin: the weight formula, the token curve, the role multiplier, builder intent, the crowd-versus-weighted comparison, the lead override, the bounty, and the readout. A pin opens a side drawer with a thread about that exact feature, seeded with the question it raises.

The threads are ordinary [GitHub Discussions](https://github.com/Arrow-air/arrow-superapp/discussions) in this repo, rendered in place by [giscus](https://giscus.app). Sign in with GitHub to reply. Pins and their discussion numbers live in `src/discuss/anchors.ts`.

**One-time setup:** an org admin installs the giscus GitHub app on `Arrow-air/arrow-superapp` at https://github.com/apps/giscus. Until then each pin shows the question and links straight to its discussion on GitHub, so nothing is a dead end.

This is also a small proof of a bigger point, `ideas/discussion-at-the-work.md`: the conversation is stored in one place and rendered next to the thing it is about. The same thread could be rendered beside a part in the CAD viewer.

## Run it

```bash
cd prototypes/spec-threads
npm install
npm run dev
```

It starts in **demo mode**: no server, no accounts. Data lives in your browser and is seeded with fictional personas and an illustrative Quiver thread arranged so the crowd and the weighting disagree. Use the "Acting as" switcher to vote as the lead, the domain expert, a whale, or a newcomer and watch the thread re-rank. "Reset demo data" restores the seed.

Everything in the seed is illustrative. The people are made up and the engineering numbers are placeholders, not Quiver specifications.

```bash
npm test          # 35 unit tests: weighting, tallies, promotion rules, formatting, demo backend flow
npm run typecheck
npm run build

# browser walkthrough, 66 checks incl. mobile layout and discussion pins, uses your installed Chrome
npm run preview -- --port 4179   # terminal 1
npm run e2e                      # terminal 2
```

## Layout

| Path | What |
|---|---|
| `src/lib/weights.ts` | The weighting formula and tallying. Pure functions. **Start here if you want to argue with the numbers.** |
| `src/lib/promotion.ts` | Who can promote, when a rationale is required, bounty markdown |
| `src/lib/analyze.ts` | Per-need analysis shared by the thread page and the readout |
| `src/data/backend.ts` | The one interface the UI talks to |
| `src/data/demoBackend.ts`, `seed.ts` | Browser-storage backend and its seed |
| `src/data/supabaseBackend.ts` | Supabase backend (see status below) |
| `supabase/migrations/` | Schema and row-level security |
| `src/pages/` | Needs list, thread, new need, profile, readout, explainer |
| `e2e/walkthrough.cjs` | Browser walkthrough |

Stack matches `Arrow-air/flight-tracking`: Vue 3, Vite, TypeScript, Supabase, and the same design tokens.

## Hosting

Deployed on Arrow's Openship as project `spec-threads`, root directory `prototypes/spec-threads`, same setup as flight-tracking. Auto-deploy is on: every push to `main` of this repo rebuilds it, including notes-only pushes, which takes under a minute.

## Status, honestly

**Works and is verified:** everything in demo mode. Unit tests, typecheck, production build, and the browser walkthrough all pass, including a check that markdown typed by users cannot run scripts.

**Written but never run against a real database:** `supabaseBackend.ts` and the migration. They typecheck and were written carefully against each other, but no one has applied the migration or signed in through it yet. Expect to fix things the first time. To try it:

1. Apply `supabase/migrations/20260918000000_spec_threads.sql`. It is written for the shared instance at `supabase.arrowair.com`: every object is prefixed `st_` and nothing touches `auth.users`. **Try it on a scratch Supabase project first.**
2. Insert rows into `st_project_roles` to name the leads. Roles are admin-set on purpose.
3. Copy `.env.example` to `.env`, set `VITE_BACKEND=supabase` and the publishable key.

## What it does not do yet

- **Token balances are self-reported.** The real version reads $ARROW from a linked wallet. Until then the token term runs on trust, which is fine among people who know each other and not fine in the open.
- **Expertise tags are self-declared.** Nothing verifies them. Reputation from shipped work is its own idea (`ideas/profiles-and-reputation.md`).
- **No rewards move.** The bounty text leaves the spec retro grant and the build bounty as TBD. Paying out is a later experiment (`ideas/retro-rewards-reddit-coordinape.md`).
- **No agents.** Delegates and pre-meeting briefs are a separate experiment (`ideas/agent-delegates.md`).
- **No notifications, editing, or moderation.** Deliberately. This is a question with code around it.
- **Body text uses your system font.** Arrow's Neue Haas Grotesk is commercially licensed, so it is not shipped in this public repo. The mono faces are open-licensed and included.

## Running the actual experiment

The demo proves the instrument works. It proves nothing about Arrow. To learn something:

1. Pick **one real, live, medium-sized decision** on Quiver or Spearhead where the lead is genuinely undecided.
2. Get the backend running for real, or for a first pass have one person host the demo and enter everyone's votes on a call.
3. Let it run for a week. Then read the Readout page together and ask: did the thread surface information the lead did not have? Did weighting change the outcome, and was the weighted answer the better one? Did the lead override, and does the rationale hold up?
4. Change the weights in `st_projects.weights` and see whether the argument about them is more productive with numbers on the table.

Things worth watching for: the expertise bonus is easy to game by tagging yourself with everything, a project with two core members gives those two a lot of say, and a lead multiplier of 2 may be too much or too little. All of these are guesses until a real thread runs.
