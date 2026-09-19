# The decision register
Status: exploring
Raised by: Thomas, 2026-09-18, in discussions #7 and #11

## The idea
The main thing a thread produces is a **codified decision attached to the project**, not a bounty. Target range, endurance, payload capacity, cost, fuel type, attachment power budget. Each is a decision with a thread behind it, a status, the tally, and the lead's rationale. Bounties and grants are one possible downstream use of a decision, not the point of it.

## Why it matters
- Most important aircraft decisions never become a single bounty. They become constraints that every later bounty has to respect.
- Today those decisions live in a lead's head, a Discord scroll, or a call nobody recorded. New contributors can't find them and can't tell which are settled.
- Aircraft decisions are interdependent. "Any time you change one thing it impacts the rest of the aircraft" (Thomas, 2026-09-17 call). A register can record that payload depends on endurance, so reopening one flags the other.
- A forum can't do this. It has no notion of "decided", "superseded", or "depends on".

## How it might work
- A decision has: the question, status (open, converging, decided, superseded), the chosen position, tallies at decision time, the lead's rationale, links to the decisions it depends on, and what it unblocked (bounties, grants, other decisions).
- Decisions form a tree that mirrors the aircraft: aircraft → subsystem → component. Authority can follow the same tree: a subsystem lead decides within their subsystem (Thomas, #7).
- The register is written into the project repo as plain files, so it survives any tool, including this one.
- Reopening is the normal way to challenge a decision. The extreme case is a governance proposal to replace the lead (Thomas, #7).
- Software has a version of this called architecture decision records. This is that, for aircraft, with weighted community input in front of it.

## Risks and tensions
- Writing decisions down makes them feel more final than they are. Status and "superseded by" have to be cheap to use.
- A dependency graph nobody maintains is worse than none. Dependencies should be few and added when a conflict actually bites.
- Risk of bureaucracy. Small decisions should stay with whoever is building.

## Open questions
Q16, Q17. Related: `spec-thread-to-bounty.md`, `decision-ladder.md`, `north-star-traceability.md`.
