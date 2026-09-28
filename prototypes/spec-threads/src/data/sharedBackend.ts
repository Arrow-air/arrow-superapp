import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Backend } from "./backend";
import type { DemoState } from "./seed";
import type { Member } from "../lib/types";
let authPromise: Promise<SupabaseClient> | undefined;
export async function authClient() {
  return (authPromise ??= fetch("/api/config")
    .then((r) => r.json())
    .then((config) =>
      createClient(window.location.origin + "/auth-service", config.anonKey, {
        auth: { storageKey: "arrow-workspace-auth", detectSessionInUrl: false },
      }),
    ));
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const client = await authClient();
  const { data } = await client.auth.getSession();
  const response = await fetch("/api" + path, {
    ...options,
    headers: {
      ...(data.session
        ? { Authorization: "Bearer " + data.session.access_token }
        : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const type = response.headers.get("content-type");
  const value = type?.includes("application/json")
    ? await response.json()
    : await response.blob();
  if (!response.ok) {
    const e = new Error(value.error ?? "The request failed. Try again.");
    Object.assign(e, { status: response.status });
    throw e;
  }
  return value;
}
export type SharedSnapshot = DemoState & {
  revision: number;
  me: Member | null;
};
export class SharedBackend implements Backend {
  readonly kind = "shared" as const;
  private cached?: Promise<SharedSnapshot>;
  invalidate() {
    this.cached = undefined;
  }
  async snapshot() {
    return (this.cached ??= api<SharedSnapshot>("/state")
      .catch(async (e) => {
        // The project is public. An expired session falls back to reading signed out.
        if (e.status !== 401) throw e;
        await (await authClient()).auth.signOut({ scope: "local" });
        return api<SharedSnapshot>("/state");
      })
      .catch((e) => {
        this.cached = undefined;
        throw e;
      }));
  }
  async rpc(method: string, input: unknown) {
    const s = await this.snapshot();
    try {
      const out = await api("/rpc", {
        method: "POST",
        body: JSON.stringify({ method, input, expectedRevision: s.revision }),
      });
      this.invalidate();
      return out.result;
    } catch (e) {
      this.invalidate();
      throw e;
    }
  }
  async currentMember() {
    const a = await authClient();
    if (!(await a.auth.getSession()).data.session) return null;
    return (await this.snapshot()).me;
  }
  async signIn() {
    window.location.hash = "/sign-in";
  }
  async signOut() {
    await (await authClient()).auth.signOut({ scope: "local" });
    this.invalidate();
  }
  async listProjects() {
    try {
      return (await this.snapshot()).projects;
    } catch (e: any) {
      if (e.status === 401) return [];
      throw e;
    }
  }
  async listMembers() {
    try {
      return (await this.snapshot()).members;
    } catch (e: any) {
      if (e.status === 401) return [];
      throw e;
    }
  }
  async listRoles() {
    try {
      return (await this.snapshot()).roles;
    } catch (e: any) {
      if (e.status === 401) return [];
      throw e;
    }
  }
  async listThreads() {
    return (await this.snapshot()).threads;
  }
  async listBundles() {
    const s = await this.snapshot();
    return s.threads.map((thread) => {
      const positions = s.positions.filter((p) => p.threadId === thread.id);
      const ids = new Set(positions.map((p) => p.id));
      return {
        thread,
        positions,
        comments: s.comments.filter((c) => ids.has(c.positionId)),
        votes: s.votes.filter((v) => ids.has(v.positionId)),
        intents: s.intents.filter((i) => i.threadId === thread.id),
        brief: s.briefs.find((b) => b.threadId === thread.id),
        draft: s.drafts?.find((d) => d.threadId === thread.id),
      };
    });
  }
  async getBundle(id: string) {
    return (await this.listBundles()).find((b) => b.thread.id === id) ?? null;
  }
  async listDecisions() {
    return (await this.snapshot()).decisions;
  }
  async listGrants() {
    return (await this.snapshot()).grants;
  }
  async getGrant(id: string) {
    return (await this.listGrants()).find((g) => g.id === id) ?? null;
  }
  async listSpecifications() {
    return (await this.snapshot()).specifications ?? [];
  }
  createThread: (
    ...a: Parameters<Backend["createThread"]>
  ) => ReturnType<Backend["createThread"]> = (v) => this.rpc("createThread", v);
  createPosition: (
    ...a: Parameters<Backend["createPosition"]>
  ) => ReturnType<Backend["createPosition"]> = (v) =>
    this.rpc("createPosition", v);
  addComment: (
    ...a: Parameters<Backend["addComment"]>
  ) => ReturnType<Backend["addComment"]> = (v) => this.rpc("addComment", v);
  castVote: (
    ...a: Parameters<Backend["castVote"]>
  ) => ReturnType<Backend["castVote"]> = (v) => this.rpc("castVote", v);
  setBuilderIntent: (
    ...a: Parameters<Backend["setBuilderIntent"]>
  ) => ReturnType<Backend["setBuilderIntent"]> = (v) =>
    this.rpc("setBuilderIntent", v);
  changeBrief: (
    ...a: Parameters<Backend["changeBrief"]>
  ) => ReturnType<Backend["changeBrief"]> = (v) => this.rpc("changeBrief", v);
  saveOutcome: (
    ...a: Parameters<Backend["saveOutcome"]>
  ) => ReturnType<Backend["saveOutcome"]> = (v) => this.rpc("saveOutcome", v);
  concludeThread: (
    ...a: Parameters<Backend["concludeThread"]>
  ) => ReturnType<Backend["concludeThread"]> = (v) =>
    this.rpc("concludeThread", v);
  createWork: (
    ...a: Parameters<Backend["createWork"]>
  ) => ReturnType<Backend["createWork"]> = (v) => this.rpc("createWork", v);
  resolveThread: (
    ...a: Parameters<Backend["resolveThread"]>
  ) => ReturnType<Backend["resolveThread"]> = (v) =>
    this.rpc("resolveThread", v);
  updateGrant: (
    ...a: Parameters<Backend["updateGrant"]>
  ) => ReturnType<Backend["updateGrant"]> = (v) => this.rpc("updateGrant", v);
  publishGrant: (
    ...a: Parameters<Backend["publishGrant"]>
  ) => ReturnType<Backend["publishGrant"]> = (v) => this.rpc("publishGrant", v);
  freezeVersion: (
    ...a: Parameters<Backend["freezeVersion"]>
  ) => ReturnType<Backend["freezeVersion"]> = (v) =>
    this.rpc("freezeVersion", v);
  updateProfile: (
    ...a: Parameters<Backend["updateProfile"]>
  ) => ReturnType<Backend["updateProfile"]> = (v) =>
    this.rpc("updateProfile", v);
  saveSpecification: (
    ...a: Parameters<Backend["saveSpecification"]>
  ) => ReturnType<Backend["saveSpecification"]> = (v) =>
    this.rpc("saveSpecification", v);
  supersedeDecisions: (
    ...a: Parameters<Backend["supersedeDecisions"]>
  ) => ReturnType<Backend["supersedeDecisions"]> = (v) =>
    this.rpc("supersedeDecisions", v);
  updateWork: (
    ...a: Parameters<Backend["updateWork"]>
  ) => ReturnType<Backend["updateWork"]> = (v) => this.rpc("updateWork", v);
  setMemberStanding = (v: Parameters<NonNullable<Backend["setMemberStanding"]>>[0]) =>
    this.rpc("setMemberStanding", v);
  assignProposers = (v: Parameters<NonNullable<Backend["assignProposers"]>>[0]) =>
    this.rpc("assignProposers", v);
  setVersionPlan = (v: Parameters<NonNullable<Backend["setVersionPlan"]>>[0]) =>
    this.rpc("setVersionPlan", v);
  startFollowUp: (
    ...a: Parameters<Backend["startFollowUp"]>
  ) => ReturnType<Backend["startFollowUp"]> = (v) =>
    this.rpc("startFollowUp", v);
}
