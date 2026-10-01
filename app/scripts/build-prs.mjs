// Open pull requests on project-quiver, for the Work tab. Read-only: `gh pr list`.
//   node scripts/build-prs.mjs
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(
  execFileSync('gh', ['pr', 'list', '-R', 'Arrow-air/project-quiver', '--state', 'open', '--limit', '100',
    '--json', 'number,title,author,isDraft,url,createdAt,updatedAt,body'], { maxBuffer: 64e6 }).toString(),
);
const prs = raw.map((p) => ({
  number: p.number,
  title: p.title,
  author: p.author?.login ?? null,
  draft: p.isDraft,
  url: p.url,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  excerpt: (p.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 280),
}));
writeFileSync(join(here, '..', 'src', 'data', 'generated', 'prs.json'), JSON.stringify({ generatedAt: new Date().toISOString(), prs }, null, 1));
console.log(`open PRs ${prs.length}`);
