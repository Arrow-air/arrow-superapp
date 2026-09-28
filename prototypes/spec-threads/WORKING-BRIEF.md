# Working brief — discussion → specification → grant

> Historical prototype. The current interaction is documented in [CONVERSATION-DRAFT.md](CONVERSATION-DRAFT.md).

2026-09-23 · `working-brief-v1` · follow-up to `project-workspace-v1`

## The product hypothesis

A discussion is not a competition to choose one complete specification. Jun's engine-board approach and Rosa's independent shutdown requirement can both survive into the design. The brief is the evolving synthesis; positions remain the conversation and voting signal.

Put the brief beside the discussion, not in a new top-level app. Contributors can capture and rewrite an insight from any approach or reply, combine multiple sources, or link a new proposal to the original question. The lead reviews proposed wording rather than having to author everything at the freeze.

## What works

- A per-thread brief: intended outcome, requirements, deliverables and acceptance checks, questions, supporting reports, and exclusions.
- Every item links to one or more exact discussion sources and retains source-text snapshots, original author, editor, and reviewer. Source links open the contribution within the workspace and retain the target version after a freeze.
- Anyone signed in can propose. Only the lead accepts items, answers questions, excludes items with reasons, considers sources, and approves the brief. Editing accepted wording returns it to proposed.
- Review the entire discussion, including alternatives. Sources can be marked considered as the lead reads them in the original conversation or in the brief's source list.
- Approval requires an outcome, an accepted requirement, no pending items or unanswered questions, and consideration of all current sources. A grant additionally needs an accepted deliverable with an acceptance check.
- New discussion makes approval stale. New or edited brief items revoke approval; votes alone do not. Deferral preserves the brief and history but requires fresh approval for the new target version.
- Every new grant uses the approved brief, not extraction from the chosen position. It carries accepted requirements, deliverables, answered questions, exclusions and their rationale, source links, and cross-approach contributor attribution.
- Immutable brief snapshot in the grant, separate from its editable scope. Grant edits cannot rewrite the historical approval. A brief-backed spec decision also retains its approved snapshot.
- The position selector now identifies a starting direction and retains existing vote-override rules. It does not define the whole specification. Proposer allocation remains provisional; the existing chosen-author share rule is not a complete contribution-reward model.
- Browser-local persistence, backward-compatible old demo data, revision checks, and re-reading stored state before writes protect against stale-tab approval. Resolved threads cannot receive new comments or brief changes; start a follow-up discussion instead.

## Deliberately not automated

This is human-curated synthesis. The starter PCB brief is hand-authored illustrative data, not AI output, a lead's actual decision, or a verified aircraft design. The input-voltage question is intentionally unresolved. A supporting report is not a verified test. A recorded acceptance check is not a passed test.

The application can ensure every source was marked considered. It cannot know whether a reviewer understood it, missed a contradiction, or omitted a requirement. There is no semantic conflict detector, AI extraction service, completeness score, funding decision, token payout, or shared backend here.

A later agent can propose wording and source references through this same item model; its output should remain proposed until reviewed. Do not advertise an AI capability before wiring and evaluating it.

## Try it

Open the separate preview at `http://127.0.0.1:4186/#/p/spearhead?view=shape&thread=n-engine` (ranch network). The original preview at :4185 retains its original build.

1. Read the proposed brief alongside the engine discussion. Follow Rosa's source link; it should open her independent approach.
2. Switch to Ade. Capture a question or requirement from an approach. Notice that Ade cannot accept it.
3. Switch back to Omar. Accept or edit the requirements. Record an actual answer to the voltage question, or explain why it is outside this scope. Accept the deliverable and its check; resolve the exclusion with a reason.
4. Consider every source, capture anything missing, then approve the brief.
5. Add a reply. The approval becomes stale until the new discussion is considered and the brief re-approved.
6. Open Lead decision and turn the thread into a grant. The grant now combines accepted contributions across approaches and retains the exact reviewed brief.
7. Edit the grant. Expand the source snapshot: it remains unchanged.

Existing browser data is not reset or silently populated with new brief data. A fresh preview origin shows the illustrative starter; an old browser state without briefs can create them through the controls.

## Verification

- `npm run typecheck`
- `npm test` — 68 domain tests, including permissions, freshness, revisions, cross-tab changes, source validity, attribution, snapshots, migration, deferral, closed discussions, and grant scope.
- `npm run build -- --outDir dist-brief`
- `BASE_URL=http://localhost:4186/ npm run e2e:brief`
- `BASE_URL=http://localhost:4186/ npm run e2e`
- `BASE_URL=http://localhost:4186/ npm run e2e:legacy`

No production deployment, push, merge, shared backend, or AI integration is included.
