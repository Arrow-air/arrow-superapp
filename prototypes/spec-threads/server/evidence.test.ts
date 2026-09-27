import { it, expect } from "vitest";
import { mergeEvidence, evidenceInput, stableJSON } from "./evidence";
import { spearhead } from "../src/data/spearheadReal";
it("validates current evidence and exposes metadata-only changes", () => {
  expect(evidenceInput.safeParse(spearhead).success).toBe(true);
  const next = structuredClone(spearhead);
  next.summary += " Review.";
  expect(mergeEvidence(spearhead, next).metadata.map((m) => m.id)).toEqual([
    "summary",
  ]);
});
it("retains omitted records and rejects broken references", () => {
  const next = structuredClone(spearhead);
  next.records = next.records.slice(1);
  expect(mergeEvidence(spearhead, next).merged.records.length).toBe(55);
  next.records[0].sourceIds = ["missing"];
  expect(() => mergeEvidence(spearhead, next)).toThrow(
    "Missing source reference",
  );
});
it("rejects duplicate source identities and executable URLs", () => {
  const next = structuredClone(spearhead);
  next.sources.push(next.sources[0]);
  expect(() => mergeEvidence(spearhead, next)).toThrow("Duplicate sources");
  next.sources[0].url = "javascript:alert(1)";
  expect(evidenceInput.safeParse(next).success).toBe(false);
});

it("JSON object key ordering does not manufacture an import change", () => {
  expect(stableJSON({ b: 2, a: { d: 4, c: 3 } })).toBe(
    stableJSON({ a: { c: 3, d: 4 }, b: 2 }),
  );
});
