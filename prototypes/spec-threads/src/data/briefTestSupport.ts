import type { BriefAction } from './backend';
import type { DemoBackend } from './demoBackend';
import { discussionSources } from '../lib/brief';
export async function briefAction(b: DemoBackend, action: BriefAction, threadId = 'n-engine') {
  return b.changeBrief({ threadId, expectedRevision: (await b.getBundle(threadId))?.brief?.revision ?? 0, action });
}
/** Explicit reviewer actions; no direct fixture mutation or bypass of readiness checks. */
export async function approveEngineBrief(b: DemoBackend) {
  const bundle = (await b.getBundle('n-engine'))!;
  for (const item of bundle.brief!.items) {
    await briefAction(b, { kind: 'decide', id: item.id, status: 'accepted', rationale: item.kind === 'question' ? 'For the illustrative bench prototype only, use the proposed 22–50 V envelope. Validate actual aircraft inputs separately.' : 'Included for the illustrative bench scope.' });
  }
  for (const source of discussionSources(bundle)) await briefAction(b, { kind: 'review', sourceKey: source.key });
  await briefAction(b, { kind: 'approve' });
}
