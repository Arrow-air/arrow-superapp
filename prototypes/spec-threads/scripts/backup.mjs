import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  openSync,
  closeSync,
  writeFileSync,
  readFileSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
const dir = ".runtime/backups";
mkdirSync(dir, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replace(/[:.]/g, "-"),
  path = dir + "/workspace-" + stamp + ".dump";
const fd = openSync(path, "wx", 0o600);
const result = spawnSync(
  "docker",
  [
    "exec",
    "supabase_db_arrow-workspace",
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-Fc",
    "--no-owner",
    "--no-privileges",
  ],
  { stdio: ["ignore", fd, "pipe"] },
);
closeSync(fd);
if (result.status !== 0)
  throw new Error("Database backup failed; no restore attempted.");
const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
writeFileSync(
  path + ".json",
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      sha256: hash,
      bytes: statSync(path).size,
      includes: [
        "workspace state",
        "evidence revisions",
        "attachments",
        "audit events",
        "Supabase auth",
      ],
      restore: "node scripts/restore-drill.mjs " + path,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log(path);
