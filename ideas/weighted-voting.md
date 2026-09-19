# Weighted voting
Status: prototyping
Raised by: Thomas journal 9/10; refined on 2026-09-17 call

## The idea
Votes on design and funding questions are weighted by token holdings, project role, domain expertise, and intent to actually build the thing.

## Why it matters
Without weighting, strangers' agents will post takes they have no business posting. Julius's voice should outweigh a random holder's on a PCB.

## How it might work
Multipliers per factor. Reddit-style up/down on threads with weighted tallies. Gavin's playground: quadratic voting, micro-votes. Token doubles as an integrity, experience, and reliability tracker.

**Prototype:** `prototypes/spec-threads/`. The formula lives in `src/lib/weights.ts`.

## Risks and tensions
Weighting formulas get gamed. Balancing lead authority vs. multiple experts vs. token weight is unresolved. Governance participation is a good signal but can be farmed.

### Notes from Thomas's comments (discussions #3, #5, #7, 2026-09-18)
- **Role weights feel roughly right**, and not being a pure token vote is the point: drive toward higher-signal people. But the token must keep real value. People should want to buy $ARROW to get more say here. The current log curve with a cap of 3 works against that: past about a million tokens, buying more buys nothing. Options to weigh with Erick: a square-root curve (the quadratic voting shape, never flat), no cap, or tokens staked on a position for the life of the thread so say costs something beyond holding.
- **Builder intent needs gating** so it is not a free weight grab. Options: only members with a verified build or flight history get the bonus (the flight-tracking database already knows who flies what); a token bond returned on delivery; a reputation strike for declaring and not building. At small scale the lead can discount bad-faith votes by hand. That stops working with many voters.
- **An override is a failure signal.** Ideally the lead never disagrees with the top option. Track override rate per project and treat a falling rate as the coordination getting better. The optimistic end state is that the lead is not needed for most decisions: a position with a wide margin and no unanswered objections could decide itself.

## Open questions
Q1, Q2, Q6, Q14
