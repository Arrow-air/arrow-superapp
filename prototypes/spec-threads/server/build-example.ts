// Builds the static example workspace (src/data/exampleState.json) that the default build serves:
// the same scenario as the example database, with fictional ids and no real accounts.
import { writeFileSync } from "node:fs";
import { people, runExampleScenario } from "./exampleScenario";

const ids = Object.fromEntries(people.map((p) => [p.key, "ex-" + p.key]));
const { state, events } = await runExampleScenario(ids);
writeFileSync(
  "src/data/exampleState.json",
  JSON.stringify({ anchor: "2026-09-27", state, events: events.map((e) => ({ ...e, data: undefined })) }, null, 1) + "\n",
);
console.log(`Example state: ${state.threads.length} discussions, ${state.members.length} people.`);
