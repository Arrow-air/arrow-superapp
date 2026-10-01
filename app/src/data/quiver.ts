// The real, public Quiver material, generated from the repository at build
// time (scripts/build-data.mjs, scripts/build-prs.mjs). Read-only: nothing in
// the demo writes back to GitHub.
import generated from './generated/quiver.json';
import prData from './generated/prs.json';

export interface BomItem {
  id: string;
  name: string;
  qty: number;
  sourcing: string | null;
  material: string | null;
  spec: string | null;
  unitCostUsd: number | null;
  designRef: string | null;
  notes: string | null;
  suppliers: { name: string; partNumber: string | null; url: string | null; note: string | null }[];
}
export interface BomGroup { category: string; name: string; items: BomItem[] }

export interface Task {
  id: string;
  number: number;
  url: string;
  title: string;
  state: string;
  claimable: boolean;
  fundingLabel: string | null;
  priceText: string | null;
  priceUsd: number | null;
  owner: string | null;
  deadline: string | null;
  doneWhen: string | null;
  parts: string[];
  updatedAt: string;
}

export interface Issue {
  number: number;
  url: string;
  title: string;
  state: string;
  labels: string[];
  excerpt: string;
  parts: string[];
  updatedAt: string;
}

export interface PullRequest {
  number: number;
  title: string;
  author: string | null;
  draft: boolean;
  url: string;
  createdAt: string;
  updatedAt: string;
  excerpt: string;
}

export const REPO = 'https://github.com/Arrow-air/project-quiver';
export const generatedAt: string = generated.generatedAt;
export const bom = generated.bom as BomGroup[];
export const tasks = (generated.tasks as unknown as Task[]).slice().sort((a, b) => Number(a.id.slice(2)) - Number(b.id.slice(2)));
export const issues = generated.issues as unknown as Issue[];
export const prs = prData.prs as PullRequest[];
export const bomMeta = generated.sources as { bomConfig: string; bomDate: string; bomTitle: string };

const parts = new Map(bom.flatMap((g) => g.items.map((i) => [i.id, i] as const)));
export const partById = (id: string) => parts.get(id);
export const taskById = (id: string) => tasks.find((t) => t.id === id);
export const issueByNumber = (n: number) => issues.find((i) => i.number === n) ?? tasks.find((t) => t.number === n);
export const prByNumber = (n: number) => prs.find((p) => p.number === n);
export const issueUrl = (n: number) => `${REPO}/issues/${n}`;
export const prUrl = (n: number) => `${REPO}/pull/${n}`;

/** "2026-09-29T17:36:02Z" → "Sep 29" */
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });

/** Funding lines as the labels name them. */
export const fundingNames: Record<string, string> = {
  'fund-QGB-01': 'QGB-01 Documentation',
  'fund-QGB-03': 'QGB-03 Endurance study',
  'fund-QGB-05': 'QGB-05 Attachments',
  'fund-QGB-FLEX': 'QGB-FLEX Open task pool',
  'fund-checkpoint': 'Priced at the October checkpoint',
  'fund-retro': 'Monthly retro',
};
