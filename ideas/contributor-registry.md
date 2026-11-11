# Contributor registry, onboarding and intro calls
Status: seed (mockups in `prototypes/registry-onboarding/`)
Raised by: Thomas, 2026-11-11. Builds on Gavin's onboarding quests and wizard (2026-09-22 and 23), his contributor map (Arrow-air/website#180) and `profiles-and-reputation.md`.

## The idea
One link that every way into Arrow points at (`app.arrowair.com/join?ref=…`), a three-minute profile, and a registry the core team can search when a project needs someone. A person on the team answers every profile, and some people get an intro call that Thomas or a lead starts. What the team learns goes into notes only the team can see, so the next assignment starts from it.

## Why it matters
X posts bring people in, and nothing writes them down. On 2026-11-11 Arrow's Discord had 1,651 members, 8 people had signed in to app.arrowair.com (the core team among them), and the contributor map had 2 entries in three months: Gavin and Alperen. The map's only sign-up is `/new-contributor`, a slash command people have to go looking for. Leads assign work from memory, and what anyone learned on a call stays in their head.

## How it might work

### Ways in
- The Discord welcome (Vector, or a small Arrow bot, on join), the site's Get involved and contributor map pages, a Contributing block in every repo README, and X posts all link to `/join` with a `ref` saying where it came from.
- Sign in with Discord, beside GitHub and email: most people arrive from Discord, and a linked Discord id lets the bot give a Registered role when the profile is done.

### The profile
Gavin's wizard pattern, one question a screen, with the questions from `profiles-and-reputation.md`:
1. What brings you here (design and engineer, build hardware near me, fly and test, write software, tell the story, govern and fund, just following). "Just following" skips the work questions, as in Gavin's wizard.
2. Disciplines from taxonomy v1.0, each marked can do or want to learn, plus experience.
3. "Tell us about something you've built, and what went wrong along the way." The one question the team really reads.
4. Place (city optional; the map shows city, country only, or nothing), the tools they can use (printers, CNC, lathe, soldering, spot welder, layup, a field to fly, their own aircraft), whether they'd build Arrow hardware (their own Quiver or pack, parts for the project, help at a build day, host one), and how far they'd travel.
5. Time, when, timezone, what they want out of it (learning, paid work, the mission, a job, a business around Arrow hardware), and anything they never want to be asked to do.
6. Links. These carry more weight than anything typed.
7. Who sees what, the map, and "open to a 20-minute intro call" with the windows that suit them.

Then a done screen with three matched starting points, and Your Arrow (the top bar's Contributor Dashboard): a short checklist (say hello in #introductions from a drafted message, come to a welcome call, do one real thing), matched work, and what happens next. No ARROW for onboarding steps (Q28); real work earns through retro grants, bounties and grants.

An agent may fill the profile (the question set published as a schema), and the person approves every answer before it's saved. No AI interview at the front door (DECISIONS 2026-09-17).

### Who sees what
| Level | Holds |
|---|---|
| Public | Name, city or country, local time, up to 3 disciplines, a 140-character blurb with no links: the map's existing rules |
| Signed-in members | The full profile: the story, links, tools, time, and what they've done in Arrow |
| Core team and leads | Notes, call notes, skill checks, call status, owner, next step |

People are told the team keeps notes from calls and reviews, and that they can ask to see them or have everything deleted.

### Intro calls
Three ways, not exclusive:
- **A. The team reaches out (recommended).** People opt in on the profile. A queue ranks them by signal (a story with specifics, links that check out, skills a project needs now, how long they've waited). Thomas or a lead sends a Discord DM in their own words, drafted from the person's story, with two or three times shown in the other person's zone.
- **B. Self-serve booking**, gated on a finished profile and a work link and capped at a few slots a week. Scales, but the calendar goes to whoever clicks first.
- **C. A weekly group welcome call** (Gavin's quest; earns the Member role). Everyone meets a person in week one, and it shows who to pick for A.

A and C together; B only if the queue outgrows the people writing. After a call, three prompts (good at, wants, next step) become a team note with status and "good for" tags.

### Matching
"Find people for…" from a project, thread, bounty or build day: disciplines (can do), tools, distance or willingness to travel, time. Results show why each person matched, including team notes. A person sends the invite. Saved views: new this week, open to a call, has a shop, near a build site, waiting on us, quiet 30+ days.

### Funnel
Joined Discord → opened `/join` → finished → heard from a person → intro call → did one real thing → active at 30 days, by `ref`. The number that keeps the promise honest is how many finished profiles have waited more than 7 days for a person.

### Data sketch
- `sa_profiles`: public-card fields, readable by anyone only where the person chose the map.
- `sa_profile_details`: the rest of the profile; members, the person and the team.
- `sa_person_notes` (note, call, review, skill check; earlier versions kept like `sa_comment_edits`), `sa_outreach` (status, owner, next step, invites) and `sa_skill_checks`: core and leads only.
- Every `sa_` table today gets the "sa public read" policy for anon. The private tables must stay out of that loop, with a rollback test in `supabase/tests/` that anon and members can't read them.
- Discord identity comes from `auth.identities`, never `user_metadata`, as GitHub's does (`20261024000000_sa_join_github_identity.sql`).
- The map: the registry exports people who chose the map to the website's `contributors.json` through the existing bot's GitHub App pull request, or the site reads the app's API at build. `/new-contributor` writes to the same table.

## Risks and tensions
- **The promise.** "A person reads every profile" fails quietly unless someone owns the queue. Owners per person, and the 7-day waiting count on the funnel.
- **Notes about people.** UK and EU contributors can ask for what we hold. Write notes as facts and what you saw, as if they'll read them; delete on request; nothing about health, politics or private life.
- **Said is cheap.** Agent-written stories all sound impressive. Self-reported skills carry no vote weight; links and earned work do. A team skill check is the bridge (Q9, Q10).
- **Farmers.** Paying for follows and intros attracts them (Q28), so onboarding steps pay nothing.
- **Two stores.** The map's JSON and the registry must not drift; one store, the map as a view.
- **One more place to look.** The registry has to be where Discord, the site and the repos send people, and Your Arrow has to earn the second visit with matched work.

## Open questions
Not yet numbered in `OPEN-QUESTIONS.md` (Q35 to Q40 are on an unpushed branch).
1. Intro calls: A, B, C, or A with C?
2. Tell people the team keeps notes on them? (The mockup says yes.)
3. Does a team skill check show on the public card as "checked by Arrow", and feed the expertise weight in votes?
4. Who counts as the team for notes: core and leads, leads only, or per project?
5. The map and `/new-contributor` become the registry's public face and second intake. Gavin's call as much as ours.
6. Any ARROW for onboarding steps? (Q28. The mockup says none.)

Related: Q9, Q10, Q19, Q28; `profiles-and-reputation.md`, `contributor-buckets.md`, `agent-matchmaking.md`, `personal-dashboard.md`, `sleety-app-shell.md`, `shell-contract.md` (gaps 8 and 9: people and onboarding).
