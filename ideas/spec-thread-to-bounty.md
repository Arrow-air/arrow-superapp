# Spec thread to bounty
Status: prototyping
Raised by: Thomas, 2026-09-17 call (~51:00)

## The idea
Instead of picking someone to spec a PCB, open a thread: 'we need a PCB for Spearhead.' The expert replies with the spec, earns upvotes and a retro grant for the spec, then the spec becomes a bounty or grant for them or someone else to build.

## Why it matters
Pre-assigned spec bounties mean doing half the work just to write and assign the bounty. Bounties are becoming prompts; the spec is the valuable part.

## How it might work
Thread type = need. Replies = candidate specs. Weighted votes plus lead sign-off promote a spec to a bounty. Another participant: agents can write the bounty text; humans supply expert direction ('use two CAN buses').

**Prototype:** `prototypes/spec-threads/`. Full flow from need to bounty markdown, with the lead override rationale.

## Risks and tensions
Spec quality still needs a competent judge. Small expert hints must be rewardable too, not just full specs.


Finding from prototype 1 (2026-09-18): as built, the thread is a destination you travel to, away from the CAD or the board. See `discussion-at-the-work.md`.

### Revision after Thomas's comments (discussion #11, 2026-09-18)
The single round in prototype 1 is wrong. What people post first are ideas and directions, not specs. Proposed shape:

1. **Direction round.** Open discussion of positions. Weighted vote. The lead picks a direction. Output: a decision in the register (`decision-register.md`).
2. **Proposal round, only if work needs funding.** People submit specific grant or bounty proposals against the chosen direction: scope, cost, timeline, who. Second weighted vote. The lead funds the best one.
3. **Or it stops at round 1.** The decision stands as a constraint on the project and no bounty follows. Some threads never decide anything and stay as open discussion, and that is fine.

Rename accordingly: replies in round 1 are *positions*, not specs.

### The freeze (2026-09-23 call)
Threads are addressed to the next version (`next-version-contributions.md`). The lead votes and comments as they go, then at the version freeze resolves every thread: **reject**, **promote to spec/requirement**, **turn into a grant or bounty**, or **defer** to the version after. Grants promoted this way carry a proposer award (`retro-rewards-reddit-coordinape.md`). The lead's agent can draft the grant text from the thread; the hazy step is still going from loose discussion to a fundable document (Q30). Alperen's alternative: pay the idea's author a small amount to write it up properly.

## Open questions
Q1, Q6, Q7, Q17, Q30
