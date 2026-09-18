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

## Open questions
Q1, Q2, Q6, Q14
