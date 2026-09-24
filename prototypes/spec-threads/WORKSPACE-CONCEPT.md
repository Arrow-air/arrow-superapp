# Project workspace — first concept

2026-09-23 · `project-workspace-v1` · based on `spec-threads-v2`

**Follow-up:** `working-brief-v1` implements the source-linked brief proposed below. See [WORKING-BRIEF.md](WORKING-BRIEF.md) for current behavior; the original concept and its original limits are preserved here.

## The product, in one sentence

Understand the aircraft, help shape its next version, and see those contributions become a design and work somebody can take on.

The project is the home. Threads, ballots, decisions, and grants are supporting objects, not competing destinations. The current build is protected; new contributions target the version in discussion.

## One workspace, three views

### Aircraft — orient me

- A conceptual system map gives the project a physical center. It is deliberately labeled as an illustration, not real aircraft CAD.
- The current build and the version taking shape remain visible together.
- Systems lead straight to their changes, including honest empty states.
- A starting discussion is selected from the member's declared expertise when there is a match. Otherwise, show an open discussion; this is a simple rule, not an agent recommendation.
- Actual project data supplies open questions, adopted requirements, and contributor counts. No invented activity feed, progress percentages, or funding totals.

### Shape the next version — work together

- A system-filterable, searchable list and an in-context discussion share the screen.
- Approaches carry their authors, replies, support, and trade-offs. The leading approach is expanded, not pronounced the winner.
- Short hints, questions, evidence, and alternative approaches remain welcome. The prototype does not yet have a typed contribution model.
- Voting and builder intent still use the existing rules. Weight details are available on demand.
- A new discussion is written in the workspace and explicitly addresses the version in discussion.
- URL queries preserve project, view, version, selected change, system, or grant. Browser back and reload work.

### Design review — see what this becomes

- **Part of the design:** adopted requirements, with the source discussion and any lead override rationale attached.
- **Work to make it real:** grant drafts alongside the version they serve, editable without leaving the workspace.
- **Still to work through:** open questions, competing approaches, and disagreements between weighted support and headcount.
- **Not in this version:** deferrals and declines, with their reasons and a path into the continuing discussion.
- The lead still has four outcomes. Existing backend rules enforce rationale, role, and freeze requirements.
- Freezing keeps the completed design visible and opens the next planned version for contributions.

## What this deliberately does not claim

- No real CAD integration, test telemetry, or verified build progress. The system illustration is not an engineering representation of Spearhead.
- No shared backend, real identity, payments, notifications, or AI synthesis. Browser-local demo data and fictional personas are unchanged.
- A grant remains a deterministic draft from one selected approach and its comments. It does **not** synthesize every approach or reconcile their contradictions. The editor says so and links back to the discussion. That is still a separate product problem to solve.
- No session retro-award bucket in this pass.
- Legacy record pages remain available for inspection under “Browse all records”; they are not the primary workflow.

## Try it

1. Open Spearhead. Select **Propulsion** on the aircraft map.
2. Explore a competing approach. Change the demo persona to Jun or Ade, reply, support, or suggest a change.
3. Change back to Omar. Open **Design review** and turn the engine discussion into a grant.
4. Open and edit that grant in the workspace. Follow its source back to the discussion.
5. Adopt avionics, defer payload to PT3, then freeze PT2. Review the completed design and switch to PT3 to continue the deferred discussion.
6. Open Quiver Mini to see the empty-project experience. Reset demo data when finished.

## The review question

Does a contributor understand where they can help, and can the lead understand what the next aircraft becomes, without stitching together a forum, a register, and a grant tracker?

This pass tests that structure. A likely next step, if the workspace feels right, is a source-linked working brief per change: accepted constraints, unresolved questions, alternatives not selected, and an editable scope for the grant. Do not auto-label extracted text as agreed requirements.

## Verification

- Existing 53 domain tests unchanged.
- `npm run typecheck` and `npm run build`.
- `npm run e2e`: workspace browser walkthrough; fresh browser state, contribution and all four decision paths, grant edit/publish, freeze, role boundaries, persistence, deep links, project switching, empty states, sanitized markdown, responsive overflow checks.
- `npm run e2e:legacy`: retained legacy detail-page walkthrough, updated to enter through the new shell. Set `BASE_URL` to the preview origin.

The branch is a local concept preview. Nothing here authorizes a merge or deployment to `specs.arrowair.com`.
