# One conversation, then a draft

**2026-09-25 update:** [Design & Work](DESIGN-WORK.md) adds downstream project views, specifications, decision replacement and delivery tracking. Both :4186 and :4187 now serve that newer build. This document records the previous iteration.

2026-09-24 · `conversation-draft-v1` · supersedes the working-brief interaction experiment.

## Product decision

Thomas found the long, narrow working-brief column difficult to use and correctly identified a second contribution surface: discuss an idea, then propose brief items, then make the lead curate them all. The replacement is one conversation and one readable draft document. Design adoption and commissioning work are independent—not a forced discussion → specification → grant funnel.

## Interaction

- **Discussion** is the default, full-width view. Contributions are chronological and expanded by default; replies stay with their contribution. Support remains advisory.
- **Draft outcome** is a full-width reading/editing view within the same discussion. There are no capture buttons, item queues, per-item approvals, or source-review checkboxes.
- Any signed-in contributor can start the single draft. Its author and the project lead can edit it; other contributors discuss it. Feedback entered beside the draft posts back into the original conversation, tagged with the draft revision.
- Markdown source links open the exact original contribution, including after reload or version freeze. The editor can inspect sources and insert links without maintaining a second discussion.
- The draft has a document and an explicit unresolved-questions field. A draft history preserves edits. Stale revisions are rejected, and navigation/reload warns before discarding unsaved document edits.
- Existing item-based brief data is presented as an unapproved starting document. Answers, exclusions, deliverables, and source links are preserved. Existing stored discussion data is not reset. The seeded PCB example remains illustrative, not an approved aircraft design or AI-generated synthesis.

## Review and outputs

The lead reviews the document as a whole, acknowledging the current conversation. New contributions clear that acknowledgement. The backend checks both the draft revision and exact discussion content at submission, including across browser tabs.

The two independent options are:

1. **Adopt into the design**: add a source-backed document to that version's design decision register.
2. **Commission work**: create a grant or bounty draft with its own scope, deliverables, and acceptance criteria. Scope starts from the document but is editable independently.

Neither option is mandatory. A plain conclusion can record an answer or retain the existing design. Both options may be selected together; the resulting work links to the adopted decision. Validation is all-or-nothing, so invalid work cannot leave half a review committed.

Open questions block design adoption and implementation work; research work can explicitly investigate them without implying a settled design. A lead can also record an unresolved conclusion without pretending it is a specification. Deferral retains both the conversation and its draft for the next version. Declined changes keep their rationale.

Recorded outcomes are immutable, close the discussion for that version, and preserve the full discussion-source snapshot. The lead can create additional work packages later, including after a version freeze. Editing work does not alter the recorded document. New information after closure belongs in a follow-up discussion.

## Deliberate limits

- Browser-local demo only. No shared backend, AI synthesis, funding, assignment, payout, or external publication was added. Supabase remains the older unsupported v1 implementation for these flows.
- Adopted documents live in the version's design decision register. A canonical, cross-discussion specification editor, revision/supersession workflow, and arbitrary many-to-many specification/work links are **not** implemented yet. This iteration removes the mutually exclusive outcomes and supports multiple work packages from one recorded design.
- Acknowledging review is not semantic conflict detection. The lead must put resolved answers and explicit scope boundaries in the document; the app cannot detect an omitted contradiction.
- Grant vs bounty is explicit metadata and scope; no different funding/claim execution lifecycle yet.
- New work does not automatically allocate the old 25% proposer share. It starts unallocated (0%) with discussion authors credited; allocation remains a separate, provisional lead decision.
- Legacy single-position resolutions and item-brief backend paths remain for reading existing demo data and regression coverage. Primary workspace, freeze, and review entry points use the new draft flow.

## Try it

Separate local preview: **http://127.0.0.1:4187/#/p/spearhead?view=shape&thread=n-engine**

1. Read the conversation, then choose **Draft outcome**.
2. Read Jun's telemetry and Rosa's independent shutdown idea in the same document. Follow a source back into the conversation.
3. Edit/save the document. Keep the voltage question open for research, or write a resolved bench scope and clear the question.
4. Try feedback as another contributor; it returns to the conversation.
5. As Omar, choose design adoption, work commissioning, both, or neither. Review and record the outcome.
6. Open the linked work draft or commission follow-on work later. Compare editable work scope with its preserved source document.

## Verification

- `npm run typecheck`
- `npm test` — 83 tests (68 retained plus 15 new outcome/migration tests).
- `npm run build -- --outDir dist-conversation`
- `BASE_URL=http://localhost:4187/ npm run e2e` — 31 browser checks covering author/lead permissions, same-conversation feedback, fresh review, combined outputs, immutable provenance, follow-on work, plain conclusions, deferral/freeze, research without adoption, source links after reload/freeze, and 1440/1024/768/390px layouts.
- Desktop and mobile screenshots inspected: `/tmp/arrow-conversation-review/`.
- Historical `e2e/brief.cjs`, `workspace.cjs`, and `walkthrough.cjs` target the superseded controls. They are retained as references; the current supported browser suite is `conversation.cjs`.

Serving `dist-conversation` on :4187 with Vite preview, detached process, log `/tmp/arrow-conversation-preview.log`. Original `dist-brief` on :4186 and workspace `dist` are untouched. No push, merge, or deployment.
