# Gavin's app shell: onboarding, contribute, component gateways
Status: prototyping (Gavin), Thomas forking
Raised by: Gavin, 2026-09-22. Branch `sl33ty/explore/superapp` on Arrow-air/website (23 commits, `templates/pages/app.*`, `static/js/app-viewer.js`).

## The idea
A single tabbed app on the Arrow site. You arrive, do onboarding quests for small token rewards, then enter Contribute, where every project has its own themed tab group and, for Quiver, a 3D assembly where every component is a doorway to bounties and an "improve this" flow. Later tabs (Bounties, Build, Fly, Community, Governance) inherit the same weighting and reputation mechanism.

## What it gets right
- **Onboarding as a checklist we already agree on.** The Member role on Discord is the only tracker Arrow has today; this makes the steps visible and finishable. It also gives the app a reason to exist for a newcomer on day one, which our decision-centred concepts lack.
- **Per-project shells with their own tabs.** Caribou and Quiver will want different ways in. The base tabs plus per-project extras is the right shape.
- **Component as gateway.** Looking at an aircraft is overwhelming; carving it into sections with their own bounties gives people a place to stand. Same anchor idea as `discussion-at-the-work.md`, arrived at from the contribution side instead of the decision side.
- **Live Team from GitHub contributors + disciplines taxonomy.** Real data, no invention.
- **Polish.** Sliding pills, themed project colours from the brand scales, a loader. It looks like Arrow, which matters for anything that will be shown publicly.

## Where it is thin (Gavin says so himself)
- Bounties, tasks, and "improve this" are dummy data. The kanban is drag and drop in localStorage.
- The 3D viewer knows subassemblies (`1300_landing_gear.glb`), not BOM part ids, so nothing anchors to a part number yet. Ours resolves every mesh to a BOM id; merging the two viewers is easy.
- No discussion, no votes, no decisions. "Discuss" is a tab name.
- Quiver leads with the airframe. Thomas: Quiver needs attachments and software; the drone is done.

## How it fits with our prototypes
| Gavin's shell | Ours |
|---|---|
| Onboarding quests | nothing; new |
| Contribute → project cards | `quiver-app` is one project card opened |
| Overview 3D, Component tab | `quiver-app` Aircraft page, per BOM id, with decisions and tasks on the part |
| Bounties table (dummy) | real task board T-01…T-18 with prices and funding lines |
| Tasks kanban (dummy) | real issues, no kanban |
| Team (live GitHub) | nothing |
| Discuss (empty) | `spec-threads` positions, weighting, objections, lead's call |
| Bounties/Build/Fly/Community/Governance (placeholders) | Money, Flights, Guides, Market on real data |

The obvious merge: Gavin's shell and onboarding on the outside, our real-data project pages and the decision/thread machinery inside, one 3D viewer keyed by BOM id.

## Risks
- Paying tokens for follow-on-X and intro-message quests attracts farmers. Keep rewards for steps that cost effort (welcome call, first accepted PR); make the rest just a checklist.
- A tab for everything is the superapp scope warning again. Gavin named it. Placeholders should stay placeholders until something real feeds them.

## Open questions
Q27, Q28. Related: Q15, Q20, Q24.
