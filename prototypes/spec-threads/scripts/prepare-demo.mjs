// Creates the isolated example database and its service config. The example workspace holds
// fictional people and activity for demonstrations; it never shares a database with the real one.
import pg from "pg";
import { readFileSync, writeFileSync } from "node:fs";
const config = JSON.parse(readFileSync(".runtime/server.json", "utf8"));
const pool = new pg.Pool({ connectionString: config.databaseUrl });
const name = "arrow_workspace_demo";
if (!(await pool.query("select 1 from pg_database where datname=$1", [name])).rowCount)
  await pool.query("create database " + name);
await pool.end();
const url = new URL(config.databaseUrl);
url.pathname = "/" + name;
let previous = {};
try { previous = JSON.parse(readFileSync(".runtime/demo-server.json", "utf8")); } catch {}
writeFileSync(
  ".runtime/demo-server.json",
  JSON.stringify({
    ...config,
    ...previous,
    databaseUrl: url.href,
    banner: "Example workspace · the people and activity here are fictional, for demonstrating the flow. The call and repository records are real.",
  }),
  { mode: 0o600 },
);
console.log("Example workspace database configured.");
