# The shell contract: what Gavin's frame owns, what the workspace owns
Status: exploring (draft v0 for Gavin and Thomas to go back and forth on before any reskin)
Raised by: Gavin (frame mockup and "wrapper" list, Discord 2026-09-28), Thomas, Hex

## The idea
Gavin's frame is the chrome: top bar, top tabs, left sidebar, and a style guide. The workspace at specs.arrowair.com is the content: the views, the records, and the rules for writing to them. Both sides keep their jobs if the seam between them is written down. This file is that seam. It also says which rules hold for every renderer, because the frame is one renderer among several (Discord cards from Vector, a person's own agent view, the CAD viewer).

Gavin's principle drives it: "the biggest killer of contribution would be different pathways to making that contribution." One predictable frame, one way to contribute, anywhere in the app.

## What the shell owns
| Shell part | What it holds | Where it comes from |
|---|---|---|
| Account | Sign in with Discord, avatar, profile link, ARROW balance, and *why your support weighs what it does* (role, discipline, builder status, tokens) | member + weights API |
| Context | Which project; **both** versions at once: the one in build and the one in discussion, with the freeze date and countdown. Not a single "current version" dropdown (2026-09-23 decision: contributions target the next version) | project + versions API |
| Global nav | Project switcher, the shared top tabs, search, and the inbox ("what needs you") | tab counts and unread from the API |
| Sidebar | Generated from the project's anchor tree: subsystem → component → part, plus project-level topics (GTM, pricing, applications, workshop builds). A sidebar item is a filter on the content, never a separate section | model manifest, boards, project topics |
| Breadcrumb | project › tab › anchor | route |
| Style guide | The card set every renderer uses: decision card, question row, task card, part card, payout line, catch-up digest. Same card everywhere | shell repo; content imports it |

## What the content owns
| View today | What it does | Where it lands in the frame |
|---|---|---|
| Overview | Counts, the two versions, needs-you, suggested from calls | Overview |
| Aircraft | The model; discussions anchored to part, component, subsystem | Design, with the sidebar as the part tree |
| Discussions | The index of every thread, filtered by status, version, system | Not a tab. A filter view reachable from any tab, and each thread renders at its anchor |
| Spec | The decision record for the version being designed: decided, superseded, depends on | Design (missing from the frame today) |
| Work | Funded work, claimable tasks, proposer awards, tracking stages | Building |
| Freeze | The lead resolves every thread: reject, promote, fund, defer; the retro split | Overview, when the freeze is near; a milestone in the channel |
| People | Roles, disciplines, who leads what | Contributor Dashboard neighbour (missing from the frame) |
| Sources | Call notes and repository records with coverage | Overview footer or a sidebar tool |
| Inbox | Decisions and pings waiting on you | Contributor Dashboard |
| Search | Across all of the above | Top bar |

## The seam
Content declares, the shell renders:
- its anchor tree (for the sidebar) and the anchor currently in view (for the breadcrumb)
- counts for tab badges and the unread count
- the version pair and the freeze date
- the needs-you list for the signed-in member

Shell supplies, content reads:
- who is signed in and the weights they carry
- the selected project, version, sidebar anchor, and tab

Everything crossing the seam is the same API that Vector and personal agents read (Q20, Q33). A panel that only works inside the frame is a bug.

## Rules that hold in every renderer
1. **One pathway.** Support, object, propose, and claim look the same on a part, a spec line, a task, and a Discord card.
2. **Discussion targets the version in discussion.** The version in build takes issues and PRs only.
3. **Same card everywhere.** A decision looks identical in the frame, in Discord, and in an agent's view, so the group knows what the group saw.
4. **Provenance on every item.** Human-written, suggested from a call, suggested from GitHub, or agent-drafted and human-approved. Agents propose; a human adopts.
5. **Read freely, write deliberately.** Votes, claims, decisions, and allocations are signed by the person, never by their agent.
6. **Placeholders stay placeholders.** A tab appears when something real feeds it (Gavin's own rule from his first shell).

## What the frame does not hold yet
Ranked by what our existing decisions already require, then by goals in this folder with no home in the frame.
1. **Two versions, not a version dropdown.** Adopted 2026-09-23. The frame needs "PT1.5 in build · PT2 in discussion · freeze Oct 31 (33 days)" in the top bar, and the freeze resolution somewhere.
2. **What needs you and what changed.** ux-moments 1 and 7, `personal-dashboard.md`, the inbox. The Contributor Dashboard button is a link, not a feed. This is also Gavin's morning-dashboard argument, and the API behind it is what lets Alperen's Atlas or Gavin's own dashboard render a custom version.
3. **Decisions have no home.** Design, Building, Manufacturing, Testing are phases. A decision is an object with a status, a tally, a rationale, and dependencies (`decision-register.md`). It spans phases, so it needs its own place, which the workspace calls Spec.
4. **Discussion is a place in the frame.** `discussion-at-the-work.md` and `discussions-store.md` say the opposite: threads live at the work and the app is the index. Gavin's "Discussion" sidebar topics are project-level anchors in the same store, not a second system.
5. **Money.** The ARROW figure in the corner is the only money in the frame. The retro pool, proposer awards, budgets against spend, and the payout queue (`funds-and-payouts.md`, ux-moment 6) need a view, and money votes are token-weighted where design votes are not.
6. **Work and the GitHub bridge.** Funded work, claimable tasks, and spec-touching PRs ("Suggested from GitHub", Q34) need a list. Building is the natural tab, but it is not a list today.
7. **Weight and why.** Support is weighted by role, discipline, builder status, and tokens, in two blends (`weighted-voting.md`). The frame shows a balance; it should show the weight and its reasons on every vote.
8. **People and verified disciplines.** No Team or People view, no discipline verification, no said/linked/earned profile (`profiles-and-reputation.md`). Pings by verified discipline depend on it. Gavin's first shell had a live Team from GitHub; the new frame drops it.
9. **Onboarding and the cold start.** Sign in with Discord, a checklist, the deep profile, and "what's settled" for a newcomer (ux-moment 5, Q28). Also dropped from the first shell.
10. **Contexts that are not an aircraft lifecycle.** Gavin wants the frame to serve aircraft, attachment, DAO, and testing contributions alike, but the tabs are aircraft phases. Quiver's centre is attachments, software, and a route to market (`quiver-app.md`); DAO work is governance and funding rounds; testing is flight data. Phase tabs go empty for those.
11. **Manufacturing, Testing, Store.** Nothing feeds them yet. Manufacturing has a real candidate: manufacturers weighing in on candidate compares (`cad-anchored-discussion.md`). Testing has flights.arrowair.com. Store is undefined.

## Risks and tensions
- **Phase tabs versus artifact tabs.** Phases are how a newcomer thinks; the record is by artifact (parts, boards, code, guides, flights). If the phase tabs are filters over the same records, both work. If they are separate sections, the record fragments.
- **A version switcher hides the two-version rule.** One dropdown reads as "browse history"; the rule is "discuss the next one."
- **A tab for everything.** The superapp scope warning, again. Per-project extras belong in the sidebar, not the top tabs.
- **Style guide drift.** If content components are restyled inside the frame instead of importing the shared cards, "same card everywhere" breaks on day one.

## Next
1. Gavin and Thomas edit this file until the two tables and the rules hold. A week at most.
2. Then a branch: `WorkspaceShell.vue` rendered inside Gavin's frame, the sidebar generated from the model anchor tree, Gavin's tokens and cards as the style guide. Real Spearhead data, so the empty tabs are visible rather than argued about.

## Open questions
Q41. Related: Q20, Q28, Q33, Q34.
