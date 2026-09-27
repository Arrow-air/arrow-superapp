import { spawn, execFileSync } from "node:child_process";
import {
  openSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { resolve } from "node:path";
const mode = process.argv[2] ?? "start",
  acceptance = process.argv.includes("--acceptance"),
  port = acceptance ? 4197 : Number(process.env.PORT ?? 4196),
  name = acceptance ? "acceptance-server" : "server",
  config = resolve(".runtime/" + name + ".json"),
  pidfile = ".runtime/" + name + ".pid";
mkdirSync(".runtime", { recursive: true, mode: 0o700 });
if (!existsSync(config)) throw new Error("Run local configuration first.");
let previous = 0;
if (existsSync(pidfile)) previous = Number(readFileSync(pidfile, "utf8"));
if (previous) {
  try {
    const cmd = execFileSync("ps", ["-p", String(previous), "-o", "command="], {
      encoding: "utf8",
    }).trim();
    const listener = execFileSync(
      "lsof",
      ["-Pan", "-p", String(previous), "-iTCP:" + port, "-sTCP:LISTEN"],
      { encoding: "utf8" },
    );
    if (
      cmd.includes("node server-dist/index.mjs") &&
      listener.includes(":" + port)
    ) {
      if (mode === "start") {
        console.log("Service is already running.");
        process.exit(0);
      }
      process.kill(previous, "SIGTERM");
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch {}
}
if (mode === "stop") {
  console.log("Service stopped.");
  process.exit(0);
}
const log = openSync(".runtime/" + name + ".log", "a", 0o600);
const child = spawn(process.execPath, ["server-dist/index.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ARROW_CONFIG: config,
    PORT: String(port),
    ARROW_HOST: process.env.ARROW_HOST ?? "127.0.0.1",
  },
  detached: true,
  stdio: ["ignore", log, log],
});
child.unref();
writeFileSync(pidfile, String(child.pid));
for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try {
    const r = await fetch("http://127.0.0.1:" + port + "/api/health");
    if (r.ok) {
      console.log("Workspace service healthy on port " + port);
      process.exit(0);
    }
  } catch {}
}
throw new Error("Service health check failed; inspect private runtime log.");
