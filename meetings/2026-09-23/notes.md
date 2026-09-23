# Superapp call 3 (Spearhead Chat) — meeting notes

**Source:** `transcript.txt`, captured live by Hex in the Spearhead Chat voice channel (local Whisper, diarized by handle, UTC timestamps). First 3 minutes missed while the recorder was being set up. Whisper's silence hallucinations ("Thank you.") are stripped.
**Participants:** Gavin (sleety), Thomas (thomasg), Alperen (alperenag). Dow Fisher (KBM) joined at the very end. ~25 minutes.

## One-line summary

Contributions from outside the build team should target the **next** prototype, not the one in flight; the spec app should be organised around that. From there: a lifecycle from discussion → lead curation → spec / grant / defer at the freeze, retro $ARROW grants in two tiers (upvote-weighted and a proposer award when an idea becomes a grant), agents drafting grants out of the discussion, and using the tools on live Arrow projects from day one. Thomas takes it into the next spec-app iteration.

## Discussion

**Who is a contribution for? (Gavin → Alperen).** Gavin's proposal: while Alperen is finishing PT1.5, open the internals of the current prototypes and invite discussion *for PT2* — "have a look at what we did, here's what we'd change" — rather than pretending outsiders can help a build that is 30 days from done. Alperen: "anything can be useful… someone can think of something better than me," and it will "at least be a great experiment." Gavin: make this Arrow's default messaging for collaboration, so a newcomer's expectations are honest. Their input lands in the next version, not the current one, which stops it becoming noise for the team mid-build (Alperen's complaint from earlier calls).

**The freeze pipeline (Thomas).** Alperen leads PT1 (build, fly). In parallel the app holds the PT2 discussion. He up/downvotes and comments as it goes. When he sits down to design PT2, every thread gets resolved one of four ways: reject; promote to an official spec or requirement; turn into a bounty or grant; or push to PT3 because it isn't done being discussed. Example: a thread on gasoline-engine integration and what its PCB needs becomes, at the freeze, a bounty to design that PCB, with the spec already written by the discussion. Gavin: "better than I could have summarized it." Alperen (after unmuting): "it makes sense, a good way of doing it."

**Retro grants (Thomas, Gavin).** Take a bucket of $ARROW and retroactively grant the most upvoted / best ideas of a session, Coordinape-style. Gavin: the lead could break the aircraft into systems and weight the bucket per system ("you contributed to the PCB, that's worth this"). Open case: ideas that weren't adopted but shaped the decision — maybe just pay as the vote stands. Thomas's two tiers:
1. **Upvote-weighted award** for good ideas that didn't ship.
2. **Proposer award**: when a thread becomes a real grant or bounty, a slice of it (a quarter was floated) goes to whoever wrote the idea/spec, because "a big part of the work was just writing out that spec." Gavin: a multiplier on the idea.

**Grants that write themselves (Thomas, Alperen).** If the discussion did its job, the grant is already written by the time the lead promotes it: the PCB thread already says which voltages and interfaces. Goal: grants are emergent and semi-autonomous, so Alperen isn't writing them all as lead. Alperen: that is exactly what he wants Atlas (his agent) for. Thomas: the lead's agent reviews the thread, the lead says "take these, reject these, turn this into a grant." Gavin: the pre-PT2 discussion becomes "ready-made food for the agents"; without that corpus an agent solving the problem cold gives weak answers. Thomas's remaining worry: loose discussion → well-written grant is still the hazy step; AI can draft it, but something may be missing. Alperen: or pay the idea's author a little $ARROW to write it up properly. Thomas: he's thinking too far ahead toward fully autonomous; the lead keeps a hand in.

**Reputation (Gavin).** If people see their retro grants pay out, they'll offer more; trusted contributors emerge from that and can sit in on current-version discussions. "The ultimate meritocracy" if reputation is built from contribution.

**Quiver Mini (Alperen).** Re-run the Quiver Mini experiment with Vector now that models have moved on. Thomas: it wasn't good the first time, but yes, the same process could run on Quiver Mini.

**Dogfood it now (Gavin).** Whatever spec-app flow is picked, Arrow should use it immediately on real projects, clunky or not: "we have to practice it in the wild somewhere," and mistakes are cheaper on Spearhead than on the larger aircraft that follow. Accepted risk: some distraction for the Spearhead team.

**Specs app status (Thomas, Gavin).** Gavin's mockup was a visualisation aid to think with; he'd start over rather than build on it. Thomas keeps iterating his spec app ("I don't like the UI, but I'm not a UI guy"), now with the above as the brief. He re-shared this repo as the place for notes and open questions; Gavin will point an agent at it.

**Hex.** Thomas gated Hex in the Arrow server so only he can mention it; offered to whitelist Gavin. Alperen may try the same recorder pattern with Atlas.

## Decisions

- Open contributions target the next prototype (PT2 while PT1 builds). Say so in Arrow's default collaboration messaging.
- At the PT2 freeze the lead resolves every thread: reject / promote to spec / grant or bounty / defer to PT3.
- Try retro $ARROW grants, two tiers: upvote-weighted, plus a proposer award carved from any grant an idea becomes.
- Use the coordination tools on live Arrow projects (Spearhead now, Quiver Mini next) rather than waiting for a polished version.
- Thomas's spec app is the next iteration; Gavin's mockup is not a base.

## Action items

- **Thomas:** next spec-app iteration around version-targeted threads, the freeze pipeline, and the two-tier retro. See `prototypes/spec-threads/ROADMAP.md` → "Next iteration".
- **Gavin:** agent pass over this repo for open questions and ideas; back after dinner to keep working.
- **Alperen:** think about Atlas reviewing PT2 threads and drafting grants; Quiver Mini re-run with Vector.
- **Thomas:** whitelist Gavin for Hex if he wants it.

## New or sharpened open questions

- Q30 Loose discussion → fundable grant: who writes the final text, the lead's agent, the idea's author for a small fee, or the thread itself by construction?
- Q31 Retro tiers: how are ideas that shaped a decision but were not adopted rewarded, and is a per-system token split the right frame?
- Q32 Dogfooding on Spearhead mid-build: how much distraction is acceptable, and who calls it?
