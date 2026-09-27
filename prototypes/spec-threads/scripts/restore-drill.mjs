import { spawnSync, execFileSync } from "node:child_process";
import { openSync, closeSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";
import assert from "node:assert/strict";
const path = process.argv[2];
if (!path || !path.startsWith(".runtime/backups/") || !path.endsWith(".dump"))
  throw new Error("Choose a local workspace backup.");
const manifest = JSON.parse(readFileSync(path + ".json", "utf8"));
assert.equal(
  createHash("sha256").update(readFileSync(path)).digest("hex"),
  manifest.sha256,
);
const config = JSON.parse(readFileSync(".runtime/server.json", "utf8"));
const pool = new pg.Pool({ connectionString: config.databaseUrl });
const name = "arrow_restore_" + Date.now();
await pool.query("create database " + name + " template template0");
const fd = openSync(path, "r");
const restored = spawnSync(
  "docker",
  [
    "exec",
    "-i",
    "supabase_db_arrow-workspace",
    "pg_restore",
    "-U",
    "supabase_admin",
    "-d",
    name,
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
  ],
  { stdio: [fd, "ignore", "pipe"] },
);
closeSync(fd);
if (restored.status !== 0) {
  console.error(restored.stderr.toString().slice(0, 2000));
  throw new Error(
    "Restore failed in isolated database " + name + "; source is untouched.",
  );
}
const url = new URL(config.databaseUrl);
url.pathname = "/" + name;
const recovery = new pg.Pool({ connectionString: url.href });
for (const table of [
  "workspaces",
  "evidence",
  "attachments",
  "events",
  "snapshots",
  "evidence_versions",
]) {
  const q = "select count(*)::int as n from arrow_workspace." + table;
  assert.deepEqual((await pool.query(q)).rows, (await recovery.query(q)).rows);
}
const source = await pool.query(
    "select id,revision,data from arrow_workspace.workspaces order by id",
  ),
  copy = await recovery.query(
    "select id,revision,data from arrow_workspace.workspaces order by id",
  );
assert.deepEqual(source.rows, copy.rows);
assert.deepEqual(
  (await pool.query("select id,email from auth.users order by id")).rows,
  (await recovery.query("select id,email from auth.users order by id")).rows,
);
console.log(
  "Backup checksum and isolated full restore verified: " +
    name +
    ". Live database untouched.",
);
await recovery.end();
await pool.end();
