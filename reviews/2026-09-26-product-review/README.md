# Arrow workspace: product review

2026-09-26 · Reviewed `design-work-v1` and the delivered Spearhead app on ports 4186/4187.

## Verdict

Keep the project-centered structure. The evidence work gives this app a reason to exist: it connects an aircraft's design, the conversation behind it, what people are doing, and what was learned. It should become the team's working project record, not another destination to copy updates into.

The central gap is **two disconnected products**: the real Spearhead app is a read-only evidence browser; the fictional sandbox contains the contribution, decision, specification, and delivery workflows. Production means joining those capabilities with shared persistence and trustworthy authorship, not simply removing the word “demo.”

**Core loop:** question → discussion → reviewed outcome → optional design decision and/or work package → submitted evidence → accepted result → follow-up. Research can happen before a design is settled. Not every useful contribution needs a grant or a vote.

## Review coverage

- Browser-inspected all five real-data tabs and a result detail, desktop and 390px mobile.
- Browser-inspected 12 sandbox routes: overview, discussion, design, work, projects, threads, register, grants, profile, help, readout, freeze.
- Inspected source for shell/routing, real-data selection/filtering, evidence model, conversations, work tracking, outcomes, demo storage, Supabase adapter, initial migration, Markdown rendering, and existing test coverage.
- Reproduced history/filter navigation and record/version mismatch; inspected blank and invalid-link states.
- Initial 24 page/view captures produced no JavaScript runtime errors; all six mobile views fit the viewport. Fit is not a complete accessibility review.
- Screenshots and `inspection.json` are local review evidence in this directory, not a new public source publication. No live shared database, identity provider, notification delivery, or payment system was exercised.

## Small changes made during this review

- Removed the sidebar slogan from the screenshot and the decorative “An open development space” status.
- Renamed “Your projects” to “Projects”: membership is not established in this snapshot.
- Removed the fictional sandbox from normal real-project navigation. The explicit `?dataset=examples` address still works and browser data is preserved.
- Replaced demonstration/explanation copy with functional headings: “Open questions & proposals,” “Design & decisions,” “Work & results,” “Sources & coverage.”
- Kept read-only / not-live status, evidence distinctions, unresolved conflicts, and dates. The banner now uses the dataset date instead of a separate hard-coded date.
- Removed archive-delivery mechanics from one coverage note; retained the detailed intake audit in `REAL-DATA.md`.
- Replaced the assertion that every missing record must be fictional with neutral “Record unavailable” guidance.
- Increased standalone real-workspace action targets to at least 44px high on mobile.
- Fixed milestone creation on the HTTP LAN preview: `crypto.randomUUID()` was unavailable there; milestone IDs now use `crypto.getRandomValues()`. The sandbox browser walkthrough exposed this failure.
- Renamed the browser title to “Arrow · Project Workspace.” Contextual page titles remain a follow-up.

These are product polish, not a claim that collaboration is production-ready. No aircraft facts, approvals, assignments, votes, or funding were created.

## Priority 1 — finish the product people are already using

### 1. Restore navigation context (confirmed bug)

**Observed:** Work → Results & history → search “hover” → first-hover record → Back to work returns to Active & planned, while retaining “hover.” The result disappears. Opening a detail drops the `queue` query. Search is local state and disappears on reload.

**Change:** preserve queue, filters, search, and return location in the URL; restore list scroll/focus. A record should have a stable identity independent of the tab that opened it. Use actual links for records so open-in-new-tab/copy-link work naturally.

**Done when:** browser Back, in-app Back, copied links, and reload return to the intended record or filtered list. Relevant code: `SpearheadWorkspace.vue` (`navigate`, `open`, `search`), `SourcedRecordList.vue`.

### 2. Prevent contradictory version/filter context (confirmed bug)

**Observed:** `?view=design&version=PT2&record=pt1-electrical` shows PT2 selected while displaying a PT1-only record. Selection searches the full dataset, not the filtered set. Cross-system related links can carry an unrelated system filter too.

**Change:** make record scope explicit; normalize incompatible filters or show “Outside current filter” with a clear return path. Never silently imply a historical record applies to the selected aircraft version.

### 3. Make lists useful working queues

**Observed:** real Work starts with the August CAD handoff and other planned items; the two in-progress items are much farther down. Lists reflect source-array order. “Needs attention” uses an editorial boolean and the first three matching records, not a ranked priority queue.

**Change:** default to In progress / Planned / Needs confirmation; expose sort by last update, prototype, contributor, and status. Label editorial attention as such. Later add accepted owner, blocker, next action, review due, and overdue states only when recorded.

**Done when:** a contributor can identify the next actionable item without reading the whole list; imported mentions do not become assignments automatically.

### 4. Separate design baseline, call direction, and as-built configuration

**Observed:** “Design & direction” is one list containing preliminary documentation, call agreements, and as-built differences. PT1 and PT1.5 share a filter bucket. Distinctions exist in badges and prose but are hard to compare.

**Change:** provide three views within Design: documented baseline, proposed/agreed changes, and as-built configuration. Add prototype/configuration comparison and explicit supersession links. Represent PT1.5 as a configuration of PT1 where supported, not a fabricated formal repo version. Keep missing baseline sections visibly unknown.

**Done when:** a builder can answer “What applies to this configuration, who confirmed it, and what differs from the document?” without guessing which date wins.

### 5. Turn Sources into a usable library

**Observed:** long coverage notes precede the 16-item repo review and 23 sources; source cards show linked-record counts without a drill-down. Several source types require access to Discord or GitHub.

**Change:** compact coverage summary, searchable source list, filters by date/type/system, linked-record drill-down, repository-reconciliation queue. Put ingestion hashes and packet receipt notes in an import audit, not the primary user flow. Label access requirements and unavailable sources; retain pinned repository references.

**Done when:** users can find the exact basis of a claim quickly, including primary versus secondary evidence. Do not automatically republish transcripts.

### 6. Improve information density and mobile hierarchy

**Observed:** the desktop rail contains little useful navigation; generous cards produce a very long phone overview. Small muted labels, wrapped tabs, and tiny actions make scanning harder even without horizontal overflow. Initial standalone actions measured about 16–18px high; first-pass mobile CSS increases these.

**Change:** compact persistent project navigation; tighter list rows; expandable summaries on mobile; clear current section; legible text and metadata. Put short status/date beside the title and detailed provenance in a supporting panel. Audit contrast, zoom, focus order, focus visibility, touch spacing, and screen-reader announcements before release.

Keep the restrained visual system. No need for decorative aircraft artwork, a new visual brand, or another hero section.

## Priority 2 — make real collaboration possible

### 7. One data model and one workspace

`SourcedRecord` and the sandbox's `Thread` / `Decision` / `Grant` / specification types are separate. The real workspace bypasses the backend. Simply turning on Supabase will not join them.

**Build:** a shared record identity and explicit provenance links. Keep imported evidence immutable as an origin record; allow it to seed a real discussion, a proposed decision, or suggested work through review. Preserve source author, summarizer, app author, reviewer, and approval as different fields/events. Do not impersonate Alperen or Erick by converting a summarized sentence into their posted message.

Migrate the 55 records and 23 sources idempotently: stable source IDs, duplicate detection, import diffs, retained old revisions, reconciliation review, rollback. Keep the 16 repository-review items a separate documentation dimension.

### 8. Shared persistence and real roles — release blocker

The demo backend uses localStorage and selectable personas. The Supabase adapter is explicitly v1-only: specifications, work updates, outcomes, decisions, grants, and freeze actions are absent or throw. Its migration predates the current model.

**Build:** current schema, real sign-in, project membership, contributor/lead/reviewer/admin permissions enforced on the server, transactional outcomes and freezes, revision conflicts, durable audit history, recovery and exports. Existing client-side guards are useful behavior prototypes, not the production authorization boundary.

**Done when:** two separate accounts on two devices see the same record; an unauthorized request fails server-side; concurrent edits cannot silently overwrite one another; refresh/sign-out does not lose a saved contribution. The actual hosted environment still needs its own authorization review and restore drill.

### 9. Give imported questions somewhere to go

**Observed:** “Discussions” in the real view is a list of summaries with no discussion/reply action. It cannot capture the answer that would resolve a question.

**Build:** “Discuss this” / “Add evidence” / “Suggest correction,” seeded with cited context, then real comments. Start small: text, links, attachments, edit history, mentions, draft recovery, and resolve/reopen with rationale. Discussion authorship must remain separate from the source's speaker attribution.

Until this exists, describe records as summarized questions rather than pretending they are active threads.

### 10. Reuse the existing outcome and work flows

The sandbox already has strong concepts: reviewed source snapshots, separate design adoption and commissioning work, research versus implementation, immutable baselines, milestones, acceptance criteria, owner updates, lead acceptance, and follow-up links.

**Build:** these against real records and the shared backend. Introduce work claiming/assignment acceptance, dependencies/blockers, notifications, and attachments. Treat “reported complete,” “submitted for review,” and “accepted” as different states. Preserve the separation of completion, funding authorization, and payment.

**Done when:** one real question can be answered, reviewed, commissioned, completed with evidence, accepted, and exported without re-entering its context.

### 11. Build the return visit

No meaningful “what changed since I last looked,” personal inbox, or watch list exists in the real view.

**Build:** unread changes, mentions, review requests, my assigned work, followed systems, and a compact project digest. Start with in-app notifications and explicit subscriptions; add external delivery afterward. Unread is not the same as unresolved. Imported historical material should not trigger floods of fresh-work notifications.

### 12. Repair and synchronize records, not just display mismatches

The 16-item repository review is useful, but each gap needs an owner, reason, proposed correction, review status, and linked resolution artifact.

**Build:** a review queue that can draft a decision record or repository change, preview its diff, and link the resulting PR/commit. Keep external publishing explicit and track sync failures. A missing repo record is not automatically a design violation; a call agreement is not automatically a released spec.

## Priority 3 — durable engineering knowledge

### 13. Distinguish the clocks

A single record `date` currently does several jobs. Separate event/test date, source publication date, import date, and last human verification. An unknown flight date should stay unknown.

Replace blanket age-based warning language with a review policy: old test evidence is historical, old in-progress status needs reconfirmation, and a released baseline remains applicable until superseded. Keep evidence age visible, but don't manufacture urgency from a calendar threshold.

### 14. Put artifacts next to the work

Support revisioned attachments and links for CAD, PCB files, BOMs, drawings, firmware revisions, log files, and test reports. Show configuration and revision at the point of use. Start with file/link provenance and preview; add embedded viewers and part-level annotations when useful. An attractive model without revision context would make the app less trustworthy.

### 15. Add search across the whole project

Current search is tab-scoped and not available on the overview or Sources. Add project-wide search covering discussions, design records, work, evidence, and people, with result-type/version filters and stable links. Reuse the same filters in shareable saved views rather than creating many new top-level tabs.

### 16. Make conversation comfortable

The sandbox puts a large list beside a long discussion; all approaches are expanded and contribution dates are not prominent. Drafts and replies need navigation/refresh recovery. Add chronology, author/time, edited indicators, linking to a specific contribution, optional typed evidence/question/objection, attachment previews, and a compact latest-activity view. Keep weighting details secondary to the actual argument.

### 17. Separate authority, workflow, and provenance in the model

The imported status enum mixes evidence authority (“agreed on call”), work progress (“planned”), and history (“historical”). Production needs independent dimensions: lifecycle, provenance/review level, applicable configuration, documentation follow-through. This avoids implying that a source becoming documented means work is completed or approved.

### 18. Keep governance honest and secondary

Self-reported token balances and expertise are acceptable sandbox experiments, not verified voting inputs. The initial migration exposes broad public read policies and permits self-profile updates; it must be redesigned for the intended visibility model before real data is hosted.

The sandbox readout also labels grants “overrode” whenever their stored weighted rank is not 1, including synthesized outcomes for which that comparison is inapplicable. Show “Not applicable” rather than inventing an override.

Keep decision authority explicit; record rationale and dissent. If weighted ballots ship, define verified input sources and snapshot the weight basis at the relevant event. Don't let popularity silently become engineering approval. Leave payments and retro-reward automation out of the first usable release.

## Product-readiness work, not another feature list

- **Error recovery:** loading, empty, unavailable, stale, permission denied, offline, and failed save need distinct behavior. Preserve unsent drafts. Never silently replace broken user storage with fresh example data in the production path.
- **Export and portability:** Markdown for discussions/decisions, structured project export with source links, attachment manifests, and a tested restore route. The sandbox already exports work-package Markdown and prepares a GitHub issue; preserve that. Project-wide export/restore and universal thread export are still missing.
- **Operations:** stable hostname/HTTPS, reproducible deploys, environment isolation, observability, rollback, backups, and restore verification. Vite preview on a LAN port is the current delivery mechanism, not the final hosting design.
- **Maintainability:** one current product spec; mark historical prototype docs as such. Extract the large real-workspace component into routable views; consolidate duplicate legacy record pages. Add real-data and repository-review suites to the standard e2e command, which currently runs only sandbox suites.
- **Release proof:** targeted authorization, multi-user/concurrency, failed-network, migration, and restoration checks; retain existing domain tests and Markdown sanitization. No claim of a full security or accessibility audit from this review.

## Suggested build sequence

1. **Product polish:** this turn's copy cleanup, then navigation/context fixes, queue sorting, source library, typography/mobile density. No fake enabled actions.
2. **One real vertical slice:** sign in → discuss one imported Spearhead question → review an outcome → create work → submit evidence → accept it, shared between two accounts. Include roles, source provenance, history, and export in the slice.
3. **Team daily use:** watched items, inbox/digests, assignments, search, imports and repository reconciliation, attachments, failure recovery.
4. **Expansion after actual use:** richer artifact viewers/anchors, project comparisons, advanced voting and reward mechanisms. Keep explicit evidence that each adds value.

## Acceptance test for the product

Can a returning contributor answer within a minute: **What changed? What needs me? What is agreed? What can I do next?** Can a lead close one real question through accepted evidence without copying its history between tools?

Measure those outcomes, not record counts or an invented project-completion percentage.

## Verification and handoff

- Typecheck and production build passed; 130 unit tests passed.
- Browser suites passed: real data 61, repository review 20, conversation 31, design/work 53, sample data 37, briefing 46 — **248 checks** across the six suites. Sandbox suites require `BASE_URL='http://10.3.10.123:4193/?dataset=examples'`; real-data suites use the origin without that query. The first sandbox attempt incorrectly used the real-data default and was corrected. The subsequent LAN milestone failure was fixed and the affected suites passed.
- Desktop and mobile cleanup screenshots visually inspected; sampled mobile standalone navigation targets now measure 44px high.
- Delivered URLs: `http://10.3.10.123:4186/#/p/spearhead` and `http://10.3.10.123:4187/#/p/spearhead`. Both verified over LAN for HTTP/asset availability, cleaned shell, 23 source cards, 16 repository-review items, a result deep link, and zero page runtime errors. Refresh existing tabs.
- Both existing listeners still serve `prototypes/spec-threads/dist-real`; staging 4193 serves `dist-real-next`. The tested build was copied with assets first and the entrypoint last; earlier hashed assets remain for open tabs. Previous entrypoint: `/tmp/arrow-before-product-review-index.html`.
- Recovery: from `prototypes/spec-threads`, build with `VITE_PROJECT_DATA=spearhead npm run build -- --outDir dist-real`; preview with `node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port <port> --strictPort --outDir dist-real`. Existing listener logs remain `/tmp/arrow-real-preview-<port>.log`.
- Only the small changes listed above are implemented. Navigation-context bugs and the larger product backlog remain proposed work. No remote push, public deployment, backend activation, or project-data approval occurred.
