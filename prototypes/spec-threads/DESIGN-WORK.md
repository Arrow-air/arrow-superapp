# Design and Work: after the conversation

2026-09-25 · local branch `design-work-v1` · builds on `conversation-draft-v1`.

## Product

Project navigation is now Aircraft / Discussions / Design / Work. The existing one-conversation → reviewed draft flow stays intact. Design review is a checkpoint inside Design, not the home of all downstream artifacts.

### Design

- A **current specification**, organized by subsystem, separate from **decision history**.
- The lead writes a readable subsystem document from one or more adopted decisions. Each save includes a revision note, source decision IDs, author and timestamp; previous revisions remain readable.
- Newly adopted decisions not integrated into a section remain explicitly pending integration. The app does not automatically concatenate discussion documents into a specification or silently assume that requirements have been reconciled.
- Current adopted decisions and their source discussions remain independently readable. Rejections, conclusions without design changes, and deferrals appear in history.
- A newer adopted decision can explicitly replace earlier current decisions, with rationale. The replacement relation belongs to the newer decision; earlier source documents and frozen baselines are not rewritten. Replacement relations are append-once; reversing a choice requires another reviewed decision.
- Earlier frozen/building baselines are inherited into subsequent versions; live drafts from other versions are not. Specification revisions on a new version do not edit the inherited original.
- A section referencing a replaced decision is marked as needing reconciliation. The backend rejects freezing until that section is reconciled. Missing sections are allowed: adopted decisions remain part of the design even before an aggregate document is written.
- Frozen/building specification sections cannot be edited. Freeze materializes inherited sections into the frozen version.

### Work

- Grants and bounties share a work list. Filter by type, status, owner, subsystem, funding; search title/scope. The version picker scopes work, and All versions exposes work still underway against earlier designs.
- New work can be commissioned directly from a reviewed source outcome, including legacy adopted decisions. The source version and reviewed snapshot are retained; multiple work packages can share an outcome.
- Lifecycle: Draft → Open → In progress → In review → Completed. Review can return work for changes. Non-completed work can be cancelled. Completed/cancelled work retains its record; create follow-on work rather than reopening it.
- Scope and deliverables are edited while draft. Work planning includes owner, due date, explicit acceptance criteria, optional milestones, result evidence, and multiple linked decisions within its design baseline.
- Owner may start work, submit evidence, and request review. Lead controls assignment, funding, scope/acceptance, milestone acceptance and final completion. Evidence is required for review, completion and milestone acceptance. All milestones must be accepted before final completion.
- Funding (unfunded / proposed / funded / paid) is independent from work status. Budget is a human-entered amount/currency label, not accounting. Funding may be updated after completion; this never executes a payment.
- Work updates retain an author/timestamp/note and a snapshot of tracking fields. Completion evidence appears on linked design decisions. Submitted evidence is not presented as accepted until lead completion.
- Frozen designs do not freeze their implementation work.

### Back into discussion

A decision or work result can start a linked follow-up discussion. It uses the same or next available open/planned version, never modifies the source, and appears in the source record's follow-up list. The resulting adopted decision can explicitly supersede the earlier decision.

## Persistence and concurrency

Existing `arrow-spec-threads-demo-v2` storage is preserved. New fields are optional and legacy records acquire defaults lazily. Legacy brief acceptance checks can initialize work acceptance. Specification and tracking revisions reject stale writes across tabs. Draft scope saves also carry a tracking revision and validate before committing. Unsaved specification/work/scope edits have navigation guards and reload/discard controls.

## Deliberate limits

Browser-local prototype, not a shared project management service. No AI synthesis, live funding, payout, application/claim adjudication, attachments storage, notifications, or external publication added. Evidence supports Markdown links and review notes. Lead review is human review, not automatic semantic conflict detection or proof that a test report is correct. Grants and bounties have the same delivery lifecycle for now; different application/award mechanics remain future work. Supabase methods fail explicitly for this unsupported model.

## Verify

- `npm run typecheck`
- `npm test` — 104 unit tests, including 21 new design/work/concurrency/legacy cases.
- `npm run build -- --outDir dist-records`
- `BASE_URL=http://localhost:4188/ npm run e2e:records` — 53 browser checks.
- `BASE_URL=http://localhost:4188/ npm run e2e:conversation` — 31 retained conversation checks with updated navigation/labels.
- Browser checks exercise actual controls, roles, persistence, source links, multi-decision specifications, lifecycle, evidence, milestones, legacy commissioning, freeze, next-version follow-up/replacement, reconciliation and immutable prior baseline. Layouts checked at 1440/1024/768/390px; desktop/mobile screenshots inspected in `/tmp/arrow-records-review/`.

## Preview

As of 2026-09-26, both existing LAN addresses, :4186 and :4187, serve `dist-samples` with the [connected sample dataset](SAMPLE-DATA.md). `dist-records` is retained as the prior build. :4188 is the staging/check preview. Previous `dist-conversation` and `dist-brief` artifacts are retained. No remote push, merge, production deployment, or browser storage reset.

Start at `http://10.3.10.123:4186/#/p/spearhead?view=design` or `?view=work`. Existing contributions/outcomes appear from that browser's saved state. Fresh and existing demos automatically gain connected sample work, decisions and specifications; existing edits are preserved. New work package can also use the existing adopted wingspan decision without reopening its discussion.
