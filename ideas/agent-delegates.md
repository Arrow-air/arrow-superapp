# Agents as governance delegates
Status: exploring
Raised by: Thomas journal 9/12; Gavin extended 2026-09-17

## The idea
People can't vote on everything, so their personal agent votes, briefs, or drafts positions for them. Agents do a first round before a human meeting; humans arrive briefed and vouch for or correct their agent.

## Why it matters
Makes continuous governance practical. Implicitly makes decisions at every layer of the build. Meetings get better when everyone has read the doc first.

## How it might work
Agent linked to a member's profile, preferences, and skills. Modes: brief-only, draft-for-approval, vote-with-recall. Bezos-style read-the-doc-first meeting format.

## Risks and tensions
If all agents are wrappers around the same base model, delegate opinions converge to model slop. Governance becomes a prompt-writing contest. Sybil resistance gets harder. Humans must remain the arbiter.

## Open questions
Q3, Q4


## Update 2026-09-22
The call produced a concrete test: would you let your own agent vote for you? Thomas: probably not. Gavin: only with a well-tended soul file, and most people's would be boilerplate, so "whatever ideas Claude likes get upvoted and Claude is driving the ship." Alperen: never. Agreed direction: agents brief, listen, route (a newcomer's idea to the right lead, a question to someone who can answer it), draft, and match; humans vote. Vector should not hold important state in its own memory; the state lives in Git and the superapp and the agent bridges it to a person. Small throwaway agents per task rather than one all-knowing one. See Q25.
