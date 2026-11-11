# Contributor registry and onboarding (mockups)

**Question:** if every way into Arrow (the Discord welcome, the site, repo READMEs, X posts) points at one three-minute profile, and a person on the team answers every one, do newcomers stay and find work? And when a project needs someone, can the team find them?

Static, clickable mockups with twelve invented people. No backend, no accounts. Open `index.html`. Made for Thomas on 2026-11-11; nothing here is decided. The idea itself is in [`ideas/contributor-registry.md`](../../ideas/contributor-registry.md).

| Screen | Seen by | What it shows |
|---|---|---|
| Read me | | The gap in numbers, the loop, what's reused from Gavin's work, who sees what |
| 1 Ways in | newcomer | The Discord welcome, the site, a README and an X post, all pointing at `/join?ref=…` |
| 2 Join | newcomer | The wizard, filled in as Maya: sign in (Discord added), what brings you here, can do and want to learn, the story question, place and tools, time and wants, links, who sees what, done |
| 3 Your Arrow | newcomer | The next day: a checklist with no token rewards, matched work, what happens next, her card |
| 4 Registry | team | Saved views, filters, list and map (people close together share a dot), "Find people for…" a build day |
| 5 Person + notes | team | Said, linked and earned kept apart; a team-only panel: owner, status, next step, skill checks, notes, history |
| 6 Intro calls | team | Three ways to run them, the queue, an invite drafted from the person's story and sent from Thomas's Discord, logging the call |
| 7 Funnel | team | Where people drop off, which refs bring people who stay, and whether "a person reads every profile" holds |

**Built on:** Gavin's onboarding wizard and quests (Arrow-air/website branch `sl33ty/explore/superapp`, 2026-09-22 and 23), his contributor map and `/new-contributor` bot (website issue #180), the disciplines taxonomy v1.0 (website `src/data/disciplines.json`, his category colours), his open PR #254 (a live grid of everyone with commits in Arrow's repos), and [`ideas/profiles-and-reputation.md`](../../ideas/profiles-and-reputation.md) (said, linked, earned; the "something you built" question; per-field visibility). Colours and frame are the app's own (`app/src/styles/tokens.css`).

**Worked would look like:** most people who join Discord open `/join`; most who open it finish; everyone who finishes hears from a person within a week; and the next time a lead needs a pack builder or a pilot near a build, "Find people" names someone they hadn't met.

## Rebuild

`src.html` is the page; `tools/build.py` draws the dotted land into it from the contributor map's own geometry, so dots sit where Gavin's map puts them:

```
git -C path/to/website show origin/main:src/data/world-map-geometry.json > /tmp/geo.json
python3 tools/build.py /tmp/geo.json
```
