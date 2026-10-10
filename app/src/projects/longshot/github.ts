// Longshot's public material from GitHub and its build123d BOM, generated at
// build time (scripts/build-longshot.mjs). Read-only, like Quiver's.
import data from '../../data/generated/longshot.json';

export interface LsIssue {
  number: number; title: string; state: string; url: string; labels: string[]; author: string | null; assignees: string[];
  createdAt: string; updatedAt: string; closedAt: string | null; excerpt: string;
}
export interface LsPr {
  number: number; title: string; state: string; draft: boolean; url: string; author: string | null;
  createdAt: string; updatedAt: string; mergedAt: string | null; excerpt: string;
}
export interface LsBomLine {
  id: string; description: string; qty: number; category: string; makeBuy: string; material: string | null;
  source: string | null; exports: string | null; validation: string | null;
}

export const LS_REPO = data.repo;
export const lsGeneratedAt: string = data.generatedAt;
export const lsCommit: string = data.commit;
export const lsBomPath: string = data.bomPath;
export const lsIssues = data.issues as LsIssue[];
export const lsPrs = data.prs as LsPr[];
export const lsBom = data.bom as LsBomLine[];

export const lsIssueUrl = (n: number) => `${LS_REPO}/issues/${n}`;
export const lsPrUrl = (n: number) => `${LS_REPO}/pull/${n}`;
export const lsIssueByNumber = (n: number) => lsIssues.find((i) => i.number === n);
export const lsPrByNumber = (n: number) => lsPrs.find((p) => p.number === n);
export const lsBomById = (id: string) => lsBom.find((b) => b.id === id);
export const lsOpenIssues = lsIssues.filter((i) => i.state === 'OPEN');
