import { spawnSync } from "node:child_process";
const origin = (process.env.BASE_URL ?? "http://127.0.0.1:4193/").split("?")[0];
for (const suite of [
  "real-data",
  "repo-review",
  "conversation",
  "records",
  "samples",
  "briefing",
]) {
  const result = spawnSync(process.execPath, ["e2e/" + suite + ".cjs"], {
    stdio: "inherit",
    env: {
      ...process.env,
      BASE_URL:
        origin +
        (["real-data", "repo-review"].includes(suite)
          ? ""
          : "?dataset=examples"),
    },
  });
  if (result.status) process.exit(result.status);
}
