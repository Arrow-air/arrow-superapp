# Prototypes

Throwaway builds. One folder per experiment. Each folder's README states the question it tests and what "worked" would look like. Branches are fine too.

The Quiver workspace graduated from here (`quiver-demo`) to [`/app`](../app/) on 2026-10-01; its history is in git.

| Prototype | Question it tests | Status |
|---|---|---|
| [`app-frame/`](app-frame/) | Gavin's frame: can one shell (bar, section nav, wallet, side panel, page header) host every Arrow module? | The app forked from it at `31d499a`; Gavin keeps iterating on branch `sl33ty/explore/app-frame`. |
| [`spec-threads/`](spec-threads/) · [live](https://specs.arrowair.com) | Prototype 1: do weighted public spec threads, with the lead keeping the final say, beat one lead deciding alone? Prototype 2 (branch `spec-threads-v2`): if contributions target the next version and the lead must resolve every thread at a freeze (reject, spec, grant, defer), does the discussion write the specs and grants by itself? | Prototype 2 built in demo mode, tested (53 unit, 80 browser checks), not yet merged to `main`. Supabase backend still the prototype 1 shape, never run. Retro session award is the next slice. Dogfooding on Spearhead PT2 needs the shared backend. See [`ROADMAP.md`](spec-threads/ROADMAP.md). |

## Candidates not yet built

- **One picture of Arrow.** Aggregate GitHub, Discord, and meeting notes into a weekly per-project digest plus a "where you could help" list. Tests whether a single view beats Discord plus GitHub. See `ideas/single-view-of-arrow.md`.
- **Retro allocation round.** A month of real contributions, a bucket of points each, agent-drafted allocations people correct. No tokens move. Tests Q5. See `ideas/retro-rewards-reddit-coordinape.md`.
- **Agent pre-meeting round.** Each person's agent debates the open questions before a call; humans approve or correct the brief. Tests Q3 and Q4. See `ideas/agent-delegates.md`.
- **Component threads on the Quiver viewer.** Click a part, get its discussion. See `ideas/cad-anchored-discussion.md`.
- **Meeting consensus UI.** Turn OPEN-QUESTIONS.md into a vote page. See `ideas/meeting-consensus-ui.md`.

- `quiver-app/` One app for one aircraft. Real Quiver data, pretend interactions. See its README.
