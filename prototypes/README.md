# Prototypes

Throwaway builds. One folder per experiment. Each folder's README states the question it tests and what "worked" would look like. Branches are fine too.

The Quiver workspace graduated from here (`quiver-demo`) to [`/app`](../app/) on 2026-10-01; its history is in git.

| Prototype | Question it tests | Status |
|---|---|---|
| [`app-frame/`](app-frame/) | Gavin's frame: can one shell (bar, section nav, wallet, side panel, page header) host every Arrow module? | The app forked from it at `31d499a`; Gavin keeps iterating on branch `sl33ty/explore/app-frame`. |
| [`spec-threads/`](spec-threads/) | Prototype 1: do weighted public spec threads, with the lead keeping the final say, beat one lead deciding alone? Prototype 2 (branch `spec-threads-v2`): if contributions target the next version and the lead must resolve every thread at a freeze (reject, spec, grant, defer), does the discussion write the specs and grants by itself? | Retired 2026-11-04: the app is off and specs.arrowair.com forwards to the superapp, which carried its ideas forward (threads to decisions to funded work, the freeze and the retro pool). The code stays here for reference; history in [`ROADMAP.md`](spec-threads/ROADMAP.md). |
| [`registry-onboarding/`](registry-onboarding/) | If every way into Arrow points at one three-minute profile and a person answers every one, do newcomers stay and find work, and can the team find the right person when a project needs one? Static mockups, invented people. | Mockups for Thomas, 2026-11-11. Nothing decided. |

## Candidates not yet built

- **One picture of Arrow.** Aggregate GitHub, Discord, and meeting notes into a weekly per-project digest plus a "where you could help" list. Tests whether a single view beats Discord plus GitHub. See `ideas/single-view-of-arrow.md`.
- **Retro allocation round.** A month of real contributions, a bucket of points each, agent-drafted allocations people correct. No tokens move. Tests Q5. See `ideas/retro-rewards-reddit-coordinape.md`.
- **Agent pre-meeting round.** Each person's agent debates the open questions before a call; humans approve or correct the brief. Tests Q3 and Q4. See `ideas/agent-delegates.md`.
- **Component threads on the Quiver viewer.** Click a part, get its discussion. See `ideas/cad-anchored-discussion.md`.
- **Meeting consensus UI.** Turn OPEN-QUESTIONS.md into a vote page. See `ideas/meeting-consensus-ui.md`.

- `quiver-app/` One app for one aircraft. Real Quiver data, pretend interactions. See its README.
