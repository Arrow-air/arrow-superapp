# Contributor registry and onboarding (mockups)

**Question:** if every way into Arrow (a welcome DM from a person on the team, the site, repo READMEs, X posts) points at one three-minute profile that starts with "what do you want to build?", and a person on the team answers every one, do newcomers stay and find work? And when a project needs someone, can the team find them, including people who haven't signed up yet?

Static, clickable mockups with invented people. No backend, no accounts. Open `index.html`. Made for Thomas on 2026-11-11 and revised the same day with his answers (rev 2). The idea itself, with what's decided, is in [`ideas/contributor-registry.md`](../../ideas/contributor-registry.md).

| Screen | Seen by | What it shows |
|---|---|---|
| Read me | | The gap in numbers (real, Nov 11), what's decided, the loop, what's reused from Gavin's work, who sees what |
| 1 Ways in | newcomer | A welcome DM from Thomas (or whichever core member's turn it is), the site, a README and an X post, all pointing at `/join?ref=…` |
| 2 Join | newcomer | The wizard, filled in as Maya: sign in (Discord added), **what do you want to build?**, can do and want to learn, the story question, place and tools, time and wants, links, who sees what, done. `#join/0?invite=rosa` is how an invite from the team opens |
| 3 Your Arrow | newcomer | The next day: what she wants to build, a checklist with no token rewards, matched work, what happens next, her card |
| 4 Registry | team | Saved views, filters, list (with what each person wants to build) and map, "Find people for…" a build day, a "same person?" match for a lead to settle |
| 5 Person + notes | team | Said (what they want to build, their story), linked and earned kept apart; a team-only panel: owner, status, next step, skill checks, notes, history |
| 6 Reach out | team | **Say hi:** everyone who joined Discord and hasn't been greeted, a DM drafted for whoever's turn it is, sent from their own account. **Intro calls:** the people the team picked, an invite drafted from their story or the team's note, logging the call. The scheduled welcome call sits above both |
| 7 Funnel | team | Where people drop off, which refs bring people who stay (welcome DMs and team invites included), and whether "a person reads every profile" holds |
| 8 Add a person | team | Add someone with no account yet: the form (with a duplicate check), right-click in Discord, suggestions from Arrow's repos, and how a record finds its person when they join. Adding one really works in the mockup, until you reload |

**Built on:** Gavin's onboarding wizard and quests (Arrow-air/website branch `sl33ty/explore/superapp`, 2026-09-22 and 23), his contributor map and `/new-contributor` bot (website issue #180), the disciplines taxonomy v1.0 (website `src/data/disciplines.json`, his category colours), his open PR #254 (a live grid of everyone with commits in Arrow's repos), and [`ideas/profiles-and-reputation.md`](../../ideas/profiles-and-reputation.md) (said, linked, earned; the "something you built" question; per-field visibility). Colours and frame are the app's own (`app/src/styles/tokens.css`).

**Worked would look like:** most people who join Discord hear from a person within a day or two and open `/join`; most who open it finish; everyone who finishes hears from a person within a week; and the next time a lead needs a pack builder or a pilot near a build, "Find people" names someone they hadn't met, or someone the team met once and wrote down.

## Rebuild

`src.html` is the page; `tools/build.py` draws the dotted land into it from the contributor map's own geometry, so dots sit where Gavin's map puts them:

```
git -C path/to/website show origin/main:src/data/world-map-geometry.json > /tmp/geo.json
python3 tools/build.py /tmp/geo.json
```
