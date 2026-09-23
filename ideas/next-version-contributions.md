# Contributions target the next version
Status: adopted (2026-09-23 call), to be built into the spec app
Raised by: Gavin, 2026-09-23 call; Alperen's earlier complaint about noise mid-build

## The idea
Every discussion thread is addressed to a version of the project. While the team builds PT1, the open discussion is about PT2. Outsiders are invited to look at the internals of the current prototype and say what they'd change, knowing it lands in the next one. Arrow's default collaboration message says this plainly.

## Why it matters
A build that is thirty days from done cannot absorb outside ideas; they become noise for the team and disappointment for the contributor. Pointing contributions one version ahead keeps the invitation honest and gives the lead a queue to work from when the next design starts.

## How it might work
- A thread carries a **target version** (PT2, PT3…). The app's front page for a project shows the version in build and the version in discussion side by side.
- The lead reads and votes along the way, no obligation to act.
- **At the freeze** for the next version the lead resolves every thread one of four ways: reject, promote to a specification or requirement (`decision-register.md`), turn into a grant or bounty (`spec-thread-to-bounty.md`), or defer to the version after. Nothing stays half-open across a freeze.
- Threads that became grants keep their history, so the spec is already written by the time it is funded.
- Trusted contributors, earned through this loop (`profiles-and-reputation.md`), can later be admitted to current-version discussions.

## Risks and tensions
- People who want to help *now* on the current build have to be routed to issues or bounties, not discussion.
- A lead who never freezes leaves the queue growing forever; the freeze needs a date.
- Interacts with `retro-rewards-reddit-coordinape.md`: the payout happens at or after the freeze, so the cycle can be long.

## Open questions
Q30, Q31, Q32
