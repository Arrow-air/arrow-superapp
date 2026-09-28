import http from "node:http";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { evidenceInput, mergeEvidence, stableJSON } from "./evidence";
import {
  initialState,
  domain,
  digest,
  workspaceId,
  memberFor,
  migrateState,
  sourceThread,
  creditCallProposers,
} from "./state";
import {
  inputs,
  rpcInput,
  inviteInput,
  acceptInput,
  reconciliationInput,
} from "./validation";
import { spearhead } from "../src/data/spearheadReal";
import { repoReview } from "../src/data/spearheadRepoReview";
import { trackingOf } from "../src/lib/projectRecords";
import type { DemoState } from "../src/data/seed";

const env = JSON.parse(
  await readFile(process.env.ARROW_CONFIG ?? ".runtime/server.json", "utf8"),
);
const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 8 });
const auth = createClient(env.supabaseUrl, env.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const dist = resolve(process.env.ARROW_DIST ?? "dist-shared");
const host = process.env.ARROW_HOST ?? "127.0.0.1",
  port = Number(process.env.PORT ?? 4196);
const schema = await readFile(resolve("server/schema.sql"), "utf8");
await pool.query(schema);
await pool.query(
  "insert into arrow_workspace.workspaces(id,data) values($1,$2) on conflict do nothing",
  [workspaceId, JSON.stringify(initialState())],
);
await pool.query(
  "insert into arrow_workspace.evidence(workspace_id,revision,digest,data) values($1,1,$2,$3) on conflict do nothing",
  [workspaceId, digest(JSON.stringify(spearhead)), JSON.stringify(spearhead)],
);
{
  // Upgrade an existing workspace in place, keeping a snapshot and an audit event.
  const c = await pool.connect();
  try {
    await c.query("begin");
    const { rows } = await c.query(
      "select data,revision from arrow_workspace.workspaces where id=$1 for update",
      [workspaceId],
    );
    const data = structuredClone(rows[0].data);
    if (migrateState(data)) {
      await c.query(
        "insert into arrow_workspace.snapshots(workspace_id,revision,data) values($1,$2,$3) on conflict do nothing",
        [workspaceId, rows[0].revision, JSON.stringify(rows[0].data)],
      );
      await c.query(
        "update arrow_workspace.workspaces set data=$2,revision=revision+1,updated_at=now() where id=$1",
        [workspaceId, JSON.stringify(data)],
      );
      await c.query(
        "insert into arrow_workspace.events(workspace_id,actor_id,action,entity_id,title,data) values($1,null,'migration',null,$2,'{}')",
        [workspaceId, "Workspace updated to weighted support"],
      );
    }
    await c.query("commit");
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const requireTrue = (condition: unknown, message: string, status = 400) => {
  if (!condition) throw new HttpError(status, message);
};
const rate = new Map<string, { n: number; until: number }>();
function limit(key: string, max = 120) {
  const now = Date.now();
  let r = rate.get(key);
  if (!r || r.until < now) {
    r = { n: 0, until: now + 60000 };
    rate.set(key, r);
  }
  if (++r.n > max)
    throw new HttpError(429, "Too many requests. Try again in a minute.");
  if (rate.size > 10000)
    for (const [k, v] of rate) if (v.until < now) rate.delete(k);
}
async function body(req: http.IncomingMessage, max = 1500000): Promise<any> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += c.length;
    if (size > max) throw new HttpError(413, "Request is too large.");
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
async function identity(req: http.IncomingMessage) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  requireTrue(token, "Sign in first.", 401);
  const { data, error } = await auth.auth.getUser(token);
  requireTrue(!error && data.user, "Session expired. Sign in again.", 401);
  return data.user!;
}
async function state() {
  const { rows } = await pool.query(
    "select data,revision from arrow_workspace.workspaces where id=$1",
    [workspaceId],
  );
  return {
    data: rows[0].data as DemoState,
    revision: Number(rows[0].revision),
  };
}
function membership(s: DemoState, id: string) {
  const role = s.roles.find(
    (r) => r.memberId === id && r.projectId === workspaceId,
  );
  requireTrue(role, "You do not have access to this project.", 403);
  return role!;
}
async function member(req: http.IncomingMessage) {
  const user = await identity(req);
  const s = await state();
  const role = membership(s.data, user.id);
  return { ...s, user, role };
}
function send(res: http.ServerResponse, status: number, value: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
async function event(
  client: pg.PoolClient,
  actor: string,
  action: string,
  entityId: string | undefined,
  title: string,
  data: unknown,
  s: DemoState,
) {
  const { rows } = await client.query(
    "insert into arrow_workspace.events(workspace_id,actor_id,action,entity_id,title,data) values($1,$2,$3,$4,$5,$6) returning id",
    [workspaceId, actor, action, entityId, title, JSON.stringify(data)],
  );
  const linkedThread =
    s.threads.find((t) => t.id === entityId) ||
    s.threads.find(
      (t) => t.id === s.grants.find((g) => g.id === entityId)?.threadId,
    );
  const watchers = await client.query(
    "select member_id from arrow_workspace.watches where workspace_id=$1 and target=any($2)",
    [
      workspaceId,
      [
        "project",
        entityId ?? "",
        linkedThread?.id ?? "",
        linkedThread?.sourceRecordId ?? "",
        linkedThread?.system ? "system:" + linkedThread.system : "",
      ],
    ],
  );
  const recipients = new Set<string>(watchers.rows.map((r) => r.member_id));
  if (action === "updateWork" || action === "claimWork") {
    const g = s.grants.find((g) => g.id === entityId);
    if (g?.tracking?.ownerId) recipients.add(g.tracking.ownerId);
    if (g?.tracking?.stage === "in_review")
      s.roles
        .filter((r) => r.role === "lead")
        .forEach((r) => recipients.add(r.memberId));
  }
  const thread = s.threads.find((t) => t.id === entityId);
  if (thread) recipients.add(thread.authorId);
  // Everyone hears when a version freezes and the retro split is recorded.
  if (action === "freezeVersion" || action === "setVersionPlan")
    s.roles.forEach((r) => recipients.add(r.memberId));
  if (action === "setMemberStanding" && entityId) recipients.add(entityId);
  const text = JSON.stringify(data);
  s.members.forEach((m) => {
    if (text.includes("@" + m.handle)) recipients.add(m.id);
  });
  recipients.delete(actor);
  for (const recipient of recipients)
    if (s.roles.some((r) => r.memberId === recipient))
      await client.query(
        "insert into arrow_workspace.notifications(workspace_id,member_id,event_id) values($1,$2,$3) on conflict do nothing",
        [workspaceId, recipient, rows[0].id],
      );
  return rows[0].id;
}
async function commit(
  client: pg.PoolClient,
  s: DemoState,
  old: DemoState,
  revision: number,
  actor: string,
  action: string,
  entity: string | undefined,
  title: string,
  input: unknown,
) {
  s.actingAs = null;
  await client.query(
    "insert into arrow_workspace.snapshots(workspace_id,revision,data) values($1,$2,$3) on conflict do nothing",
    [workspaceId, revision, JSON.stringify(old)],
  );
  await client.query(
    "update arrow_workspace.workspaces set data=$2,revision=revision+1,updated_at=now() where id=$1",
    [workspaceId, JSON.stringify(s)],
  );
  await event(client, actor, action, entity, title, input, s);
}
async function transaction<T>(fn: (c: pg.PoolClient) => Promise<T>) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
async function locked(c: pg.PoolClient) {
  const { rows } = await c.query(
    "select data,revision from arrow_workspace.workspaces where id=$1 for update",
    [workspaceId],
  );
  return {
    data: rows[0].data as DemoState,
    revision: Number(rows[0].revision),
  };
}
async function rpc(req: http.IncomingMessage) {
  const user = await identity(req);
  const input = rpcInput.parse(await body(req));
  const schema = inputs[input.method];
  requireTrue(schema, "Unknown operation.", 404);
  const value: any = schema.parse(input.input);
  return transaction(async (c) => {
    const old = await locked(c);
    const role = membership(old.data, user.id);
    requireTrue(
      old.revision === input.expectedRevision,
      "This project changed while you were editing. Reload the latest state and review your draft before saving.",
      409,
    );
    const d = domain(old.data, user.id);
    let result: any,
      s = structuredClone(old.data);
    let entity: string | undefined =
      value?.threadId ?? value?.id ?? value?.decisionId ?? value?.grantId;
    if (value?.projectId)
      requireTrue(value.projectId === workspaceId, "Project not found.", 404);
    if (input.method === "startFromEvidence") {
      const evidence = await c.query(
        "select data from arrow_workspace.evidence where workspace_id=$1",
        [workspaceId],
      );
      result = sourceThread(
        s,
        value.recordId,
        user.id,
        value.body,
        value.title,
        evidence.rows[0].data,
      );
      entity = result.id;
    } else if (input.method === "editContribution") {
      const collection = value.kind === "position" ? s.positions : s.comments;
      const r = collection.find((r) => r.id === value.id);
      requireTrue(r, "Contribution not found.", 404);
      requireTrue(
        r!.authorId === user.id,
        "Only the author may edit this contribution.",
        403,
      );
      requireTrue(
        value.body.trim().length > 0,
        "Contribution cannot be empty.",
      );
      requireTrue(
        r!.body === value.expectedBody,
        "Contribution changed. Reload before editing.",
        409,
      );
      const threadId =
        value.kind === "position"
          ? (r as any).threadId
          : s.positions.find((p) => p.id === (r as any).positionId)?.threadId;
      requireTrue(
        s.threads.find((t) => t.id === threadId)?.status === "open",
        "Recorded discussions are immutable. Start a follow-up.",
      );
      const history = (r as any).editHistory ?? [];
      history.push({
        body: r!.body,
        at: new Date().toISOString(),
        by: user.id,
      });
      Object.assign(r!, {
        body: value.body,
        editedAt: new Date().toISOString(),
        editHistory: history,
      });
      result = r;
      entity = threadId;
    } else if (input.method === "reopenThread") {
      requireTrue(
        role.role === "lead",
        "Only the lead can reopen a discussion.",
        403,
      );
      const t = s.threads.find((t) => t.id === value.threadId);
      requireTrue(
        t && t.status === "resolved",
        "Choose a recorded discussion.",
      );
      requireTrue(
        value.reason.trim().length >= 10,
        "Explain why this needs follow-up.",
      );
      // A recorded outcome is immutable. Reopening creates a linked continuation.
      const version = s.projects[0].versions.find(
        (v) => v.state === "discussing",
      );
      requireTrue(version, "No version is open for discussion.");
      result = {
        ...t!,
        id: randomUUID(),
        versionId: version!.id,
        title: "Follow-up: " + t!.title,
        body: value.reason + "\n\nContinues discussion " + t!.id,
        authorId: user.id,
        status: "open",
        resolution: undefined,
        createdAt: new Date().toISOString(),
        deferrals: [],
        sourceThreadId: t!.id,
      };
      s.threads.push(result);
      entity = result.id;
    } else if (input.method === "claimWork") {
      const g = s.grants.find((g) => g.id === value.id);
      requireTrue(g, "Work not found.", 404);
      requireTrue(value.note.trim(), "Add a short assignment note.");
      const tracking = trackingOf(g!);
      requireTrue(
        tracking.stage === "open" && !tracking.ownerId,
        "This work is not available to claim.",
      );
      const next = {
        ...tracking,
        ownerId: user.id,
        stage: "in_progress" as const,
        revision: tracking.revision + 1,
      };
      next.history = [
        ...tracking.history,
        {
          at: new Date().toISOString(),
          byMemberId: user.id,
          note: "Assignment accepted: " + value.note,
          content: { ...tracking, ownerId: user.id, stage: "in_progress" as const },
        },
      ];
      g!.tracking = next;
      result = g;
    } else {
      const fn = (d.backend as any)[input.method];
      requireTrue(typeof fn === "function", "Operation is unavailable.", 404);
      result = await fn.call(d.backend, value);
      s = d.read();
      if (input.method === "createThread") entity = result.id;
      if (input.method === "concludeThread" || input.method === "createWork") {
        const evidence = await c.query(
          "select data from arrow_workspace.evidence where workspace_id=$1",
          [workspaceId],
        );
        creditCallProposers(s, evidence.rows[0].data);
      }
      if (value?.positionId)
        entity = s.positions.find((p) => p.id === value.positionId)?.threadId;
    }
    if (JSON.stringify(s) === JSON.stringify(old.data))
      return { result, revision: old.revision };
    if (input.method === "setMemberStanding") entity = value.memberId;
    if (input.method === "setVersionPlan" || input.method === "freezeVersion")
      entity = value.versionId;
    const title =
      s.threads.find((t) => t.id === entity)?.title ??
      s.grants.find((g) => g.id === entity)?.title ??
      s.members.find((m) => m.id === entity)?.displayName ??
      s.projects[0].versions.find((v) => v.id === entity)?.name ??
      input.method;
    await commit(
      c,
      s,
      old.data,
      old.revision,
      user.id,
      input.method,
      entity,
      title,
      value,
    );
    return { result, revision: old.revision + 1 };
  });
}
async function acceptInvite(req: http.IncomingMessage) {
  const v = acceptInput.parse(await body(req));
  limit("invite:" + req.socket.remoteAddress, 10);
  return transaction(async (c) => {
    const { rows } = await c.query(
      "select * from arrow_workspace.invites where digest=$1 for update",
      [digest(v.token)],
    );
    const invite = rows[0];
    requireTrue(
      invite && !invite.used_at && new Date(invite.expires_at) > new Date(),
      "This invitation is invalid or expired.",
      403,
    );
    const { data, error } = await auth.auth.admin.createUser({
      email: invite.email,
      password: v.password,
      email_confirm: true,
      user_metadata: { display_name: invite.display_name },
    });
    requireTrue(
      !error && data.user,
      "Could not create account. The email may already be registered. Contact the project lead.",
    );
    try {
      const old = await locked(c);
      const next = structuredClone(old.data);
      next.members.push(
        memberFor(
          data.user!.id,
          invite.email,
          invite.display_name,
          next.members.map((m) => m.handle),
        ),
      );
      next.roles.push({
        projectId: workspaceId,
        memberId: data.user!.id,
        role: invite.role,
      });
      await commit(
        c,
        next,
        old.data,
        old.revision,
        data.user!.id,
        "join",
        data.user!.id,
        invite.display_name + " joined",
        {},
      );
      await c.query(
        "update arrow_workspace.invites set used_at=now() where digest=$1",
        [digest(v.token)],
      );
      return { email: invite.email };
    } catch (e) {
      await auth.auth.admin.deleteUser(data.user!.id);
      throw e;
    }
  });
}
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  if (!env.frameOrigins?.length) res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors " +
      (env.frameOrigins?.length
        ? "'self' " + env.frameOrigins.join(" ")
        : "'none'") +
      "; form-action 'self'",
  );
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const path = url.pathname;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const origin = req.headers.origin;
      if (origin)
        requireTrue(
          origin === `${env.publicOrigin ?? `http://${req.headers.host}`}` ||
            env.allowedOrigins?.includes(origin),
          "Origin not allowed.",
          403,
        );
      requireTrue(
        req.headers["content-type"]?.startsWith("application/json"),
        "Use JSON requests.",
        415,
      );
    }
    if (path.startsWith("/auth-service/")) {
      requireTrue(
        [
          "/auth-service/auth/v1/token",
          "/auth-service/auth/v1/logout",
          "/auth-service/auth/v1/user",
        ].includes(path),
        "Auth operation unavailable.",
        404,
      );
      limit("auth:" + req.socket.remoteAddress, 30);
      const payload =
        req.method === "GET"
          ? undefined
          : JSON.stringify(await body(req, 20000));
      const upstream = await fetch(
        env.supabaseUrl + path.replace("/auth-service", "") + url.search,
        {
          method: req.method,
          headers: {
            apikey: env.anonKey,
            authorization: req.headers.authorization ?? "",
            "content-type": "application/json",
          },
          body: payload,
          signal: AbortSignal.timeout(15000),
        },
      );
      res.writeHead(upstream.status, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      res.end(await upstream.text());
      return;
    }
    if (path === "/api/config") {
      send(res, 200, { anonKey: env.anonKey, workspace: workspaceId });
      return;
    }
    if (path === "/api/health") {
      await pool.query("select 1");
      send(res, 200, { ok: true });
      return;
    }
    if (path === "/api/evidence") {
      const { rows } = await pool.query(
        "select data,revision,imported_at from arrow_workspace.evidence where workspace_id=$1",
        [workspaceId],
      );
      send(res, 200, rows[0]);
      return;
    }
    if (path === "/api/invite/accept" && req.method === "POST") {
      send(res, 200, await acceptInvite(req));
      return;
    }
    if (path === "/api/invite/info") {
      const { rows } = await pool.query(
        "select display_name,role,expires_at from arrow_workspace.invites where digest=$1 and used_at is null and expires_at>now()",
        [digest(url.searchParams.get("token") ?? "")],
      );
      requireTrue(rows[0], "Invitation expired or unavailable.", 404);
      send(res, 200, rows[0]);
      return;
    }
    if (path === "/api/rpc" && req.method === "POST") {
      limit("rpc:" + req.socket.remoteAddress);
      send(res, 200, await rpc(req));
      return;
    }
    if (path === "/api/state" || path === "/api/events") {
      // The project is readable by anyone; writing needs a member account.
      let viewer: string | null = null;
      if (req.headers.authorization) viewer = (await identity(req)).id;
      if (path === "/api/events") {
        const { rows } = await pool.query(
          "select id,actor_id,action,entity_id,title,at from arrow_workspace.events where workspace_id=$1 order by id desc limit 100",
          [workspaceId],
        );
        send(res, 200, rows);
        return;
      }
      const s = await state();
      const me = viewer
        ? (s.data.roles.some((r) => r.memberId === viewer) &&
            s.data.members.find((x) => x.id === viewer)) ||
          null
        : null;
      send(res, 200, { ...s.data, revision: s.revision, me });
      return;
    }
    if (path.startsWith("/api/")) {
      const m = await member(req);
      if (path === "/api/invites" && req.method === "POST") {
        requireTrue(
          m.role.role === "lead",
          "Only the lead can invite members.",
          403,
        );
        const v = inviteInput.parse(await body(req));
        const token = randomBytes(32).toString("hex");
        await pool.query(
          "insert into arrow_workspace.invites(digest,workspace_id,email,role,display_name,expires_at) values($1,$2,$3,$4,$5,now()+interval '2 days')",
          [
            digest(token),
            workspaceId,
            v.email.toLowerCase(),
            v.role,
            v.displayName,
          ],
        );
        send(res, 200, { token, expiresIn: "2 days" });
        return;
      }
      if (
        (path === "/api/import/preview" || path === "/api/import/apply") &&
        req.method === "POST"
      ) {
        requireTrue(
          m.role.role === "lead",
          "Only the lead may import project evidence.",
          403,
        );
        const raw = await body(req, 15000000);
        const incoming = evidenceInput.parse(raw.project);
        const expected = z
          .number()
          .int()
          .nonnegative()
          .parse(raw.expectedRevision);
        const result = await transaction(async (c) => {
          const { rows } = await c.query(
            "select data,revision,digest from arrow_workspace.evidence where workspace_id=$1 for update",
            [workspaceId],
          );
          const old = rows[0];
          requireTrue(
            old.revision === expected,
            "Evidence changed since the preview. Review it again.",
            409,
          );
          const diff = mergeEvidence(old.data, incoming);
          const nextDigest = digest(stableJSON(diff.merged));
          const changed = digest(stableJSON(old.data)) !== nextDigest;
          if (path.endsWith("/apply") && changed) {
            await c.query(
              "insert into arrow_workspace.evidence_versions(workspace_id,revision,digest,data) values($1,$2,$3,$4) on conflict do nothing",
              [workspaceId, old.revision, old.digest, old.data],
            );
            await c.query(
              "update arrow_workspace.evidence set revision=revision+1,digest=$2,data=$3,imported_at=now() where workspace_id=$1",
              [workspaceId, nextDigest, diff.merged],
            );
            await event(
              c,
              m.user.id,
              "evidence-import",
              undefined,
              "Evidence library updated",
              {
                recordChanges: diff.records.map((r: any) => ({
                  id: r.id,
                  kind: r.kind,
                })),
                sourceChanges: diff.sources.map((r: any) => ({
                  id: r.id,
                  kind: r.kind,
                })),
              },
              m.data,
            );
          }
          return {
            metadata: diff.metadata,
            records: diff.records,
            sources: diff.sources,
            retained: diff.retained,
            changed,
            revision:
              old.revision + (path.endsWith("/apply") && changed ? 1 : 0),
          };
        });
        send(res, 200, result);
        return;
      }
      if (path === "/api/activity-cursor") {
        if (req.method === "POST") {
          const v = z
            .object({ seen: z.number().int().nonnegative() })
            .strict()
            .parse(await body(req));
          await pool.query(
            "insert into arrow_workspace.read_cursors values($1,$2,$3) on conflict(workspace_id,member_id) do update set seen_event=greatest(arrow_workspace.read_cursors.seen_event,excluded.seen_event)",
            [workspaceId, m.user.id, v.seen],
          );
        }
        send(res, 200, {
          seen: Number(
            (
              await pool.query(
                "select seen_event from arrow_workspace.read_cursors where workspace_id=$1 and member_id=$2",
                [workspaceId, m.user.id],
              )
            ).rows[0]?.seen_event ?? 0,
          ),
        });
        return;
      }
      if (path === "/api/watches") {
        if (req.method === "POST") {
          const v = z
            .object({ target: z.string().max(200), on: z.boolean() })
            .strict()
            .parse(await body(req));
          if (v.on)
            await pool.query(
              "insert into arrow_workspace.watches values($1,$2,$3) on conflict do nothing",
              [workspaceId, m.user.id, v.target],
            );
          else
            await pool.query(
              "delete from arrow_workspace.watches where workspace_id=$1 and member_id=$2 and target=$3",
              [workspaceId, m.user.id, v.target],
            );
        }
        send(
          res,
          200,
          (
            await pool.query(
              "select target from arrow_workspace.watches where workspace_id=$1 and member_id=$2",
              [workspaceId, m.user.id],
            )
          ).rows.map((r) => r.target),
        );
        return;
      }
      if (path === "/api/notifications") {
        if (req.method === "POST") {
          const v = z
            .union([
              z.object({ id: z.number().int().positive() }).strict(),
              z.object({ all: z.literal(true) }).strict(),
            ])
            .parse(await body(req));
          if ("all" in v) {
            await pool.query(
              "update arrow_workspace.notifications set read_at=now() where member_id=$1 and workspace_id=$2 and read_at is null",
              [m.user.id, workspaceId],
            );
            await pool.query(
              "insert into arrow_workspace.read_cursors values($1,$2,(select coalesce(max(id),0) from arrow_workspace.events where workspace_id=$1)) on conflict(workspace_id,member_id) do update set seen_event=greatest(arrow_workspace.read_cursors.seen_event,excluded.seen_event)",
              [workspaceId, m.user.id],
            );
          } else
            await pool.query(
              "update arrow_workspace.notifications set read_at=now() where id=$1 and member_id=$2",
              [v.id, m.user.id],
            );
        }
        send(
          res,
          200,
          (
            await pool.query(
              "select n.id,n.read_at,e.action,e.entity_id,e.title,e.at,e.actor_id,e.data from arrow_workspace.notifications n join arrow_workspace.events e on n.event_id=e.id where n.member_id=$1 and n.workspace_id=$2 order by n.id desc limit 100",
              [m.user.id, workspaceId],
            )
          ).rows,
        );
        return;
      }
      if (path === "/api/reconciliation") {
        if (req.method === "POST") {
          requireTrue(
            m.role.role === "lead" || m.role.role === "core",
            "A project reviewer must save reconciliation changes.",
            403,
          );
          const v = reconciliationInput.parse(await body(req));
          requireTrue(
            repoReview.items.some((i) => i.id === v.itemId),
            "Review item not found.",
            404,
          );
          requireTrue(
            !v.ownerId || m.data.members.some((x) => x.id === v.ownerId),
            "Unknown owner.",
          );
          if (v.artifactUrl)
            requireTrue(
              /^https?:\/\//.test(v.artifactUrl),
              "Use an HTTP or HTTPS reference.",
            );
          if (v.status === "resolved")
            requireTrue(
              v.resolution.trim() && v.artifactUrl,
              "Resolution needs an explanation and a linked artifact.",
            );
          await transaction(async (c) => {
            await c.query(
              "select id from arrow_workspace.workspaces where id=$1 for update",
              [workspaceId],
            );
            const { rows } = await c.query(
              "select revision from arrow_workspace.reconciliations where workspace_id=$1 and item_id=$2",
              [workspaceId, v.itemId],
            );
            requireTrue(
              (rows[0]?.revision ?? 0) === v.expectedRevision,
              "This review changed. Reload it first.",
              409,
            );
            await c.query(
              "insert into arrow_workspace.reconciliations values($1,$2,$3,$4,$5,now()) on conflict(workspace_id,item_id) do update set revision=excluded.revision,data=excluded.data,updated_by=excluded.updated_by,updated_at=now()",
              [
                workspaceId,
                v.itemId,
                v.expectedRevision + 1,
                JSON.stringify(v),
                m.user.id,
              ],
            );
            await event(
              c,
              m.user.id,
              "reconciliation",
              v.itemId,
              repoReview.items.find((i) => i.id === v.itemId)!.title,
              v,
              m.data,
            );
          });
        }
        send(
          res,
          200,
          (
            await pool.query(
              "select item_id,revision,data,updated_at from arrow_workspace.reconciliations where workspace_id=$1",
              [workspaceId],
            )
          ).rows,
        );
        return;
      }
      if (path === "/api/attachments" && req.method === "POST") {
        const v = z
          .object({
            entityId: z.string().max(200),
            filename: z.string().min(1).max(200),
            mediaType: z.string().max(100),
            data: z.string().max(14000000),
            note: z.string().min(1).max(2000),
          })
          .strict()
          .parse(await body(req, 15000000));
        requireTrue(
          m.data.threads.some((t) => t.id === v.entityId) ||
            m.data.grants.some((g) => g.id === v.entityId) ||
            (
              await pool.query(
                "select data from arrow_workspace.evidence where workspace_id=$1",
                [workspaceId],
              )
            ).rows[0].data.records.some((r: any) => r.id === v.entityId),
          "Attach to an existing record.",
        );
        const bytes = Buffer.from(v.data, "base64");
        requireTrue(
          bytes.length > 0 && bytes.length <= 10000000,
          "Files must be 10 MB or smaller.",
        );
        const id = randomUUID();
        await transaction(async (c) => {
          await c.query(
            "insert into arrow_workspace.attachments values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())",
            [
              id,
              workspaceId,
              v.entityId,
              m.user.id,
              v.filename,
              v.mediaType,
              digest(bytes),
              bytes.length,
              bytes,
              v.note,
            ],
          );
          await event(
            c,
            m.user.id,
            "attachment",
            v.entityId,
            "Attached " + v.filename,
            { id, note: v.note },
            m.data,
          );
        });
        send(res, 200, { id });
        return;
      }
      if (path === "/api/attachments") {
        send(
          res,
          200,
          (
            await pool.query(
              "select id,entity_id,author_id,filename,media_type,digest,size,revision_note,created_at from arrow_workspace.attachments where workspace_id=$1 and entity_id=$2 order by created_at desc",
              [workspaceId, url.searchParams.get("entity")],
            )
          ).rows,
        );
        return;
      }
      if (path.startsWith("/api/attachments/")) {
        const id = path.split("/").at(-1);
        requireTrue(z.uuid().safeParse(id).success, "File not found.", 404);
        const { rows } = await pool.query(
          "select filename,data from arrow_workspace.attachments where workspace_id=$1 and id=$2",
          [workspaceId, id],
        );
        requireTrue(rows[0], "File not found.", 404);
        res.writeHead(200, {
          "content-type": "application/octet-stream",
          "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(rows[0].filename)}`,
          "cache-control": "no-store",
        });
        res.end(rows[0].data);
        return;
      }
      if (path === "/api/export") {
        const evidence = await pool.query(
          "select data from arrow_workspace.evidence where workspace_id=$1",
          [workspaceId],
        );
        const files = await pool.query(
          "select id,entity_id,filename,digest,size,revision_note from arrow_workspace.attachments where workspace_id=$1",
          [workspaceId],
        );
        send(res, 200, {
          schema: "arrow.workspace.export.v1",
          exportedAt: new Date().toISOString(),
          revision: m.revision,
          project: m.data,
          evidence: evidence.rows[0].data,
          attachments: files.rows,
          events: (
            await pool.query(
              "select * from arrow_workspace.events where workspace_id=$1 order by id",
              [workspaceId],
            )
          ).rows,
          reconciliations: (
            await pool.query(
              "select item_id,revision,data from arrow_workspace.reconciliations where workspace_id=$1",
              [workspaceId],
            )
          ).rows,
        });
        return;
      }
      throw new HttpError(404, "Not found.");
    }
    requireTrue(
      req.method === "GET" || req.method === "HEAD",
      "Method not allowed.",
      405,
    );
    const filename = resolve(
      dist,
      "." + decodeURIComponent(path === "/" ? "/index.html" : path),
    );
    requireTrue(filename.startsWith(dist + sep), "Not found.", 404);
    let bytes: Buffer;
    try {
      bytes = await readFile(filename);
    } catch {
      throw new HttpError(404, "Not found.");
    }
    const mime: Record<string, string> = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2",
      ".png": "image/png",
    };
    res.writeHead(200, {
      "content-type": mime[extname(filename)] ?? "application/octet-stream",
      "cache-control": path.includes("/assets/")
        ? "public,max-age=31536000,immutable"
        : "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch (e: any) {
    const status =
      e instanceof HttpError
        ? e.status
        : e instanceof z.ZodError
          ? 400
          : e.code || e instanceof TypeError
            ? 503
            : /revision|changed|stale/i.test(e.message)
              ? 409
              : 400;
    send(res, status, {
      error:
        e instanceof z.ZodError
          ? "Invalid request fields."
          : status >= 500
            ? "Service unavailable. Try again."
            : e.message,
    });
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.listen(port, host, () =>
  console.log(`Arrow workspace listening on ${host}:${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => pool.end().then(() => process.exit(0))),
  );
