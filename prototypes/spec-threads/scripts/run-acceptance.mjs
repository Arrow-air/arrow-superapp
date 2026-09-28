import { build } from "esbuild";
import { spawnSync } from "node:child_process";
await build({
  entryPoints: ["server/acceptance-run.ts"],
  outfile: ".runtime/acceptance-test.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  target: "node22",
});
for (const script of [
  ".runtime/acceptance-test.mjs",
  "e2e/demo-workspace.cjs",
]) {
  const result = spawnSync(process.execPath, [script], { stdio: "inherit" });
  if (result.status) process.exit(result.status);
}
