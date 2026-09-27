import { reactive } from "vue";
import { spearhead as imported } from "./spearheadReal";
import { isSharedProject } from "./projectDataMode";
export const projectEvidence = reactive(structuredClone(imported));
export const evidenceSync = reactive({ revision: 0, error: "" });
export async function refreshEvidence() {
  if (!isSharedProject) return;
  try {
    const response = await fetch("/api/evidence");
    if (!response.ok)
      throw new Error(
        "Evidence library could not be refreshed. Showing the bundled import.",
      );
    const data = await response.json();
    Object.assign(projectEvidence, data.data);
    evidenceSync.revision = data.revision;
    evidenceSync.error = "";
  } catch (e: any) {
    evidenceSync.error = e.message;
  }
}
