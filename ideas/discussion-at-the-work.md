# Discussion lives at the work
Status: exploring
Raised by: Thomas, 2026-09-18, while reviewing prototype 1

## The idea
A thread should attach to the piece of work it is about and show up wherever that work is shown: beside the part in the CAD viewer, on the PCB layout, on the line of firmware, on the section of a doc. The superapp is then the index across all those threads, not the one place you must go to talk.

## Why it matters
Prototype 1 made the problem visible. To discuss a power budget you leave the board layout and go to a separate site. To discuss the prototype itself we had to bolt a comment system onto it. That is the scattered-state problem from the original journal notes, rebuilt. Discussion far from the work loses context, and people don't make the trip.

## How it might work
- A thread has an **anchor**: a URL to the artifact plus an optional selector. Examples: repo + path + line range; CAD model + component ID; KiCad board + reference designator or net; doc + heading.
- The thread **renders anywhere** through a small embeddable widget that takes an anchor and shows the thread, its weighted tally, and its status.
- The superapp lists every thread across every artifact, filtered by project, status, and "needs your vote." It answers "what is being decided at Arrow right now" without being where the deciding happens.
- Storage can be boring. The giscus pins in prototype 1 already do a small version of this: the conversation is stored in GitHub Discussions and rendered next to the feature it is about. The same thread could render in the Quiver Three.js viewer.
- A need in spec-threads gains an optional anchor, and the thread page shows the artifact (or a link into it) at the top.

## Risks and tensions
- Anchors rot. Parts get renumbered, lines move, boards get re-laid-out. Anchors need a stable ID scheme per artifact type, and a graceful "this moved" state.
- Much of Arrow's CAD is still in Fusion, not in Git or a web viewer. You can't embed a widget in Fusion. Web-viewable exports come first.
- Weighted voting inside an embedded widget means identity and token weight must travel with the widget. That leans on the single Arrow account idea.
- Every host surface (viewer, docs, GitHub) needs its own small integration. Start with one.

## Open questions
Q15. Related: `cad-anchored-discussion.md`, `single-view-of-arrow.md`, `spec-thread-to-bounty.md`.
