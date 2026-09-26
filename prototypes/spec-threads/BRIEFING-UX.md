# Comprehension pass: a project people can follow

2026-09-26 · `design-work-v1` · browser-local prototype.

## What changed

- **Overview replaces Aircraft as the landing page.** Selected-version briefing: submitted work needing review, decisions awaiting specification updates, stale specifications, work in motion, open questions, and unassigned opportunities. Lead/contributor copy and assignment emphasis follow the chosen persona. No stored summary or new contribution surface.
- **Subsystem stories:** current decisions and rationale, work with its next step, source result links, open conversations, and historical work. Relationships are derived from source discussions and linked decisions; research without design adoption remains valid. Aircraft map remains available in a disclosure and opens the same subsystem views.
- **Work by intent:** Active work (default), Needs review, My work, Open opportunities (open/unassigned), All work, History (completed/cancelled). Search stays visible; advanced filters are behind Filter, with an applied-filter count and Clear action. Queue selection is URL-addressable. All versions remains an advanced option. Cards emphasize title, state, responsible person, and next step; opportunity cards expose amount and funding. Completion and payment remain separate.
- **Read before editing:** readable scope, acceptance criteria, milestone status and evidence precede collapsed progress controls. Contextual next-step button opens existing permission-checked controls; it does not perform a status transition. Draft scope editing is opt-in, and saves return to reading. Source snapshots, history and export remain accessible on demand.
- **Design:** current subsystem specification is primary. Adopted records are below in a disclosure; history remains a separate view. Pending-specification notices respect the selected subsystem. Decision pages lead with rationale/document and offer work evidence on demand.

No schema migration or reset. The one-conversation → reviewed draft model, role restrictions, stale-write protections, source snapshots and frozen baselines are unchanged. No AI summaries, payment execution or shared backend added.

## Try it

- `http://10.3.10.123:4186/#/p/spearhead` — project briefing.
- `http://10.3.10.123:4186/#/p/spearhead?system=avionics` — connected design/result/work story.
- `http://10.3.10.123:4186/#/p/spearhead?view=work&queue=review` — pending reviews.

The same routes work on port 4187. Existing saved routes and localStorage origin remain intact; refresh to load the new build.

## Verification

- `npm run typecheck`
- `npm test` — 120 unit tests, including projection boundaries, current vs replaced decisions, cross-system work links, and funding distinctions.
- `npm run build -- --outDir dist-briefing`
- `BASE_URL=http://localhost:4190/ npm run e2e` — conversation, records, samples, then briefing walkthroughs. Isolated Chrome contexts; never the user's saved browser.
- Screenshots: `/tmp/arrow-briefing-review/`. Desktop/tablet/phone layouts, persona changes, accepting a submission updating the briefing/history, read-first controls, filters, frozen version and empty-project behavior.

## Preview recovery

Both existing endpoints (4186 / 4187) serve `dist-briefing`. Prior `dist-samples`, `dist-records`, `dist-conversation`, and `dist-brief` retained. Staging: 4190.

From this directory: `node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port 4186 --strictPort --outDir dist-briefing` (use 4187 for the second endpoint). Detached preview logs: `/tmp/arrow-briefing-preview-<port>.log`. Identify exact listener, working directory and build before restarting; do not reset storage or silently fall back to another port.
