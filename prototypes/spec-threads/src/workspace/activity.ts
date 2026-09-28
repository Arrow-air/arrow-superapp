const labels: Record<string, string> = {
  createThread: 'Discussion started',
  startFromEvidence: 'Discussion started',
  createPosition: 'Contribution posted',
  addComment: 'Reply posted',
  editContribution: 'Contribution edited',
  castVote: 'Support changed',
  setBuilderIntent: 'Offered to help build',
  saveOutcome: 'Summary draft updated',
  concludeThread: 'Discussion settled',
  resolveThread: 'Discussion settled',
  reopenThread: 'Follow-up started',
  startFollowUp: 'Follow-up started',
  createWork: 'Work drafted',
  updateWork: 'Work updated',
  claimWork: 'Work claimed',
  updateGrant: 'Work scope edited',
  publishGrant: 'Work opened',
  saveSpecification: 'Spec section updated',
  supersedeDecisions: 'Decision replaced',
  freezeVersion: 'Version frozen',
  setVersionPlan: 'Freeze plan updated',
  setMemberStanding: 'Role or expertise updated',
  updateProfile: 'Profile updated',
  attachment: 'File attached',
  join: 'Joined the project',
  reconciliation: 'Repository note updated',
  'evidence-import': 'Call and document records updated',
  migration: 'Workspace updated',
};
export const activityLabel = (action: string) => labels[action] ?? action.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

const stageWords: Record<string, string> = { open: 'opened for claims', in_progress: 'moved to in progress', in_review: 'submitted for review', completed: 'accepted', cancelled: 'cancelled', draft: 'returned to draft' };
/** A readable line for an event, using its recorded input where that says more than the action name. */
export function describe(action: string, data: any, actor: string): string {
  switch (action) {
    case 'castVote': return data?.value === 1 ? `${actor} supported a contribution` : data?.value === -1 ? `${actor} opposed a contribution` : `${actor} withdrew support`;
    case 'updateWork': return data?.content?.stage ? `${actor}: work ${stageWords[data.content.stage] ?? 'updated'}${data?.note ? ` — ${data.note}` : ''}` : `${actor} updated the work`;
    case 'claimWork': return `${actor} claimed this work`;
    case 'resolveThread': return data?.kind === 'defer' ? `${actor} deferred it to a later version` : data?.kind === 'reject' ? `${actor} declined it` : `${actor} settled it`;
    case 'concludeThread': return data?.adopt ? `${actor} adopted it into the spec${data?.decision ? `: ${data.decision}` : ''}` : `${actor} settled it${data?.work ? ' and drafted work' : ''}`;
    case 'createPosition': return `${actor} contributed${data?.body ? `: ${String(data.body).split('\n')[0].slice(0, 90)}` : ''}`;
    case 'addComment': return `${actor} replied${data?.body ? `: ${String(data.body).slice(0, 90)}` : ''}`;
    case 'freezeVersion': return `${actor} froze the version; the retro split is recorded`;
    case 'setVersionPlan': return `${actor} set the freeze plan${data?.freezeTarget ? ` for ${data.freezeTarget}` : ''}${data?.retroPool?.amount ? ` with a ${Number(data.retroPool.amount).toLocaleString('en-US')} ARROW pool` : ''}`;
    case 'setMemberStanding': return `${actor} updated your role or verified expertise`;
    default: return `${activityLabel(action)} · ${actor}`;
  }
}
