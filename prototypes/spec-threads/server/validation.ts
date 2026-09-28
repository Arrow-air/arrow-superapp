import { z } from "zod";
const id = z.string().min(1).max(200),
  text = z.string().max(100000),
  short = z.string().max(240),
  ids = z.array(id).max(500),
  revision = z.number().int().nonnegative();
const work = z
  .object({
    kind: z.enum(["grant", "bounty"]),
    purpose: z.enum(["research", "implementation"]),
    title: short,
    scope: text,
    acceptance: text,
    amount: z.number().int().nonnegative().max(1e9).optional(),
  })
  .strict();
const milestone = z
  .object({
    id,
    title: short,
    acceptance: text,
    evidence: text,
    completed: z.boolean(),
  })
  .strict();
const progress = z
  .object({
    blockers: text.optional(),
    dependencies: ids.optional(),
    stage: z.enum([
      "draft",
      "open",
      "in_progress",
      "in_review",
      "completed",
      "cancelled",
    ]),
    ownerId: z.string().max(200),
    dueDate: z.string().max(10),
    funding: z.enum(["unfunded", "proposed", "funded", "paid"]),
    budget: short,
    amount: z.number().int().nonnegative().max(1e9).optional(),
    acceptance: text,
    evidence: text,
    milestones: z.array(milestone).max(100),
    decisionIds: ids,
  })
  .strict();
const action = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("purpose"), text }),
  z.object({
    kind: z.literal("item"),
    id: id.optional(),
    itemKind: z.enum([
      "requirement",
      "deliverable",
      "question",
      "evidence",
      "exclusion",
    ]),
    text,
    verification: text,
    sourceKeys: ids,
  }),
  z.object({
    kind: z.literal("decide"),
    id,
    status: z.enum(["accepted", "dismissed"]),
    rationale: text,
  }),
  z.object({ kind: z.literal("review"), sourceKey: id }),
  z.object({ kind: z.literal("approve") }),
]);
export const inputs: Record<string, z.ZodType> = {
  createThread: z
    .object({
      projectId: id,
      versionId: id.optional(),
      system: short.optional(),
      title: short,
      body: text,
      tags: z.array(short).max(30),
      anchor: z
        .object({
          model: short,
          group: short,
          component: short.optional(),
          part: short.optional(),
          label: short,
        })
        .strict()
        .optional(),
    })
    .strict(),
  createPosition: z.object({ threadId: id, body: text }).strict(),
  addComment: z.object({ positionId: id, body: text }).strict(),
  castVote: z
    .object({
      positionId: id,
      value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
    })
    .strict(),
  setBuilderIntent: z.object({ threadId: id, on: z.boolean() }).strict(),
  saveOutcome: z
    .object({
      threadId: id,
      expectedRevision: revision,
      body: text,
      openQuestions: text,
    })
    .strict(),
  concludeThread: z
    .object({
      threadId: id,
      expectedRevision: revision,
      expectedCorpus: text,
      adopt: z.boolean(),
      decision: short.optional(),
      work: work.optional(),
    })
    .strict(),
  createWork: z.object({ threadId: id, work }).strict(),
  changeBrief: z
    .object({ threadId: id, expectedRevision: revision, action })
    .strict(),
  updateWork: z
    .object({ id, expectedRevision: revision, content: progress, note: text })
    .strict(),
  saveSpecification: z
    .object({
      projectId: id,
      versionId: id,
      system: short,
      expectedRevision: revision,
      body: text,
      decisionIds: ids,
      note: text,
    })
    .strict(),
  supersedeDecisions: z
    .object({ decisionId: id, supersedesIds: ids, note: text })
    .strict(),
  startFollowUp: z
    .object({
      decisionId: id.optional(),
      grantId: id.optional(),
      title: short,
      body: text,
    })
    .strict(),
  updateGrant: z
    .object({
      id,
      expectedRevision: revision.optional(),
      title: short.optional(),
      scope: text.optional(),
      constraints: z.array(text).max(100).optional(),
      proposerShare: z.number().min(0).max(1).optional(),
      proposerIds: ids.optional(),
    })
    .strict(),
  publishGrant: id,
  freezeVersion: z.object({ projectId: id, versionId: id }).strict(),
  updateProfile: z
    .object({
      expertise: z.array(short).max(30).optional(),
      location: short.optional(),
      bio: text.optional(),
    })
    .strict(),
  resolveThread: z.discriminatedUnion("kind", [
    z.object({ threadId: id, kind: z.literal("reject"), note: text }),
    z.object({
      threadId: id,
      kind: z.literal("spec"),
      positionId: id,
      overrideRationale: text.optional(),
    }),
    z.object({
      threadId: id,
      kind: z.literal("grant"),
      positionId: id,
      overrideRationale: text.optional(),
      proposerShare: z.number().min(0).max(1).optional(),
    }),
    z.object({
      threadId: id,
      kind: z.literal("defer"),
      toVersionId: id,
      note: text.optional(),
    }),
  ]),
  startFromEvidence: z
    .object({
      recordId: id,
      title: short.optional(),
      body: z.string().trim().min(1).max(100000),
    })
    .strict(),
  setMemberStanding: z
    .object({
      projectId: id,
      memberId: id,
      role: z.enum(["lead", "core", "member"]).optional(),
      verifiedExpertise: z.array(short).max(30).optional(),
    })
    .strict(),
  setVersionPlan: z
    .object({
      projectId: id,
      versionId: id,
      freezeTarget: z
        .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
        .optional(),
      retroPool: z
        .object({
          amount: z.number().int().nonnegative().max(1e9),
          systemShares: z.record(short, z.number().min(0).max(1)).optional(),
        })
        .strict()
        .nullable()
        .optional(),
    })
    .strict(),
  editContribution: z
    .object({
      id,
      kind: z.enum(["position", "comment"]),
      expectedBody: text,
      body: text,
    })
    .strict(),
  reopenThread: z.object({ threadId: id, reason: text }).strict(),
  claimWork: z.object({ id, note: text }).strict(),
  assignProposers: z.object({ id, proposerIds: ids.min(1) }).strict(),
};
export const rpcInput = z
  .object({
    method: z.string().max(100),
    input: z.unknown(),
    expectedRevision: revision,
  })
  .strict();
export const inviteInput = z
  .object({
    email: z.email().max(254),
    displayName: z.string().trim().min(1).max(100),
    role: z.enum(["lead", "core", "member"]),
  })
  .strict();
export const acceptInput = z
  .object({
    token: z.string().min(32).max(100),
    password: z.string().min(12).max(128),
  })
  .strict();
export const reconciliationInput = z
  .object({
    itemId: id,
    expectedRevision: revision,
    status: z.enum(["open", "investigating", "drafted", "resolved"]),
    ownerId: z.string().max(200),
    note: text,
    proposedText: text,
    artifactUrl: z.union([z.literal(""), z.url().max(2000)]),
    resolution: text,
  })
  .strict();
