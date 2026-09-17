# Arrow Superapp

Working notes and prototypes for how Arrow could coordinate, decide, and fund work as one continuous loop.

**Thesis so far:** building is cheap once scoped. Deciding what to build, and rewarding the people who figure that out, is the bottleneck. Arrow's state lives in GitHub, Discord, calls, and people's heads. We want one place to see what's happening, decide at every layer, and route $ARROW to real signal.

Nothing here is decided. Everything is a hypothesis until it lands in `DECISIONS.md`.

## Layout

| Path | What goes there |
|---|---|
| `ideas/` | One file per idea. Same template each time (see below). This is the main body of the repo. |
| `OPEN-QUESTIONS.md` | The questions we haven't answered, numbered, with pointers to where they were discussed. |
| `DECISIONS.md` | Things we've actually agreed on, dated, with a one-line rationale. Short by design. |
| `meetings/YYYY-MM-DD/` | Notes and transcript per call. Raw material, not curated. |
| `sources/` | Original inputs: journal scans, diagrams, one-pagers. Never edited after the fact. |
| `references/` | Notes on existing tools we're borrowing from (Snapshot, Coordinape, Dework, etc.) and what each does well or badly for us. |
| `prototypes/` | Throwaway builds. One folder per experiment, each with its own README saying what it tests. Branches welcome. |

## Idea template

Every file in `ideas/` follows this shape so they're comparable:

```
# Title
Status: seed | exploring | prototyping | adopted | dropped
Raised by: who, where (meeting date or source)

## The idea
Two or three sentences.

## Why it matters
What problem it solves for Arrow specifically.

## How it might work
Mechanics, sketches, references to existing tools.

## Risks and tensions
What could go wrong. Which other ideas it conflicts with.

## Open questions
Link to OPEN-QUESTIONS.md numbers.
```

## Working agreements

- Add ideas freely. Editing someone else's idea file is fine; note it in the commit.
- Meeting notes get filed within a day. Recordings stay off the repo.
- A prototype is a question with code around it. Say the question in its README.
- When something is decided, move it to `DECISIONS.md` and update the idea's status. Don't leave decisions buried in meeting notes.
- Apply the test: is the new tool a demonstrable improvement over what we have, or just one more place to look?

## Next call

Around Tuesday. Come with what you'd want to see, filed as an idea or a question.
