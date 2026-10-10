// The boards for each project's PCB page: copies each .kicad_pcb from the
// project's checkout into public/pcb/ (KiCanvas renders them in the browser)
// and lists their footprints into src/data/generated/.
//   QUIVER_REPO=/path/to/project-quiver node scripts/build-pcbs.mjs                (Quiver's four PCBs, reads origin/main)
//   LONGSHOT_REPO=/path/to/project-longshot node scripts/build-pcbs.mjs longshot   (Longshot's BMS board)
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PROJECTS = {
  quiver: {
    repo: process.env.QUIVER_REPO ?? `${process.env.HOME}/projects/project-quiver`,
    ref: process.env.QUIVER_REF ?? 'origin/main',
    out: 'pcbs.json',
    boards: [
      { id: 'main', name: 'Main PCB', short: 'Main', part: '3310', path: 'src/pcb/main_pcb/Quiver_PT3_Main_PCB-rounded.kicad_pcb' },
      { id: 'fc', name: 'Flight controller PCB', short: 'Flight controller', part: '3330', path: 'src/pcb/fc_pcb/Quiver_PT3_FC_PCB.kicad_pcb' },
      { id: 'battery', name: 'Battery PCB', short: 'Battery', part: '3320', path: 'src/pcb/battery_pcb/Front_PCB.kicad_pcb' },
      { id: 'attach', name: 'Attachment interface PCB', short: 'Attachment', part: '3331', path: 'src/pcb/attach_pcb/QuiverAttachPCB.kicad_pcb' },
    ],
  },
  // BMSJ is the full BMS design (imported from Julius-eng/Vector-BMS). BMSZ and
  // the KiCad SL_PCB are reduced to a basic layout, so there is nothing to click on yet.
  longshot: {
    repo: process.env.LONGSHOT_REPO ?? `${process.env.HOME}/projects/project-longshot`,
    ref: process.env.LONGSHOT_REF ?? 'origin/main',
    out: 'longshot-pcbs.json',
    boards: [
      { id: 'bmsj', name: 'BMSJ battery management board', short: 'BMSJ', part: '', path: 'engineering/electronics/pcbs/BMSJ/kicad/BMSJ.kicad_pcb' },
    ],
  },
};
const PROJECT = process.argv[2] ?? 'quiver';
const { repo: REPO, ref: REF, out: OUT, boards: BOARDS } = PROJECTS[PROJECT];

// Minimal S-expression reader: enough to walk footprints and their properties.
function parse(src) {
  let i = 0;
  const n = src.length;
  function node() {
    const out = [];
    i++; // (
    while (i < n) {
      const c = src[i];
      if (c === ')') { i++; return out; }
      if (c === '(') { out.push(node()); continue; }
      if (c === '"') {
        let s = ''; i++;
        while (i < n && src[i] !== '"') { if (src[i] === '\\') { s += src[i + 1]; i += 2; } else s += src[i++]; }
        i++; out.push(s); continue;
      }
      if (/\s/.test(c)) { i++; continue; }
      let s = '';
      while (i < n && !/[\s()]/.test(src[i])) s += src[i++];
      out.push(s);
    }
    return out;
  }
  while (src[i] !== '(') i++;
  return node();
}

const commit = execFileSync('git', ['-C', REPO, 'rev-parse', '--short', REF]).toString().trim();
const out = { generatedAt: new Date().toISOString(), commit, boards: [] };
for (const b of BOARDS) {
  const src = execFileSync('git', ['-C', REPO, 'show', `${REF}:${b.path}`], { maxBuffer: 64e6 }).toString();
  writeFileSync(join(here, '..', 'public', 'pcb', `${b.id}.kicad_pcb`), src);
  const tree = parse(src);
  const footprints = tree.filter((x) => Array.isArray(x) && x[0] === 'footprint').map((f) => {
    const prop = (k) => f.find((x) => Array.isArray(x) && x[0] === 'property' && x[1] === k)?.[2] ?? '';
    const layer = f.find((x) => Array.isArray(x) && x[0] === 'layer')?.[1] ?? '';
    const at = f.find((x) => Array.isArray(x) && x[0] === 'at');
    return { ref: prop('Reference'), value: prop('Value'), footprint: String(f[1]).split(':').pop(), description: prop('Description'), layer, x: Number(at?.[1] ?? 0), y: Number(at?.[2] ?? 0) };
  }).filter((f) => f.ref && !f.ref.startsWith('#') && !/^(REF\*\*|G\*\*\*|LOGO)/.test(f.ref));
  out.boards.push({ ...b, file: `pcb/${b.id}.kicad_pcb`, footprints });
  console.log(`${b.name}: ${footprints.length} footprints (${(src.length / 1e6).toFixed(1)} MB)`);
}
writeFileSync(join(here, '..', 'src', 'data', 'generated', OUT), JSON.stringify(out, null, 1));
