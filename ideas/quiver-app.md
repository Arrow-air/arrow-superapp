# One app for one aircraft: Quiver
Status: exploring
Raised by: Thomas, 2026-09-18

## The idea
Stop designing in the abstract. Take Quiver and imagine one app that is the front door to the whole aircraft: the design, the decisions, the work, the money, the flights, the docs, and the people. A superset of the ideas in this repo, tested against a real project.

## What a survey of the Quiver repos found (2026-09-18)
Quiver already runs on rough versions of most of what we have been designing. The pieces exist. They are scattered across files, issue labels, and a docs site, and nothing joins them.

| We were imagining | Quiver already has |
|---|---|
| A decision register | **T-09**, a funded task to write one: `D-001` upward, with decision, what it replaced, why, evidence link, and status (standing, superseded, open). Same columns we proposed. |
| Stable anchors for parts | A **numbered BOM** in YAML: `1000` airframe, `2000` supporting structure, `3000` equipment, `4000` harness. Every part has an ID (`1111` Upper Plate), material, cost, supplier, and a `design_ref` to its STEP file. |
| CAD you can show on the web | CAD is **build123d Python** in `src/quiver`, one STEP per part. It can export to a web 3D format. Not trapped in Fusion. |
| PCB you can show on the web | **Four KiCad boards** in `src/pcb` (main, flight controller, battery, attachment). An open-source viewer, KiCanvas, renders KiCad files in a browser with clickable components. |
| Task board and bounties | **T-01 to T-18** as issues: price, funding line, owner, reviewers, milestones, deadline, "done when". An unpaid sample is the application. `claimable` label for open ones. |
| Funds flow | **Funding lines as labels**: `fund-QGB-01` Documentation, `QGB-03` Endurance Study, `QGB-05` Attachment Development, `QGB-FLEX`, `fund-checkpoint` (priced at the October checkpoint), `fund-retro` (monthly retroactive $ARROW). |
| Open decisions needing input | **T-01** Battery failsafe posture, "yes or no". **#234** Attachment interface power: the 12 V payload rail is about 13 W shared and high-power attachments need a real power path. Prototype 1's made-up seed thread is a real open issue. |
| Flight evidence | `flight-test/` logs for PT1 to PT3, a 20 hour flight plan, and the live database behind flights.arrowair.com. |
| Docs people should comment on | Assembly guides, configuration guide, Pilot's Handbook, Attachment Developer Guide. **T-16** is literally "configure one unit from the guide alone, file every gap." |

So the app should not invent new process. It should render what exists, join it on the BOM numbering, and add the one layer that is missing: discussion, weighted input, and decisions attached to the thing they are about.

## The app, by section

**Home: what needs you, what changed.** Open decisions where your input counts. Claimable tasks that match your skills. What changed since you last looked: parts revised, decisions made, tasks paid, flights flown.

**Aircraft.** The 3D model, explodable, straight from the repo's CAD. Click a part and get its page: BOM row (ID, material, cost, supplier, STEP download), the decisions that shaped it, open threads about it, tasks touching it, and flight incidents that mention it. The BOM ID is the anchor. This is "discussion at the work."

**Boards.** The four PCBs in an interactive viewer. Click a component or net, same side panel as a part.

**Decisions.** The register. Standing, superseded, open. Each standing decision shows why and its evidence. Each open one is a thread with positions and a signal-weighted vote, the lead's call, and a published rationale when they override. Decisions link to what they depend on, so reopening payload flags endurance.

**Work.** The task board as it exists: price, funding line, owner, reviewers, milestones. Claim a task by posting the sample. New tasks get their spec **written together**: one document, suggested edits, inline comments, visible attribution. That history feeds the spec author reward.

**Money.** Each funding line: budget, committed, paid, remaining. The monthly retro $ARROW pool and how it was split. Who was paid for what, linked to the task and the merged work. Token-weighted votes live here: which lines get budget, which proposal gets funded.

**Flights.** Fleet by unit and location, hours, the reliability metrics T-14 asks for, progress against the 20 hour plan. Incidents link to parts and to the decisions they triggered.

**Build and operate.** The guides, with comments on a sentence. "This step is missing a torque value" attaches to the step. T-16's gap filing becomes a side effect of reading.

**Attachments.** Catalog, SDK, payload template, the developer guide, and what people have built in the field and where.

**People.** Lead, reviewers, contributors, operators, builders. Skills, location, what they shipped, what they fly. Roles per project. Builder status backed by flight and build history instead of a checkbox.

## How to demo it honestly
A clickable front end with **real read-only data** pulled from the repo at build time (BOM, issues, labels, docs) and **clearly marked pretend interactions** on top (votes, comments, claims). Real material keeps the demo honest and makes the gaps obvious. No backend yet.

## Risks and tensions
- This is the superapp scope warning from day one, concentrated. The defence is that every section renders something that already exists. Anything that needs new process to feed it should be cut.
- Real names appear in issues and tasks. They are already public, but the demo should not put invented words or votes in real people's mouths.
- A beautiful front door onto stale data is worse than none. Everything shown must come from the repo, not from a copy.
- Quiver's leads already have a working system. The app has to make their week easier, or it is decoration.

## Open questions
Q24. Related: nearly every idea in this folder.


## Update 2026-09-22
First clickable version built (`prototypes/quiver-app`, 2026-09-18). On the call Thomas restated the centre of gravity: the drone is done, Quiver needs attachments, software and a route to market, and Gavin's shell doesn't capture that yet. Likely merge: Gavin's onboarding and project shell outside, this app's pages inside. Erick would use Overview/Components/Tasks/Team today and populate Tasks with his open issues.
