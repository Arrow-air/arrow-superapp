# CAD-anchored discussion
Status: prototyping (Aircraft tab at specs.arrowair.com)
Raised by: Thomas journal 9/12; Gavin's exploded-view viewer 2026-09-17

## The idea
Discuss designs around the actual geometry. Exploded-view 3D viewer, per-component discussion threads, version branching, view aircraft variants with different systems. Downstream: animated assembly and harness guides.

## Why it matters
Arguing over screenshots loses information. Menlo's Asimov robot viewer shows community pull toward this. The Quiver Three.js viewer proves it's feasible.

## How it might work
Start from the Quiver Three.js viewer. Not a CAD tool; people still design elsewhere. Thread anchors on component IDs and versions.

## Risks and tensions
Big scope. Much of Arrow's CAD is still in Fusion, not Git. Keep it a later layer, not v1.

## Open questions
Q12, Q13


## Update 2026-09-22
Gavin's shell has a 3D Quiver overview where each subassembly is a gateway to bounties and an improve-this flow; ours anchors on BOM ids. Both agree this is where discussion belongs. New wrinkle from Thomas: people would rather fork than comment. So a part that is still being designed (a new attachment interface, Caribou's structure) needs to hold several candidates side by side, with comments on corners of each candidate, and a way to compare them. See Q27.

## Update 2026-09-28: built, and where the line sits (Thomas and Hex)
The workspace now has an **Aircraft** tab: the Spearhead model (Build123D reconstruction of the Fusion structures, `project-spearhead` branch `hex/build123d-fusion-aircraft`) with discussions anchored to a part, its component, or its subsystem. Parts under open discussion are highlighted, and every anchored discussion links back to its part.

**Comparing candidates (Q27) without rebuilding GitHub.** GitHub owns the artifacts and the merge: branches, commits, review, CI, history. The app owns the decision, meaning which candidate, why, who supported it with what weight, what goes into the spec, what work and rewards follow. A PR can't hold three competing candidates as peers, can't carry weighted support tied to money, and asks reviewers to read two branches of STEP files, which is a headache even for an experienced lead.

1. **A candidate is a Git ref.** A contribution attaches a branch or commit in the project repo. The repo's CI exports the web model plus a per-part manifest (name, geometry fingerprint) on every push.
2. **The app shows a compare view.** Two candidates side by side or overlaid, with changed, added, and removed parts highlighted from the manifests, and discussion anchored to parts on either candidate.
3. **Settling picks a commit.** The decision records the chosen ref; the merge happens in GitHub, linked both ways. A bot can post the settled decision to the PR so GitHub keeps the record.

**Users and manufacturers weigh in here.** A manufacturer sees "we can't cut that radius" or "that joint needs a jig we don't have" in a way a design review won't. Operators see field repair and transport. The lead can verify manufacturing or operations expertise so their support counts more on exactly those discussions, which gives manufacturers a reason to show up before they're asked to build.

**The test:** if leads still do the real review in GitHub and the compare view is a pretty detour, keep only the decision layer. Build step 2 when someone actually forks a part; step 1 is worth having regardless, because it keeps the Aircraft tab current without hand conversion.

