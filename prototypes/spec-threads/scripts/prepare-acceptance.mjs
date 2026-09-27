import pg from "pg";
import { readFileSync, writeFileSync } from "node:fs";
const config = JSON.parse(readFileSync(".runtime/server.json", "utf8"));
const pool = new pg.Pool({ connectionString: config.databaseUrl });
const name = "arrow_workspace_acceptance";
const exists = await pool.query("select 1 from pg_database where datname=$1", [
  name,
]);
if (!exists.rowCount) await pool.query("create database " + name);
const url = new URL(config.databaseUrl);
url.pathname = "/" + name;
writeFileSync(
  ".runtime/acceptance-server.json",
  JSON.stringify({ ...config, databaseUrl: url.href }),
  { mode: 0o600 },
);
await pool.end();
console.log("Isolated acceptance database configured.");
