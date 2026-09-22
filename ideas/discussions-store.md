# One discussions store, rendered everywhere
Status: exploring
Raised by: Thomas and Gavin, 2026-09-22 call

## The idea
Arrow's discussion is fragmented across the DAO forum, Discord, calls, and GitHub. Instead of adding another place, the superapp keeps **one database of discussions with an API**, and every surface embeds threads from it: the CAD viewer, a bounty page, a project overview, a Discord message posted by Vector, an agent reading the whole corpus, a swipe front end. "Effectively a Discourse, tightly integrated with the superapp" (Gavin).

This is the headless-first principle from `discussion-at-the-work.md` restated from the fragmentation problem rather than the anchoring problem. Same conclusion.

## What it must carry
- Anchors: project, BOM part id, board region, guide sentence, task, decision.
- Typed replies (position, amendment, objection, evidence, hint) so weighting and readouts work.
- Weights computed from profile, role, token balance, builder intent. All of which live in the same app, which is Gavin's argument for containing it: "if they're all separated, they don't work together."
- Export to markdown and GitHub Discussions at any time, so the fallback stays cheap.

## The GitHub question
Options raised on the call:
1. Build our own store; GitHub Discussions only as export.
2. Keep comments in GitHub, weighting on our side, and have Vector write the results back (emoji, text). Thomas's doubt: nobody would use the GitHub Discussions UI, so what does GitHub buy us beyond traceability?
3. Both, for a while, until the control test in `ROADMAP.md` says which one people use.

## Open questions
Q26. Related: Q15, Q20.
