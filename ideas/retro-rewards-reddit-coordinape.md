# Retro rewards: Reddit meets Coordinape
Status: exploring
Raised by: Thomas journal 9/10 and 9/12

## The idea
Discussion threads with weighted up/down votes, plus a bucket of retro reward tokens each member explicitly allocates across posts and contributions after the fact. Your agent can draft the allocation for review.

## Why it matters
A quick comment and a week of analysis shouldn't earn the same upvote. Explicit allocation forces judgment. Retro avoids pre-assigning work before it's proven.

## How it might work
Per-period allocation round. Weighted upvotes as a signal, explicit allocation as the payout. Arrow already tried Coordinape and didn't stick with it: propose with caution.

### Rewarding spec authors (flagged as a big open problem by Thomas, 2026-09-18)
Starting points, none settled:
- **A spec pool on every bounty.** A fixed share of the bounty's value goes to the people who wrote its spec, paid when the bounty is funded. A second share pays out when the thing is built and verified, so there is a reason to write specs that can actually be built.
- **Split by attributed contribution.** If the spec is a co-edited document, its history shows who wrote, amended, and corrected what. That is a starting ledger, not the answer: volume is not value.
- **Correct the ledger with judgment.** The contributors allocate among themselves, the lead signs off. This is where the hard case gets handled: weeks of groundwork versus one small decisive edit (Q5).
- **Reward the decisive hint.** A short expert comment that changes the outcome has to be payable, or experts won't bother.

### Two tiers, agreed as an experiment (2026-09-23 call)
1. **Session retro, upvote-weighted.** A bucket of $ARROW per discussion round (e.g. the PT2 discussion up to the freeze), split toward the best or most-upvoted ideas, including ones that were not adopted. Gavin: the lead can pre-split the bucket by aircraft system so a PCB idea and an airframe idea aren't competing for the same pool.
2. **Proposer award.** When a thread is promoted into a real grant or bounty, a fixed slice of that grant (a quarter was floated) goes to whoever wrote the idea or spec. Rationale: if the discussion did its job, the grant text already exists; writing the spec *was* the work.

Not settled: how ideas that shaped the decision but were not adopted get paid (Gavin: perhaps just as the vote stands), and whether the per-system split is the right frame. See Q31.

## Risks and tensions
Gavin's unsolved case: weeks of careful groundwork vs. one decisive small edit. Coordinape degrades beyond small trusted circles. Slop can still attract votes. Payout is tied to the version freeze (`next-version-contributions.md`), so the feedback loop can be months long.

## Open questions
Q5, Q6, Q7, Q22, Q31
