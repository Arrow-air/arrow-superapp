/** A real-project snapshot is opt-in per build; the old browser sandbox is never migrated. */
export const isRealProjectData = import.meta.env.VITE_PROJECT_DATA === 'spearhead'
  && new URLSearchParams(window.location.search).get('dataset') !== 'examples';
export const exampleWorkspaceUrl = `${window.location.pathname}?dataset=examples#/p/spearhead`;
export const realWorkspaceUrl = `${window.location.pathname}#/p/spearhead`;

export const isSharedProject = import.meta.env.VITE_BACKEND === 'shared' && isRealProjectData;
