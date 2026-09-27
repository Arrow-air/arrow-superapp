import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const info = JSON.parse(
  execFileSync("supabase", ["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }),
);
mkdirSync(".runtime", { recursive: true, mode: 0o700 });
writeFileSync(
  ".runtime/server.json",
  JSON.stringify(
    {
      databaseUrl: info.DB_URL,
      supabaseUrl: info.API_URL,
      serviceKey: info.SERVICE_ROLE_KEY,
      anonKey: info.ANON_KEY,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log("Local server configuration written (credentials not displayed).");
