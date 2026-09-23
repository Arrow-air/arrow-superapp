# Roadmap: a conversation tool of our own

> **Paused, 2026-09-18.** Thomas: keep working through the ideas and concepts before diving into engineering. Nothing here is scheduled. The concept work is happening in the [discussions](https://github.com/Arrow-air/arrow-superapp/discussions) and `ideas/`, and it has already changed the shape: see `ideas/decision-register.md` and the revisions in `ideas/spec-thread-to-bounty.md`. Revise this roadmap after that settles.

**Decision (Thomas, 2026-09-18):** build the full conversation tool ourselves rather than layering on GitHub Discussions. Assume engineering effort is not the constraint. If we build it all and still can't justify it over GitHub Discussions, we shift back.

That fallback only stays cheap if we design for it, so two rules hold from day one:

1. **Every thread exports** to plain markdown and to a GitHub Discussion, at any time.
2. **We decide now how we'd know it isn't justified** (see "The test" at the bottom), not after we're attached to it.

## Next iteration — brief from the 2026-09-23 call

Thomas is taking these into the next spec-app iteration. They reshape the thread model more than the UI; see `meetings/2026-09-23/notes.md`.

1. **Threads are addressed to a version.** Each project shows the version in build (PT1) and the version in discussion (PT2). New threads default to the discussion version. Front page copy says outside contributions land in the next version. (`ideas/next-version-contributions.md`)
2. **Lead actions on a thread, all the time:** upvote/downvote, comment. The lead is a reader during the discussion, not a gate.
3. **The freeze.** A per-version "freeze" screen lists every open thread and forces one of four resolutions: reject (with a line of why), promote to spec/requirement (writes a decision to the register), turn into a grant or bounty (pre-fills the grant from the thread), defer to the next version (thread re-targets, keeps history). A version can't be frozen with unresolved threads.
4. **Grant drafts from threads.** The "turn into grant" action produces a draft: title, scope, interfaces/constraints extracted from the thread, proposer(s) with attribution. Human edits before it is real. Q30 is whether this draft is good enough, or the proposer is paid to finish it.
5. **Retro session award.** At freeze, a bucket per version (optionally pre-split by aircraft system) is allocated across threads by weighted votes; the lead can correct before it's published. No tokens move in the prototype; the app shows the allocation.
6. **Proposer award.** A grant created from a thread carries a `proposerShare` (default 25%) and the proposer(s) it goes to. Shown on the grant, carried into `grant-and-bounties` hand-off later.
7. **Two test projects.** Spearhead PT2 as the live one; Quiver Mini as the re-run of the earlier experiment (Alperen's suggestion), possibly with Vector seeding threads from the repos.
8. **Dogfood immediately.** Once threads can be version-targeted and frozen, use it for real Spearhead PT2 discussion even in demo-quality UI. Everything else in the sequence below still stands, but this is what gets built next.

## What has to be true for this to earn its place

Matching GitHub Discussions feature for feature is table stakes and justifies nothing. The tool is justified by the things a general-purpose forum structurally cannot do:

1. **Threads attach to the work.** A thread anchors to an artifact: a part in the CAD viewer, a region or net on a PCB, a line of firmware, a sentence in a doc (the Google Docs highlight-and-comment model). It renders wherever that artifact is shown through an embeddable widget. The app is the index across all threads, not the place you must go. See `ideas/discussion-at-the-work.md`.
2. **Contributions are typed, not flat.** A reply is a spec, an amendment, an objection, evidence (a test result, a flight log, a measurement), a question, or a short expert hint. Structure lets the tool compute things a forum can't: unresolved objections, unanswered questions, which spec has evidence behind it.
3. **Specs evolve with attribution.** Specs are versioned. An amendment is a diff with an author. This gives a data trail for the hard retro-reward case from the 2026-09-17 call: weeks of groundwork versus one small decisive edit (Q5).
4. **Ballots are deliberate.** Separate from reactions. Weighted, visible at the moment of voting, locked when the lead decides, with full history. Later: wallet-signed messages in the Snapshot model, so token weight is verifiable and the record doesn't depend on any platform.
5. **Decisions have a lifecycle and leave a record.** open → converging → decided → bounty → built → verified. The decision, the tallies, and the lead's rationale are written into the project repo automatically.
6. **Identity is Arrow's.** One Arrow account, per-project roles, reputation from shipped work, and room for operators and ranchers who will never have a GitHub account.
7. **Agents are first-class and labeled.** They brief, draft, summarize, and match people to needs on someone's behalf. They are always marked as agents and never cast a silent vote (Q3, Q4).
8. **Catch-up is built in.** "What changed since you last looked," per-thread summaries, and a digest. This is the single picture of Arrow from the original journal notes.

## Sequence

| Phase | What | Why this order |
|---|---|---|
| 0 | Real shared backend and Arrow account sign-in. Replace demo mode as the default. | Nothing else is real until people share state. |
| 1 | Conversation core: threaded replies, edit with history, mentions, acknowledgement reactions (separate from ballots), realtime updates, notifications (in-app, email, Discord), moderation, search. | Table stakes. If this is worse than GitHub, nobody comes, and nothing above gets tested. |
| 2 | Typed contributions, spec versions, amendments as attributed diffs, objections that must be answered or waived before promotion. | First thing GitHub cannot do. Makes threads converge instead of sprawl. |
| 3 | Anchors and the embeddable thread widget. First host: the Quiver Three.js viewer, one thread per component. Second host: text-range anchors in docs. | The core of the thesis. Needs stable IDs per artifact type and a "this moved" state. |
| 4 | Decision lifecycle and automatic decision records in the project repo. Bounty hand-off to `grant-and-bounties`. | Closes the loop from talk to work. |
| 5 | Wallet link and signed ballots. Verified token weight. | Removes the self-reported balance, the weakest part of prototype 1. |
| 6 | Agents: briefs, drafts, digests, matchmaking. | Only useful once there is real activity to summarize. |
| 7 | Retro rewards computed from the contribution graph (specs, amendments, evidence, answered objections). | Depends on everything above being real data. |

Carried over unchanged from prototype 1: the weighting formula, tallies, promotion rules, the readout, the vote bars and pick comparison, the test suite.

Retired when phase 1 lands: the giscus pins. They stay until then so feedback on the prototype has somewhere to go.

## The test

After phase 3, run real medium-sized decisions through it, and at least one comparable decision through plain GitHub Discussions as a control. Look at:

- Did people who are not core contributors take part? How many, and did they come back?
- Did the thread surface information the lead did not already have?
- Time from need posted to decision made.
- Did anyone use an anchor from inside the CAD viewer or a board, or did everyone go to the app anyway?
- Would the lead choose it again for the next decision, unprompted?

If the answers don't beat the control, we export the threads and go back to GitHub Discussions with a thin ballot layer.
