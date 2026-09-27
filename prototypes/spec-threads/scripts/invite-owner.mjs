// Local operator only: creates a private one-time invitation. Never sends mail.
import pg from "pg";
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
const email = z.email().parse(process.argv[2]).toLowerCase(),
  displayName = process.argv[3] ?? "Thomas",
  origin = process.env.PUBLIC_URL ?? "http://127.0.0.1:4196/";
const config = JSON.parse(readFileSync(".runtime/server.json", "utf8"));
const db = new pg.Pool({ connectionString: config.databaseUrl });
const row = await db.query(
  "select data from arrow_workspace.workspaces where id=$1",
  ["spearhead"],
);
if (row.rows[0].data.roles.some((r) => r.role === "lead"))
  throw new Error("A lead already exists. Use the signed-in invitation flow.");
const token = randomBytes(32).toString("hex");
await db.query(
  "insert into arrow_workspace.invites(digest,workspace_id,email,role,display_name,expires_at) values($1,$2,$3,$4,$5,now()+interval '2 days')",
  [
    createHash("sha256").update(token).digest("hex"),
    "spearhead",
    email,
    "lead",
    displayName,
  ],
);
const url = new URL(origin);
url.hash = "/join?token=" + token;
writeFileSync(
  ".runtime/owner-invitation.json",
  JSON.stringify({ email, url: url.href, expiresIn: "2 days" }, null, 2),
  { mode: 0o600 },
);
await db.end();
console.log(
  "Private owner invitation saved in .runtime/owner-invitation.json. No message sent.",
);
