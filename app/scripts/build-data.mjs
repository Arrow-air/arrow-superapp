// Builds src/data/generated/quiver.json from the real, public Quiver material.
// Read-only: a local checkout of Arrow-air/project-quiver plus `gh issue list`.
// Nothing here is invented. Pretend interactions live in src/data/pretend.ts, not in this file.
//
//   QUIVER_SRC=/path/to/project-quiver QUIVER_SDK=/path/to/quiver-sdk node scripts/build-data.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = process.env.QUIVER_SRC ?? '/tmp/qsrc/project-quiver';
const SDK = process.env.QUIVER_SDK ?? '/tmp/qsrc/quiver-sdk';
const REPO = 'Arrow-air/project-quiver';
const read = (p) => readFileSync(p, 'utf8');

// ---- BOM -------------------------------------------------------------------
const bomFiles = readdirSync(join(SRC, 'bom')).filter((f) => /^[1-4]000-.*\.yaml$/.test(f)).sort();
const bom = bomFiles.map((f) => {
  const d = yaml.load(read(join(SRC, 'bom', f)));
  return {
    category: String(d.category),
    name: d.name,
    items: d.items.map((it) => ({
      id: String(it.id),
      name: it.name,
      qty: it.qty ?? 1,
      sourcing: it.sourcing ?? null,
      material: it.material ?? null,
      spec: it.spec ?? null,
      unitCostUsd: typeof it.unit_cost_usd === 'number' ? it.unit_cost_usd : null,
      designRef: it.design_ref ?? null,
      notes: it.notes ?? null,
      suppliers: (it.suppliers ?? []).map((s) => ({ name: s.name, partNumber: s.part_number ?? null, url: s.url ?? null, note: s.note ?? null })),
    })),
  };
});
const meta = yaml.load(read(join(SRC, 'bom', 'meta.yaml')));
const partIds = new Set(bom.flatMap((g) => g.items.map((i) => i.id)));

// ---- Issues and the task board ----------------------------------------------
const issuesRaw = JSON.parse(
  process.env.QUIVER_ISSUES
    ? read(process.env.QUIVER_ISSUES)
    : execFileSync('gh', ['issue', 'list', '-R', REPO, '--state', 'all', '--limit', '400', '--json', 'number,title,state,labels,body,createdAt,updatedAt,comments,url'], { maxBuffer: 64e6 }).toString(),
);

const tableField = (body, key) => {
  const m = new RegExp(`^\\|\\s*${key}\\s*\\|(.*)\\|\\s*$`, 'mi').exec(body);
  return m ? m[1].trim() : null;
};
// No issue names a BOM id today, so parts are linked by keyword. The app labels these links as inferred.
const PART_KEYWORDS = [
  [/attachment interface|payload rail|attachment (port|adapter)|quick.release/i, ['3331', '2112', '3310']],
  [/multispectral|payload latch|dispenser|spreader/i, ['2112', '3331']],
  [/battery|\bBMS\b/i, ['3410', '3320']],
  [/\bGPS\b|GNSS/i, ['3250', '3251', '2331']],
  [/ethernet switch/i, ['3313']],
  [/obstacle avoidance/i, ['3210', '3290']],
  [/\bRPi\b|raspberry|companion|quiverhub/i, ['3312']],
  [/12 ?V\b|main pcb/i, ['3310']],
  [/remote id/i, ['3202']],
];
const partsMentioned = (text) => {
  const ids = new Set([...text.matchAll(/\b([1-4]\d{3})\b/g)].map((m) => m[1]));
  for (const [re, list] of PART_KEYWORDS) if (re.test(text)) list.forEach((id) => ids.add(id));
  return [...ids].filter((id) => partIds.has(id));
};

// Topic tags by plain keyword match, so the app can file things under its three doors.
const TOPICS = {
  attachments: /attachment|payload|dispenser|multispectral|latch|gimbal|spreader/i,
  software: /quiverhub|sdk|firmware|ardupilot|companion|telemetry|parameter|software|api\b/i,
  market: /sales|marketing|manufactur|pricing|customer|operator|reliability/i,
  docs: /guide|handbook|documentation|docs\b|report/i,
  flight: /flight|endurance|failsafe|gps|pilot/i,
  power: /power|battery|12 ?v|rail|bms/i,
};
const topicsOf = (text) => Object.entries(TOPICS).filter(([, re]) => re.test(text)).map(([k]) => k);

const tasks = [];
const issues = [];
for (const i of issuesRaw.sort((a, b) => a.number - b.number)) {
  const labels = i.labels.map((l) => l.name);
  const body = i.body ?? '';
  const t = /^T-(\d+):\s*(.*)$/.exec(i.title);
  if (t && labels.includes('task-board')) {
    const status = /^\*\*Status:\s*(.*?)\*\*/m.exec(body)?.[1] ?? null;
    const priceText = tableField(body, 'Price');
    const priceUsd = priceText && /^\$[\d,]+\b/.test(priceText) && !/milestone/i.test(priceText.slice(0, 12)) ? Number(/^\$([\d,]+)/.exec(priceText)[1].replace(/,/g, '')) : null;
    const milestones = [...body.matchAll(/^\*\*Milestone (\d+),\s*(.*?)\*\*\s*\n+([^\n]+)/gm)].map((m) => ({ n: Number(m[1]), title: m[2], text: m[3] }));
    tasks.push({
      id: `T-${t[1].padStart(2, '0')}`,
      number: i.number,
      url: i.url,
      title: t[2],
      state: i.state,
      claimable: labels.includes('claimable'),
      fundingLabel: labels.find((l) => l.startsWith('fund-')) ?? null,
      priceText,
      priceUsd,
      fundingText: tableField(body, 'Funding line'),
      owner: tableField(body, 'Owner'),
      deadline: tableField(body, 'Deadline'),
      doneWhen: tableField(body, 'Done when'),
      status,
      whoShouldClaim: /\*\*Who should claim this\*\*\s*\n+([^\n]+)/.exec(body)?.[1] ?? null,
      milestones,
      body,
      topics: topicsOf(i.title + ' ' + (tableField(body, 'Done when') ?? '')),
      parts: partsMentioned(i.title + ' ' + (tableField(body, 'Done when') ?? '')),
      comments: i.comments.length,
      updatedAt: i.updatedAt,
    });
  } else {
    issues.push({
      number: i.number,
      url: i.url,
      title: i.title,
      state: i.state,
      labels,
      excerpt: body.replace(/\s+/g, ' ').slice(0, 420),
      topics: topicsOf(i.title + ' ' + body.slice(0, 400)),
      parts: partsMentioned(i.title + ' ' + body.slice(0, 400)),
      comments: i.comments.length,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    });
  }
}

// ---- Funding lines: only what the labels and task text state ------------------
const LINE_NAMES = {
  'fund-QGB-01': 'QGB-01 Documentation',
  'fund-QGB-03': 'QGB-03 Endurance Study',
  'fund-QGB-05': 'QGB-05 Attachment Development',
  'fund-QGB-FLEX': 'QGB-FLEX Open task pool',
  'fund-checkpoint': 'Priced at the October checkpoint',
  'fund-retro': 'Monthly retroactive $ARROW',
};
const statedBudget = {};
for (const t of tasks) {
  const m = /(QGB-\d\d)[^|]*?allocation of \$([\d,]+)/.exec(t.priceText ?? '');
  if (m) statedBudget['fund-' + m[1]] = { usd: Number(m[2].replace(/,/g, '')), source: t.id };
}
const fundingLines = Object.entries(LINE_NAMES).map(([label, name]) => {
  const ts = tasks.filter((t) => t.fundingLabel === label);
  return {
    label,
    name,
    statedBudgetUsd: statedBudget[label]?.usd ?? null,
    statedBudgetSource: statedBudget[label]?.source ?? null,
    pricedUsd: ts.reduce((a, t) => a + (t.priceUsd ?? 0), 0),
    unpriced: ts.filter((t) => t.priceUsd == null).length,
    tasks: ts.map((t) => t.id),
  };
});

// ---- Flight test records in the repo ----------------------------------------
const flights = [];
const ftDir = join(SRC, 'flight-test', 'PT3-TX');
if (existsSync(ftDir)) {
  for (const f of readdirSync(ftDir).filter((f) => /^\d+\.md$/.test(f)).sort()) {
    const s = read(join(ftDir, f));
    const g = (k) => new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(s)?.[1]?.trim() ?? null;
    const aim = /### 3\.1\. Test Aim\s+([\s\S]*?)\n###/.exec(s)?.[1]?.trim() ?? null;
    flights.push({ id: g('Flight ID') ?? f.replace('.md', ''), date: g('Date / Time'), location: g('Location'), aircraft: g('Aircraft Designation'), weather: g('Weather Condition'), wind: g('Wind Speed / Direction'), aim, path: `flight-test/PT3-TX/${f}` });
  }
}

// ---- Guides (title + outline; the developer guide in full for sentence pins) --
const outline = (md) => [...md.matchAll(/^(#{1,3})\s+(.+)$/gm)].filter((m) => !/^#\s*(Check|Install|\w+ all)/.test(m[0]) || m[1].length > 1).map((m) => ({ depth: m[1].length, text: m[2].trim() }));
const guideFiles = [
  ['Attachment and software', 'docs/Develop-Attachments-Software/Quiver-SDK-Developer-Guide.md'],
  ['Operate', 'docs/Operations/Pilot-Handbook.md'],
  ['Operate', 'docs/Operations/Maintenance-Guide.md'],
  ['Build', 'docs/Manufacturing/Manufacturing-Guide.md'],
  ['Build', 'docs/Manufacturing/BOM.md'],
];
const guides = guideFiles.filter(([, p]) => existsSync(join(SRC, p))).map(([group, p]) => {
  const md = read(join(SRC, p));
  return { group, path: p, title: /^#\s+(.+)$/m.exec(md)?.[1] ?? p, lines: md.split('\n').length, outline: outline(md).filter((h) => h.depth <= 2).slice(0, 40) };
});
const devGuideMd = read(join(SRC, guideFiles[0][1])).split(/\n(?=## 4\. )/)[0]; // sections 1 to 3

// ---- Attachment interface facts, quoted from PAYLOAD_SPEC.md ------------------
const spec = existsSync(join(SDK, 'PAYLOAD_SPEC.md')) ? read(join(SDK, 'PAYLOAD_SPEC.md')) : '';
const attachmentSpec = {
  status: /\*\*Status:\*\*\s*(.+?)\s*$/m.exec(spec)?.[1] ?? null,
  date: /\*\*Date:\*\*\s*(.+?)\s*$/m.exec(spec)?.[1] ?? null,
  purpose: /## 1\. Purpose\s+([\s\S]*?)\n---/.exec(spec)?.[1]?.trim() ?? null,
  url: 'https://github.com/Arrow-air/quiver-sdk/blob/main/PAYLOAD_SPEC.md',
};

const out = {
  generatedAt: new Date().toISOString(),
  sources: { repo: `https://github.com/${REPO}`, bomConfig: meta.config, bomDate: meta.date instanceof Date ? meta.date.toISOString().slice(0, 10) : String(meta.date), bomTitle: meta.title },
  bom,
  tasks,
  issues,
  fundingLines,
  flights,
  guides,
  devGuideMd,
  attachmentSpec,
};
const dest = join(here, '..', 'src', 'data', 'generated', 'quiver.json');
writeFileSync(dest, JSON.stringify(out, null, 1));
const cost = bom.flatMap((g) => g.items).reduce((a, i) => a + (i.unitCostUsd ?? 0) * i.qty, 0);
console.log(`parts ${partIds.size} · tasks ${tasks.length} (${tasks.filter((t) => t.claimable).length} claimable) · other issues ${issues.length} (${issues.filter((i) => i.state === 'OPEN').length} open) · flights ${flights.length} · guides ${guides.length} · BOM cost $${cost.toFixed(2)}`);
console.log('issues that name a BOM id:', issues.filter((i) => i.parts.length).length, '· tasks:', tasks.filter((t) => t.parts.length).length);
console.log('funding:', fundingLines.map((f) => `${f.label} $${f.pricedUsd}+${f.unpriced}u${f.statedBudgetUsd ? ' budget $' + f.statedBudgetUsd : ''}`).join(' | '));
