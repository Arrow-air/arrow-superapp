// Longshot's public material for the app, generated at build time like
// Quiver's: issues and pull requests from GitHub (through gh), and the
// build123d bill of materials from a project-longshot checkout. Read-only:
// nothing in the app writes back to GitHub.
//   LONGSHOT_REPO=/path/to/project-longshot node scripts/build-longshot.mjs   (reads origin/main)
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SLUG = 'Arrow-air/project-longshot';
const REPO = process.env.LONGSHOT_REPO ?? `${process.env.HOME}/projects/project-longshot`;
const REF = process.env.LONGSHOT_REF ?? 'origin/main';
const git = (...args) => execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 64e6 }).toString();
const gh = (...args) => JSON.parse(execFileSync('gh', args, { maxBuffer: 64e6 }).toString());

// The first paragraph of a body, without markdown furniture, for a one-line excerpt.
const excerpt = (body = '') => body
  .replace(/<!--[\s\S]*?-->/g, '')
  .split(/\n\s*\n/)
  .map((p) => p.replace(/^#+\s.*$/gm, '').replace(/[*_`>#|]/g, '').replace(/\s+/g, ' ').trim())
  .find((p) => p.length > 30)?.slice(0, 280) ?? '';

const issues = gh('issue', 'list', '-R', SLUG, '--state', 'all', '--limit', '300', '--json', 'number,title,state,labels,url,body,createdAt,updatedAt,closedAt,author,assignees')
  .map((i) => ({
    number: i.number, title: i.title, state: i.state, url: i.url,
    labels: i.labels.map((l) => l.name), author: i.author?.login ?? null, assignees: i.assignees.map((a) => a.login),
    createdAt: i.createdAt, updatedAt: i.updatedAt, closedAt: i.closedAt ?? null, excerpt: excerpt(i.body),
  }))
  .sort((a, b) => b.number - a.number);
const prs = gh('pr', 'list', '-R', SLUG, '--state', 'all', '--limit', '300', '--json', 'number,title,state,isDraft,url,body,createdAt,updatedAt,mergedAt,author')
  .map((p) => ({
    number: p.number, title: p.title, state: p.state, draft: p.isDraft, url: p.url, author: p.author?.login ?? null,
    createdAt: p.createdAt, updatedAt: p.updatedAt, mergedAt: p.mergedAt ?? null, excerpt: excerpt(p.body),
  }))
  .sort((a, b) => b.number - a.number);

// The build123d BOM: one row per part number, with its quantity in the main assembly.
function csv(src) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
const BOM_PATH = 'engineering/cad/build123d/BOM.csv';
const [head, ...lines] = csv(git('show', `${REF}:${BOM_PATH}`));
const col = (name) => head.indexOf(name);
const bom = lines.map((r) => ({
  id: r[col('Part number')],
  description: r[col('Description')],
  qty: Number(r[col('Qty')]) || 0,
  category: r[col('Category')],
  makeBuy: r[col('Make/buy')],
  material: r[col('Material')] || null,
  source: r[col('build123d source')] || null,
  exports: r[col('Reference / export')] || null,
  validation: r[col('Validation')] || null,
}));

const out = {
  generatedAt: new Date().toISOString(),
  repo: `https://github.com/${SLUG}`,
  commit: git('rev-parse', '--short', REF).trim(),
  bomPath: BOM_PATH,
  bom,
  issues,
  prs,
};
writeFileSync(join(here, '..', 'src', 'data', 'generated', 'longshot.json'), JSON.stringify(out, null, 1));
console.log(`Longshot @ ${out.commit}: ${bom.length} BOM lines, ${issues.length} issues, ${prs.length} pull requests`);
