import { describe, it, expect } from "vitest";
import {
  recordTarget,
  defaultReturn,
  validReturn,
  compareRecords,
  designFacet,
} from "./sourcedNavigation";
import { spearhead } from "../data/spearheadReal";
describe("evidence navigation", () => {
  it("retains a filtered search return path without mislabeling prototype", () => {
    const r = spearhead.records.find((r) => r.id === "pt1-electrical")!;
    const t = recordTarget(r, "/p/spearhead?view=search&q=electrical", {
      version: "PT2",
      system: "payload",
    });
    expect(t.query.back).toBe("/p/spearhead?view=search&q=electrical");
    expect(t.query.version).toBeUndefined();
    expect(t.query.system).toBeUndefined();
  });
  it("preserves original list through related-record hops", () => {
    const r = spearhead.records[0];
    expect(
      recordTarget(r, "/p/spearhead?record=other", {
        back: "/p/spearhead?view=sources&source=test",
      }).query.back,
    ).toContain("source=test");
  });
  it("rejects external and unrelated return destinations", () => {
    expect(validReturn("https://bad.example/")).toBeUndefined();
    expect(validReturn("//bad.example")).toBeUndefined();
    expect(validReturn("/p/spearhead-other")).toBeUndefined();
  });
  it("returns flight results to history rather than active work", () =>
    expect(
      defaultReturn(spearhead.records.find((r) => r.id === "first-hover")!, {})
        .query.queue,
    ).toBe("history"));
  it("sorts active work ahead of dated plans", () => {
    const work = spearhead.records
      .filter(
        (r) =>
          r.kind === "work" && ["planned", "in_progress"].includes(r.status),
      )
      .sort(compareRecords("status"));
    expect(work[0].status).toBe("in_progress");
  });
  it("separates as-built uncertainty from a released baseline", () =>
    expect(
      designFacet(spearhead.records.find((r) => r.id === "pt1-as-built-gap")!),
    ).toBe("as-built"));
});
