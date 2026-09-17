# Arrow Superapp Discussion — meeting notes

**Source:** Thomas's phone voice memo, ~62 min (audio kept off the repo). Transcribed with Whisper large-v3-turbo; timestamped transcript in `transcript.txt`. Recording joins mid-presentation; the first few minutes of the call are missing.

**Speaker attribution caveat:** no diarization. Names below are inferred from context (Thomas refers to "Gavin" as the first presenter; Thomas presents from ~36:00). Third and fourth voices are labeled by role, not name. Correct as needed.

**Participants (inferred):** Gavin (opens, presents superapp diagram), Thomas (presents JPL one-pager), at least two others (one mentions Praxis and the ElevenLabs idea; Erick is addressed near the end about the VPS).

---

## One-line summary

Everyone agrees the hard part is now deciding *what* to build, not building it. The group wants an Arrow "superapp" that makes project state visible, coordinates design decisions at every layer, and routes $ARROW to the people who add real signal. No spec was decided. Next step is a shared repo to collect notes and vibe-code throwaway prototypes, with another call around next Tuesday.

## Gavin's presentation (00:00 – 19:00)

A tour of a superapp diagram, reading as a set of linked apps:

- **DAO dashboard (public).** Live view of what's happening, global leaderboard of contributions, contributor rankings (e.g. $ARROW earned per week/month), ongoing work, open support tickets anyone can pick up. Agents in the background doing qualitative assessment and pulling people into projects.
- **Governance traffic lights** for permissioned contributors: signings due, project renewals coming up, decisions pending.
- **Tokenomics / sales tab**, possibly bonding; a separate **manufacturer dashboard**.
- **Accountability view** on gated projects: deliverables, what's due, public visibility as a motivator.
- **Source of truth / North Star** at the top. Every decision traced back to roadmap and AAPs; possibly per-area mini-roadmaps. "Gated values" the way gated projects work.
- **Own governance system replacing Snapshot.** Micro-votes, quick decisions, quadratic voting as a playground. Expects months of experimenting and failing.
- **Hardware layer.** Exploded-view 3D viewer (cites the Menlo/Asimov robot interactive viewer), per-component discussion threads, version branching, view aircraft variants with different systems. Downstream: 3D animated assembly and harnessing guides for manufacturers and home builders.
- **Manufacturer gating** with a traceable, soulbound-style identity so support discussions are attributable.
- **Quiver hub** for SDK development; pilot handbook, firmware params, maintenance guide unified.
- **Store + attachment catalog** (Thomas's store as the base).
- **Community solutions** section (e.g. a cargo mod for Spearhead built in Africa, replicated in Europe). "We're past forums," but keep threaded discussion and good UX.
- **Flight testing app** (Thomas's existing one) supercharged, wallet integration, linked to manufacturer/site.
- Longer horizon: simulation, games, RL training feeding back into hardware.

**Gavin's second idea, "buckets not experts" (13:00 – 19:00):** Individuals are 10–100x more productive but integration and coordination are breaking down. Proposes classifying contributors by aptitude buckets (testers, researchers, assemblers, organizers) rather than expert vs. non-expert. Experts sit as project leads shaping the brief and preserving cohesion; anyone with an agent can deliver work that fulfills the brief. Agents pair people to tasks.

## Discussion: trust, integrity, onboarding (19:00 – 36:00)

- **Thomas:** what matters when picking collaborators is intelligence and integrity; experience gaps are a real but payable cost. Biggest risk of open collaboration is people misrepresenting their skills; one fake "aerospace engineer" can wreck a project.
- **Gavin:** needs a ranking system with levels (e.g. "level one researcher") so trust is earned before someone is relied on for critical-path work. Token could do heavy lifting as an integrity, experience, and reliability tracker.
- **Another participant:** governance participation has historically been the best signal of sustained commitment. Distributing rewards in $ARROW creates vested incentive for quality.
- **AI interviews:** one participant proposed AI voice screening (even joked about a polygraph) to remove scheduling friction from intro chats. Praxis reportedly launched with an AI chat interview. **Thomas pushed back hard:** evaluating people is a human task and an AI-first welcome would feel distasteful. Gavin: maybe as a screener at the top of the funnel, but humans assess humans. Thomas: if forced into an AI interview he'd just have his own agent answer it, which might actually be a cool onboarding flow ("link your agent").
- **Agent-to-agent matching:** Gavin is bullish on personal agents knowing your skills/preferences and acting as a matchmaker between people who need help and people who can give it. Humans stay the arbiter of direction; agents reduce the coordination tax. Thomas's open question: if all our agents are wrappers around the same base model with different memory files, are they actually distinct enough to represent us? Gavin: aim for "good enough," not perfect; the bar is "does it coordinate us better than the time it costs us to coordinate ourselves."
- **Personal dashboard:** Gavin already uses one that tells him what to work on each day; wants an Arrow version. Thinks everyone will have one within six months.

## Thomas's presentation (36:00 – 54:00)

Presented the JPL-styled one-pager from his journal notes.

- **Core thesis:** bounties are becoming prompts. The hard part is consensus on spec and requirements. Big decisions work fine (forum, Snapshot, roadmap, calls). Inside projects, Alperen, Julius, and Erick are benevolent dictators, which works at current scale but won't when token holders in different workshops need different things.
- **State is scattered:** GitHub (much CAD still in Fusion, "bugs me to no end"), Discord, calls without good notes, people's heads. Wendell Berry test: the new tool must be a demonstrable improvement or it's just another tool diluting attention.
- **CAD integration:** the Three.js viewer built for Quiver is proof it's possible. Not a full CAD tool; work around the 3D models.
- **Profiles + reputation:** bio, skills, location, some ELO-like credibility from shipped work.
- **Agent-led direct democracy:** you can't vote on everything, but your agent can. Gavin extended it: agents do a first round of discussion before the human meeting, humans arrive briefed and vouch for or correct their agent. Thomas: the risk is agents trending toward the same model's slop; humans must stay in the loop. Both liked the Bezos-style "read the doc first" meeting.
- **Weighting:** a project lead's voice, a large token holder, someone who will actually build it, and domain expertise (Julius on a PCB) all deserve more weight. Without weighting, strangers' AIs will post takes they have no business posting. Gavin: the open tension is lead-with-final-say vs. distributed expertise; leads would need to be genuinely open to compromise. Thomas: aircraft are trade-offs, someone has to be opinionated.
- **Funding flow:** make the A in DAO real. Reward good ideas, not slop. Pre-assigned bounties for spec work are hard because you've done half the work just writing and assigning the bounty. Preferred flow: open a thread ("we need a PCB for Spearhead"), the expert writes the spec as a reply, upvotes plus a **retro grant** reward the spec, then that becomes a build bounty for them or someone else.
- **Reddit + Coordinape blend:** upvote/downvote with token and role weighting, plus a bucket of retro reward tokens you explicitly allocate across posts. Acknowledged Arrow's poor track record actually using Coordinape. Your agent could draft the allocation for you to review.
- **Streaming budget:** fixed monthly or streaming $ARROW, possibly allocated per project (e.g. Spearhead gets N tokens/month), and the app distributes it via governance to whoever has the most impact.
- **Gavin's unsolved problem:** retro evaluation is hard when someone spends weeks on careful work and someone else makes a small but decisive edit. Who gets paid?
- **Another participant:** an agent can write the bounty text itself; what we need from humans is expert direction ("use two CAN networks"), not full requirements writing. Small ideas should still be rewardable.

## Ideas that came up in passing

- Turn this meeting's own questions into a Reddit-style upvote board and vote on them right now.
- Render the same decision stream in different UIs: Reddit, Twitter feed, Tinder swipe. Gavin called it "massive scope" but liked a swipe UI for end-of-meeting consensus on posed questions.
- Blacklist mechanism (asked by "Rusk Fanatic" in chat): nothing exists; maybe a strike count or a downvote-driven ranking penalty.

## Points of agreement

- Spec/decision-making is the bottleneck, not build.
- State needs to live in one visible place.
- Votes must be weighted (token, role, expertise, skin in the game).
- Retro rewards over pre-assigned bounties for creative/spec work.
- Humans evaluate humans; agents brief, draft, match, and reduce coordination overhead.
- Build small, trial it, drop what doesn't work.

## Open questions

1. How does a project lead's authority coexist with distributed expertise and token votes?
2. Are personal agents distinct enough to be meaningful delegates?
3. How do you retroactively score a long careful contribution vs. a short decisive one?
4. What's the minimum version of this to build first?
5. Blacklist / strike mechanism?

## Action items

- **Thomas:** start a repo, upload all notes, use it for branches and vibe-coded prototypes. ("Feels like MVP.")
- **Thomas:** possibly Figma concepts; committed to building.
- **Thomas → Erick:** host things on the Arrow VPS; send credentials.
- **Everyone:** think about what you'd want to see and come primed to the next call, ~Tuesday or the following Tuesday.
- **Thomas:** this voice memo is the only recording; the built-in recorder failed for everyone.
