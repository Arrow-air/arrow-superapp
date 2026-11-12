# Contributor registry, onboarding and reaching out
Status: seed, with Thomas's first calls made (mockups rev 2 in `prototypes/registry-onboarding/`)
Raised by: Thomas, 2026-11-11. Builds on Gavin's onboarding quests and wizard (2026-09-22 and 23), his contributor map (Arrow-air/website#180) and `profiles-and-reputation.md`.

## The idea
One link that every way into Arrow points at (`app.arrowair.com/join?ref=…`), a three-minute profile that starts with "what do you want to build?", and a registry the core team can search when a project needs someone. A person on the team answers every profile: everyone who joins Discord gets a welcome DM from a core member, and some people get an intro call. The team can also add people who haven't signed up. What the team learns goes into notes only the team can see, so the next assignment starts from it.

## Why it matters
X posts bring people in, and nothing writes them down. On 2026-11-11 Arrow's Discord had 1,651 members, 8 people had signed in to app.arrowair.com (the core team among them), and the contributor map had 2 entries in three months: Gavin and Alperen. Of the 17 people with commits in Arrow's 8 main repos, 9 had never signed in to the app. The map's only sign-up is `/new-contributor`, a slash command people have to go looking for. Leads assign work from memory, and what anyone learned on a call stays in their head.

## Decided (Thomas, 2026-11-11)
- **Intro calls:** the team reaches out to the people it picks, plus scheduled welcome calls for everyone new. No self-serve booking.
- **The Discord welcome is a DM from Thomas or a core member, not a bot.** It prompts the profile and offers a call.
- **The form drives toward "tell us what you want to build"** and keeps coming back to it.
- **Core and leads can add a person to the registry before they have an account.**
- **No ARROW for onboarding steps for now**; maybe in a later release (Q28).
- **The profile copy doesn't mention the team's notes, for now.**

## How it might work

### Ways in
- **A welcome DM from a person.** The bot (it needs the Server Members intent) sees each join and hands the new member to whoever's turn it is: a weekly rotation of core members, by time zone. The app drafts the DM: welcome, "what do you want to build? tell us here" with a `ref=dm-<sender>` link, and the next welcome call as a Discord timestamp (`<t:…:F>`), which shows in the reader's own time zone, or "reply and we'll find 20 minutes". If they posted in #introductions, the first line answers that post. The core member sends it from their own account: Discord forbids automating personal accounts, so the app copies the message and opens the DM, and a person presses send. Joins that look like bots (new account, no avatar, no intro) are offered as a skip.
- The site's Get involved and contributor map pages, a Contributing block in every repo README, and X posts all link to `/join` with a `ref` saying where it came from. A separate Discord invite per post would also tell the bot which post brought someone (it can compare invite use counts on each join).
- Sign in with Discord, beside GitHub and email: most people arrive from Discord, and a linked Discord id lets the bot give a Registered role when the profile is done.

### The profile
Gavin's wizard pattern, one question a screen, with the questions from `profiles-and-reputation.md`:
1. **What do you want to build?** In their own words, a sentence or two, then what fits them (design and engineer, build hardware near me, fly and test, write software, tell the story, govern and fund, just following). "Just following" skips the work questions, as in Gavin's wizard. The answer is the first line on their profile, in the registry list, in matching and in the DMs the team sends them.
2. Disciplines from taxonomy v1.0, each marked can do or want to learn, plus experience.
3. "Tell us about something you've built, and what went wrong along the way." The one question the team reads closest.
4. Place (city optional; the map shows city, country only, or nothing), the tools they can use (printers, CNC, lathe, soldering, spot welder, layup, a field to fly, their own aircraft), whether they'd build Arrow hardware (their own Quiver or pack, parts for the project, help at a build day, host one), and how far they'd travel.
5. Time, when, timezone, what they want out of it (learning, paid work, the mission, a job, a business around Arrow hardware), and anything they never want to be asked to do.
6. Links. These carry more weight than anything typed.
7. Who sees what, the map, and "open to a 20-minute intro call" with the windows that suit them.

Then a done screen with three matched starting points, and Your Arrow (the top bar's Contributor Dashboard): a short checklist (say hello in #introductions from a drafted message, come to a welcome call, do one real thing), matched work, and what happens next. No ARROW for onboarding steps; real work earns through retro grants, bounties and grants.

An agent may fill the profile (the question set published as a schema), and the person approves every answer before it's saved. No AI interview at the front door (DECISIONS 2026-09-17).

### Who sees what
| Level | Holds |
|---|---|
| Public | Name, city or country, local time, up to 3 disciplines, a 140-character blurb with no links: the map's existing rules |
| Signed-in members | The full profile: what they want to build, the story, links, tools, time, and what they've done in Arrow |
| Core team and leads | Notes, call notes, skill checks, call status, owner, next step, and people the team added who have no account yet |

### People the team adds
Core and leads can add someone who hasn't signed up: met at a build day, helping in Discord, already in the repos. Some never will, like a shop that machines parts for us; the record stays team-only.
- **Three ways in:** a form in the app (name and where you know them from are required, so every record says where it came from; handles, email, place, a guess at their skills, tools, owner, a first note, "put them in the intro-call queue"); right-click a member in Discord, then Apps, then "Add to Arrow registry" (a user command; the bot only answers core and leads); and suggestions from Arrow's repos, everyone with commits and no record (the list PR #254 reads), offered one at a time for someone to Add or Skip.
- **Duplicate check** on name, Discord and GitHub before anything is saved.
- **Team-only until they join.** Not on the map, invisible to members. The skills the team enters are a guess and look like one; they never fill the person's Said layer.
- **How a record finds its person:** their Discord or GitHub account links it the first time they sign in. Both ids are resolved and saved when the record is made (the bot's guild member search for Discord, the GitHub API for a login), so a handle someone else takes later gets nothing. The email on the record links it once they confirm the address (a link we email, or GitHub verified it): the forum sign-in's rule. Anything weaker (the same name, a handle we couldn't resolve, an invite link they forwarded) gives a lead a "same person?" card to settle.
- When it links, their own answers fill Said; the team's guesses and notes stay in the team panel; earned work (commits, PRs) is already there; and the map is their choice.
- A personal invite ("Invite to join") is drafted from the record and sent from the inviter's own Discord or email, with a link that names the record.
- Suggested default: unclaimed records nobody has touched in a year come up for review or deletion.

### Reaching out
One team page, two queues, both sent by a person:
- **Say hi:** everyone who joined Discord and hasn't been greeted (above).
- **Intro calls:** people who opted in, and people the team added, ranked by signal (a story with specifics, links that check out, skills a project needs now, how long they've waited). Thomas or a lead sends a Discord DM in their own words, drafted from the person's story or the team's note, with two or three times shown in the other person's zone. After a call, three prompts (good at, wants, next step) become a team note with status and "good for" tags.
- **Welcome calls**, scheduled, for everyone new: 30 minutes, host rotates, coming to one gives the Member role. Suggested: alternate the time week to week so Asia and the Pacific get one.

### Matching
"Find people for…" from a project, thread, bounty or build day: disciplines (can do, or the team's guess for people it added), tools, distance or willingness to travel, time. Results show why each person matched, including team notes. A person sends the invite. Saved views: new this week, open to a call, has a shop, near a build site, waiting on us, quiet 30+ days, added by the team.

### Funnel
Joined Discord → got a welcome DM → opened `/join` → finished → heard from a person → welcome call → intro call → did one real thing → active at 30 days, by `ref` (including `dm-<sender>` and team invites). The number that keeps the promise honest is how many finished profiles have waited more than 7 days for a person.

### Data sketch
- `sa_people`: one row per person, account or not. `user_id` (nullable, unique, set when they join or a lead links them), `discord_id` and `github_id` (resolved ids, unique), `email` (team-only), `source` (where we know them from, or the `ref` they came by), `added_by`, `claimed_at`.
- `sa_profiles`: what they said, keyed by person; public-card fields readable by anyone only where they chose the map.
- `sa_person_notes` (note, call, review, skill check; earlier versions kept like `sa_comment_edits`), `sa_outreach` (status, owner, next step, invites, welcome DMs), `sa_skill_checks`, `sa_team_guesses` and `sa_possible_matches`: core and leads only, keyed by person, so they survive the link.
- Linking runs at sign-in (beside `sa_join`): match on the Discord or GitHub id from `auth.identities`, never `user_metadata`; then on an unclaimed record's email only if the account's email is proven; otherwise make a new person and, on a weak match, a `sa_possible_matches` row for a lead.
- Every `sa_` table today gets the "sa public read" policy for anon. The private tables, and unclaimed rows of `sa_people`, must stay out of that loop, with a rollback test in `supabase/tests/` that anon and members can't read them.
- The map: the registry exports people who chose the map to the website's `contributors.json` through the existing bot's GitHub App pull request, or the site reads the app's API at build. `/new-contributor` writes to the same table.
- Discord sign-in is a new provider on the shared Supabase auth, which flights.arrowair.com uses too.

## Risks and tensions
- **The promise.** "A person reads every profile" and "a person says hi" fail quietly unless someone owns each queue. Owners per person, a rotation for welcome DMs, and the 7-day waiting count on the funnel.
- **Volume.** Dozens of joins a week is a few DMs a day across the rotation, most of them short. Bots and spam joins get skipped, not greeted.
- **Automating a personal account.** Tempting, and against Discord's terms. The app drafts and opens the DM; a person sends it.
- **Notes about people, and records about people who never signed up.** Write notes as facts and what you saw; keep team-added records lean; delete on request.
- **Said is cheap.** Agent-written stories all sound impressive. Self-reported skills carry no vote weight; links and earned work do. A team skill check is the bridge (Q9, Q10).
- **Two stores.** The map's JSON and the registry must not drift; one store, the map as a view.
- **One more place to look.** The registry has to be where Discord, the site and the repos send people, and Your Arrow has to earn the second visit with matched work.

## Open questions
Not yet numbered in `OPEN-QUESTIONS.md` (Q35 to Q40 are on an unpushed branch).
1. The map and `/new-contributor` become the registry's public face and second intake. Gavin's call as much as ours.
2. Who's on the welcome-DM rotation, and how is a new member's turn picked (time zone, project, round robin)?
3. Does a team skill check show on the public card as "checked by Arrow", and feed the expertise weight in votes?
4. Who counts as the team for notes and team-added records: core and leads, leads only, or per project?
5. How long do unclaimed records stay?

Related: Q9, Q10, Q19, Q28; `profiles-and-reputation.md`, `contributor-buckets.md`, `agent-matchmaking.md`, `personal-dashboard.md`, `sleety-app-shell.md`, `shell-contract.md` (gaps 8 and 9: people and onboarding).
