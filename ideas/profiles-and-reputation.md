# Profiles and reputation
Status: exploring
Raised by: Thomas journal 9/12; Gavin ranking/levels 2026-09-17

## The idea
Members have a bio, skills, and location. Reputation accrues from shipped work, something like an ELO. Gavin adds levels ('level one researcher') so trust is earned before critical-path reliance.

## Why it matters
Open collaboration's biggest risk is misrepresented skill. Reputation lets the community rely on people proportionally. Also lets agents match people to work.

## How it might work
Profile schema; contribution history from GitHub, threads, bounties, governance participation. Governance participation has been the best historical signal of sustained commitment.

## Risks and tensions
Character evaluation is hard in public and open source. Rankings can be gamed. Blacklist/strike mechanism doesn't exist yet.

## Open questions
Q9, Q10, Q11

## Update 2026-09-26: a deep profile at onboarding, fillable by your agent (Thomas)
Modelled on the Keeper onboarding: many short question modules that build a real picture of someone, not a form with a bio box.

**Three layers, always shown apart**
1. **Said**: answers to the question modules, a bio, interests, what you want out of Arrow.
2. **Linked**: previous projects, repos, portfolios, papers, flight logs. Evidence someone else can check.
3. **Earned**: reputation from Arrow events (merged work, accepted milestones, validated flights, reviews, decisions). Empty on day one.

The profile solves the cold start: on day one, layers 1 and 2 drive the personal dashboard. Over time layer 3 takes over.

**Agent fill.** The question set is published as a schema on the API. Your own agent drafts answers from what it already knows about you; you see the draft and approve it before anything is written. Each answer records whether you typed it or approved an agent draft. People without an agent just answer the questions.

**Question modules (first cut)**: tell us about something impressive you've built and the problems you had to overcome along the way (Thomas; the best single question, because it asks for a story with specifics, which is hard to fake and easy to follow up on); what else you have built; what you want to learn; disciplines (taxonomy v1.0) split into can-do and want-to-do; tools and shop access (printer, CNC, bench, soldering, a field to fly, a Quiver); location and how far you would travel; hours per week and timezone; how you like to work (async, calls, pairing, solo); what you want out of it (pay, learning, the mission, a job, a business); what you never want to be asked to do.

**Guardrails**
- Agent-written bios all sound the same and all sound impressive. So a bio carries no weight by itself; weight comes from layers 2 and 3.
- Visibility per field: a public card, member-only fields, and private fields used only for matching (availability, pay expectations, exact location). "Open API" means open to your own agent and to the matching policy, not to everyone.
