const params = new URLSearchParams(window.location.search);

/** A real-project snapshot is opt-in per build; the old browser sandbox is never migrated. */
export const isRealProjectData = import.meta.env.VITE_PROJECT_DATA === 'spearhead'
  && params.get('dataset') !== 'examples';
export const exampleWorkspaceUrl = `${window.location.pathname}?dataset=examples#/p/spearhead`;
export const realWorkspaceUrl = `${window.location.pathname}#/p/spearhead`;

/** The real shared service: accounts, a database, notifications. */
export const isSharedProject = import.meta.env.VITE_BACKEND === 'shared' && isRealProjectData;

/**
 * The default public build (specs.arrowair.com): the example workspace with fictional people, run
 * in the visitor's browser. The older concept sandbox stays reachable at ?dataset=sandbox.
 */
export const isExampleWorkspace = !import.meta.env.VITE_BACKEND && !import.meta.env.VITE_PROJECT_DATA
  && params.get('dataset') !== 'sandbox';

/** Screens designed for the shared workspace, whether backed by the service or the in-browser example. */
export const usesWorkspaceShell = isSharedProject || isExampleWorkspace;
