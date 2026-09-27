import type { LocationQuery, LocationQueryRaw } from "vue-router";
import type { SourcedRecord } from "./sourcedProject";
export const projectPath = "/p/spearhead";
export function recordView(r: SourcedRecord) {
  return r.kind === "work" || r.kind === "result"
    ? "work"
    : r.kind === "question"
      ? "shape"
      : "design";
}
export function validReturn(value: unknown) {
  return typeof value === "string" &&
    value.length < 3000 &&
    /^\/p\/spearhead(?:\?|$)/.test(value)
    ? value
    : undefined;
}
export function recordTarget(
  record: SourcedRecord,
  fullPath: string,
  query: LocationQuery,
) {
  const version = String(query.version ?? "").replace("sh-pt", "PT");
  const system = String(query.system ?? "");
  const back = validReturn(query.back) ?? validReturn(fullPath);
  return {
    path: projectPath,
    query: {
      view: recordView(record),
      record: record.id,
      version: record.versions.includes(version) ? version : undefined,
      system: record.systems.includes(system) ? system : undefined,
      back,
    } satisfies LocationQueryRaw,
  };
}
export function defaultReturn(record: SourcedRecord, query: LocationQuery) {
  const view = recordView(record);
  return {
    path: projectPath,
    query: {
      view,
      version: query.version,
      system: query.system,
      queue:
        record.kind === "result" ||
        record.status === "historical" ||
        record.status === "completed"
          ? "history"
          : undefined,
    } satisfies LocationQueryRaw,
  };
}
export function compareRecords(order: string) {
  const rank: Record<string, number> = {
    in_progress: 0,
    open: 1,
    proposal: 2,
    planned: 3,
    reported: 4,
    agreed: 5,
    documented: 6,
    analysis: 7,
    completed: 8,
    historical: 9,
  };
  return (a: SourcedRecord, b: SourcedRecord) => {
    let compared =
      order === "contributor"
        ? (a.owner ?? "\uffff").localeCompare(b.owner ?? "\uffff")
        : order === "prototype"
          ? a.versions.join().localeCompare(b.versions.join())
          : order === "status"
            ? (rank[a.status] ?? 10) - (rank[b.status] ?? 10)
            : 0;
    return (
      compared || b.date.localeCompare(a.date) || a.title.localeCompare(b.title)
    );
  };
}
export function designFacet(r: SourcedRecord) {
  if (r.id === "pt1-as-built-gap") return "as-built";
  return r.status === "documented"
    ? "baseline"
    : r.status === "historical"
      ? "history"
      : "direction";
}
