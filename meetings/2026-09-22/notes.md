# Superapp call 2 — meeting notes

**Source:** transcript in `transcript.txt` (diarized by handle; a few lines are garbled or mis-attributed). No timestamps.
**Participants:** Gavin (sleety.eth), Thomas (thomasg), Erick (errrks.eth), Alperen (alperenag), KBM (kbmollysuh, briefly). Opens with gardening.

## One-line summary

Gavin showed a tabbed app shell (onboarding quests → contribute → per-project tabs with a 3D Quiver overview) and the group liked the flow. Thomas wants attachments and software to lead for Quiver, and discussion to attach to the CAD. Nobody trusts their agent to vote for them. Decision: a round of feedback on Gavin's version, then a live working call (Wed or Thu) to merge the best of both concepts before building anything "real".

## Reactions to Thomas's spec-threads demo

- Gavin: more depth than he could have imagined; the weighting is now something to tweak rather than to write from scratch. "For that section of the super app, that's perfect if we polish the UI and discuss the weighting."
- Gavin tested it by maxing everything (a million tokens, lead, builder, matching expertise) and called himself "an authoritarian". Alperen named every PCB "PCB". Both are fair stress tests of the weighting.
- Thomas: the spec app was a fragment to show one component, not a proposal for a separate app. The embedded discussions were the most exciting part.

## Gavin's concept (branch `sl33ty/explore/superapp` on Arrow-air/website)

Tabs: **Onboarding → Contribute → Bounties → Build → Fly → Community → Governance**, with a profile + $ARROW balance widget top right. Only the first two tabs have content.

- **Onboarding as quests** with token rewards: verify email, complete contributor profile (disciplines from the taxonomy), follow and verify X, intro on Discord, attend a welcome call (earns Member role), first issue, first accepted PR (unlocks Contribute). Aim: one place that tracks the steps everyone already agrees on, and a filter against the GitHub bot fluff.
- **Contribute** = project cards (Spearhead, Quiver, Caribou, Longshot, Feather, Kestrel, Superapp, Software, Flight Testing, Growth). Each project gets its own themed tab group: Overview, Tasks, Docs, Team, Discuss, plus per-project extras (Quiver: Component; Spearhead: Flight logs).
- **Quiver Overview** is a 3D assembly (Draco GLBs per subassembly). Hover highlights, click drills into a **Component** tab with related bounties, a five-step "improve this" flow (say hello first, read the docs, pull the CAD, prove the change, open a PR), and the GitHub README.
- **Every component is a gateway to contributions.** The lead divides the aircraft into logical sections; each carries improvement bounties; small wins get posted on socials and invite the next person to do better.
- **Tasks** is a five-column kanban. **Team** pulls live GitHub contributors with disciplines from `contributors.json`.
- Longer view: flight testing, leaderboards, governance, and an ideas/FigJam space all inherit the same weighting mechanism. "If they're all separated, they don't work together." Gavin's own worry: too ambitious.

## Discussion

**Quiver's centre of gravity (Thomas).** The drone design is done; what Quiver needs is attachments and software, and Gavin's layout doesn't capture that. For Spearhead and Caribou, where the structure is still being designed, the app needs to hold competing candidates, not one model.

**Discussion on the CAD.** Gavin asked for a live state of the design people can discuss around. Thomas showed his abandoned demo (click a part, read its info, start a thread) and Gavin said that is exactly what should slot in. Thomas's example: click the attachment interface, say why it is bad, someone posts a concept, people comment on corners of that concept, several candidates coexist. Both noticed that forking is replacing commenting: "I'd rather fork it and show you what I'm imagining."

**Slop (Alperen).** People will post plausible, obvious, AI-written comments to farm tokens, and an agent judge will rate five paraphrases of the same thing as useful. Answers offered: weighted votes so slop doesn't rise; restrict upvoting to team members; a "this is AI slop" button that pushes reputation negative. Thomas: we already see this on GitHub.

**Fragmentation (Thomas).** DAO forum, Discord, calls, GitHub. Things slip through for him and he is in Arrow daily; for a newcomer it is worse. He does not want to build apps that scatter discussion further. Converged on: **one discussions database with an API**, the superapp holds state, and threads get embedded wherever they are needed (CAD viewer, other small apps, agent readers, a Tinder-style front end). Gavin: "effectively a Discourse, tightly integrated." GitHub Discussions remain the fallback; Gavin floated having Vector write weightings back into GitHub comments retroactively, Thomas doubts the GitHub Discussions UI would be used at all.

**Agents.** Alperen wants Vector to bridge Discord and the app: "Vector, ask the community if there is an expert on this," and Vector opens a discussion and tags people by discipline. Gavin: agents listen to meetings and Discord, then post hooks to each contributor's dashboard ("Caribou wanted a web shop UI"; "you said regulatory, Quiver certification needs help"). The reverse too: a newcomer types an idea and it lands on the relevant lead's dashboard; agents pair a question with someone who can answer it. Thomas: one agent vs many barely matters while they are the same base model with different prompts; the risk with a public Vector is that it imports slop into its memory. Better pattern: **all important state in Git and the superapp; agents are a bridge between that corpus and a human**, and you spin up small throwaway agents per task (read Sleety's bio, read the bounties, recommend a path). Fine-tunes may change this later.

**The trust test.** Thomas: "Would you trust your own personal agent to vote on your behalf?" Thomas: probably no. Gavin: only with a very well-tended soul file, which most people won't have; otherwise "whatever ideas Claude likes get upvoted and Claude is driving the ship." Alperen: never, for anything. Agreed as the test to keep in mind; Thomas hopes it eventually becomes yes.

**Vector.** Off because it drained Thomas's $200 Claude account, mostly heartbeats replying to PRs. Coming back today with a lower heartbeat and a cheaper model (OpenRouter / Qwen suggested; Gavin mentioned Sonnet 5.1). Use it for project state and meeting notes; engineering work is pay-your-own-compute. Erick wants it for meeting notes and syncing his local Quiver repo. Alperen mentioned "Jev", a cheap constrained-choice agent, as an option for Vector-type routing.

**Erick's take on the shell.** Likes Overview/Components/Tasks/Team as a state-of-the-project view and would populate Tasks with his open issues now. Bounties tab duplicates GitHub issues. Wants a version people can use early for feedback.

## Decisions

- Feedback round on Gavin's version, then a live working call Wednesday or Thursday to plug modules in and merge concepts, then freeze and build. Thomas is free all day either day.
- Thomas forks Gavin's branch rather than listing critiques; Gavin pushes it and is fine with pushes to main of the website repo.
- Vector returns today, throttled and on a cheaper model.

## New or sharpened open questions

- Q25 Will you let your agent vote for you? (Current answers: no, only with a tended soul file, never.)
- Q26 One discussions store with an API, rendered everywhere; do we build it or keep GitHub Discussions underneath?
- Q27 How do competing design candidates (forks) sit side by side for a part that is still being designed?
- Q28 Onboarding quests with token rewards: which steps are worth paying for, and does paying for them attract the wrong people?
- Q29 Slop defence: weighted votes only, team-only upvotes, a slop button with negative reputation, or all three?
