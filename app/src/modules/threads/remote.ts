// Loads the Quiver workspace from the shared Supabase into the store, in the
// same shape the in-browser demo uses. The signed-in person is mapped to
// 'me' so the views need no special cases; everyone else keeps their user id
// and is resolved through session.members. People named in notes keep their
// people.ts id.
import { sb } from '../../lib/backend';
import { onReload, session, type Member } from '../../lib/session';
import { NEXT, type Thread } from './data';
import { state, type Work } from './store';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
const mine = (id: string | null | undefined) => (id && id === session.userId ? 'me' : id ?? undefined);

async function all(table: string, order?: string): Promise<Row[]> {
  let q = sb!.from(table).select('*');
  if (order) q = q.order(order);
  const { data, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

let inflight: Promise<void> | null = null;
export function load(): Promise<void> {
  // Coalesce bursts (a write followed by the interval tick) into one fetch.
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const [th, po, vo, wo, rl, me, bu, tv] = await Promise.all([
        all('sa_threads'), all('sa_positions', 'ord'), all('sa_votes'),
        all('sa_work'), all('sa_release'), all('sa_members'), all('sa_builders'), all('sa_thread_votes'),
      ]);
      session.members = Object.fromEntries(me.map((m) => [m.user_id, m as Member]));
      session.builders = bu.map((b) => `${b.thread_id}|${b.user_id}`);
      const byThread = <T extends Row>(rows: T[]) => {
        const map = new Map<string, T[]>();
        for (const r of rows) map.set(r.thread_id, [...(map.get(r.thread_id) ?? []), r]);
        return map;
      };
      const P = byThread(po), V = byThread(vo), TV = byThread(tv);
      state.threads = th.filter((t) => t.project === 'quiver').map((t): Thread => ({
        id: t.id, zone: t.zone, part: t.part ?? undefined, pcb: t.pcb ?? undefined,
        title: t.title, body: t.body, kind: t.kind, type: t.type, system: t.system, version: t.version,
        authorId: mine(t.author_id) ?? t.named ?? undefined, source: t.source ?? undefined,
        raisedAt: t.raised_at, activeAt: t.active_at,
        // One comment tree: top-level comments are the options, replies carry parentId.
        positions: (P.get(t.id) ?? []).map((p) => ({ id: p.id, text: p.text, authorId: mine(p.author_id) ?? p.named ?? undefined, source: p.source ?? undefined, at: p.created_at, parentId: p.parent_id ?? undefined, deleted: p.deleted_at ? (p.removed ? 'lead' : 'author') : undefined, editedAt: p.edited_at ?? undefined })),
        votes: (V.get(t.id) ?? []).map((v) => ({ memberId: mine(v.user_id)!, positionId: v.position_id, value: v.value })),
        threadVotes: (TV.get(t.id) ?? []).map((v) => ({ memberId: mine(v.user_id)!, value: v.value })),
        replies: [],
        objections: 0,
        settled: t.settled ? { ...t.settled, byId: mine(t.settled.byId) } : undefined,
        declined: t.declined ? { ...t.declined, byId: mine(t.declined.byId) } : undefined,
        deferrals: (t.deferrals ?? []).map((d: Row) => ({ ...d, byId: mine(d.byId) })),
        history: (t.history ?? []).map((h: Row) => ({ ...h, byId: mine(h.byId), decidedBy: mine(h.decidedBy) })),
      }));
      state.work = wo.map((w): Work => ({
        id: w.id, threadId: w.thread_id, decision: w.decision, positionId: w.position_id, kind: w.kind,
        title: w.title, scope: w.scope, acceptance: w.acceptance, reward: w.reward, proposerShare: Number(w.proposer_share),
        proposer: { personId: mine(w.proposer?.personId), source: w.proposer?.source, confirmedBy: mine(w.proposer?.confirmedBy) },
        stage: w.stage, ownerId: mine(w.owner_id), evidence: w.evidence ?? undefined,
        history: (w.history ?? []).map((h: Row) => ({ ...h, byId: mine(h.byId)! })), createdAt: w.created_at,
      }));
      const r = rl.find((x) => x.version === NEXT);
      state.release = r
        ? {
            pool: r.pool ?? undefined,
            freezeTarget: r.freeze_target ?? undefined,
            frozenAt: r.frozen_at ?? undefined,
            frozenBy: mine(r.frozen_by),
            allocation: r.allocation ? { ...r.allocation, lines: (r.allocation.lines ?? []).map((l: Row) => ({ ...l, recipient: mine(l.recipient) })) } : undefined,
          }
        : {};
      state.role = session.member?.role ?? 'member';
    } catch (e) {
      session.notice = `Couldn't load the workspace: ${(e as Error).message}`;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
onReload(load);
