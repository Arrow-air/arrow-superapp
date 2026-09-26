# Everyone through their own agent, no shared app
Status: seed
Raised by: Thomas, 2026-09-26

## The idea
The long-term shape isn't one web app everyone logs into. Each person works with Arrow through their own agent and a UI it builds for them, showing whatever matters to them right now. What's shared is the state underneath: decisions, tasks, threads, payouts, reputation events.

## What it changes
- The product is the **shared layer**, not a UI: a schema, a store, an API, and rules for who can write what. Every app is a renderer, including any "official" one.
- Headless-first (Q20) stops being an engineering preference and becomes the whole design.
- The event vocabulary for reputation and money (merged PR, accepted milestone, validated flight, spec funded, vote cast, reviewer sign-off) is the protocol.

## Rule that makes it safe: read freely, write deliberately
Agents can read everything, summarize, filter, route, draft. Anything that changes shared state with weight behind it (a vote, a decision, an allocation, a claim) is signed by the human. This is the Q25 answer from the 09-22 call turned into a protocol rule.

## Nobody designs their own view (Thomas, 2026-09-26)
Most people won't be good at prompting a custom UI and won't want to. So the personal view is not authored by the person:
- **Designed pieces, arranged per person.** Arrow designs a small set of good components (decision card, task card, part view, payout line, catch-up digest). The agent picks and orders them. It never invents layouts.
- **Inferred, not configured.** What to show comes from data the system already has: role on each project, disciplines, what you've touched, what's waiting on you, what changed since you last looked.
- **Correct, don't design.** The only controls are small nudges: pin, hide, "less of this", "why am I seeing this?".
- **Same card everywhere.** A decision looks identical in everyone's view, which also eases the shared-context problem below.

The model is a good home feed, not a dashboard builder. Power users can go further with their own agent. Nobody has to.

## Tensions
- **Common knowledge.** Coordination needs people to know that others saw the same thing. If everyone sees a different view, nobody is sure what the group knows. Some moments have to be shared and identical: the decision record, the tally at close, the meeting.
- **Filter bubbles.** Your agent decides what you don't see. The objection it hides is the one that mattered.
- **People without agents.** Newcomers, operators, most of the world. They need a plain reference UI, so it still gets built, just not as the centre.
- **Cost.** Whoever runs an agent pays for it. Vector already drained a $200 account on heartbeats.
- **Slop at the write edge.** Many agents drafting means many drafts. Weighting and human signing carry the load.

## Open questions
Q33. Related: Q3, Q20, Q25, Q26.
