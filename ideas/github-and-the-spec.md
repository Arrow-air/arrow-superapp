# GitHub and the spec: which changes need a discussion
Status: exploring
Raised by: Thomas and Hex, 2026-09-28 (follows the CAD compare discussion in `cad-anchored-discussion.md`)

## The idea
The spec is the contract between the app and GitHub. The size of a change doesn't decide whether it needs a discussion. What decides is whether it touches the spec:

1. **Doesn't touch the spec.** Fix a footprint, reroute a trace, swap in a part that's in stock, tidy a CAD feature. This is a normal PR, reviewed and merged in GitHub, and the app isn't involved. Small decisions belong to whoever is building (`decision-ladder.md`).
2. **Implements something the spec already decided.** A quality review in GitHub: does it do what the decision says, and is it built well? Then merge. The PR links the decision or the funded work it delivers, so a lead can accept the work and the retro credit lands on the right people.
3. **Decides something the spec hasn't, or changes something it has.** This becomes a discussion in the app. The PR is attached as a candidate. If other PRs or ideas compete, they sit in the same discussion as peers. Settling picks one. That PR merges and the rest close. Changing a decision that is already in the version being designed reopens it. After a freeze, the change goes to the next version.

People can enter through either door. **Questions start in the app** ("should the tail run DroneCAN?") and settle into a decision and funded work, which then happens as a branch and PR (bucket 2). **Changes start in GitHub.** Buckets 1 and 2 never leave it. A bucket 3 PR gets flagged and shows up in the app as *Suggested from GitHub*, next to *Suggested from calls*, until someone opens the discussion.

## Why it matters
Without a rule, one of two things happens. Either every PR becomes a vote, and nothing ships. Or design choices get argued in PR comments, where token holders, manufacturers and other workshops never see them, and the spec quietly drifts from what's in the repo. Erick's point on the 2026-09-22 call still holds: open work already lives in GitHub issues (`meetings/2026-09-22/notes.md`). The app shouldn't copy that. It adds what GitHub can't do: weighted support, competing candidates as peers, and a decision tied to the spec and to money.

## How it might work
- **Flagging.** The author labels a PR `spec` (or links a discussion). Any reviewer can add the label. A check can also suggest it when a PR touches a spec'd interface: a connector pinout, a board outline, a mounting pattern, a named part in the spec. The lead has the final call on which bucket a PR is in.
- **The bridge.** A bot turns flagged PRs into suggestions in the app. When a discussion settles, the bot posts the decision back on the PR, and on the losing PRs too, so GitHub keeps the record.
- **CAD.** CI exports the web model plus a per-part manifest on every push (Q27), so a candidate PR can be viewed and compared in the Aircraft tab.
- **Electronics.** KiCad files are text in Git, so there's no reconstruction step. Parts already have stable names to anchor discussions on: reference designators (U3, J4) and net names (CAN_H). Existing tools cover the viewer and the diff. [KiCanvas](https://kicanvas.org) renders schematics and boards in the browser straight from a repo, and [KiRI](https://github.com/leoheck/kiri) renders visual diffs between commits. A board tab would follow the same pattern as the Aircraft tab and cost less to build.

## Risks and tensions
- The line between buckets is a judgment call. Too strict and people route around the app; too loose and the spec goes stale. Start with the author's flag and the lead's call, and see where the disagreements land.
- A reviewer in bucket 2 who finds that a PR deviates from the decision has to push it to bucket 3. That needs to feel normal, not like a rejection.
- Two tools means two places to look. The bot has to make the handoff automatic both ways, or people will pick one and ignore the other.

## Open questions
Q27, Q34
