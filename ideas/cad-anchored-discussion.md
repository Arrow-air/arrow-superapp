# CAD-anchored discussion
Status: seed
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
