// The guide as one Markdown file, with every answer given so far, so it can
// go into the repository's docs once a build has filled it in.
import type { Answer } from './store';
import type { Guide, GuideLine } from './types';

export interface MarkdownNames {
  nameOf: (id?: string) => string;
  partName: (id: string) => string;
  buildLabel: (id: string) => string;
  issueUrl: (n: number) => string;
  day: (iso: string) => string;
}

const line = (l: GuideLine) => `${l.practice ? '*Common practice:* ' : ''}${l.text}${l.source ? ` ([${l.source.label}](${l.source.url}))` : ''}`;

export function guideMarkdown(g: Guide, list: Answer[], n: MarkdownNames, today: string): string {
  const out: string[] = [];
  const open = g.steps.reduce((k, s) => k + s.questions.filter((q) => !list.some((a) => a.question === q.id)).length, 0);
  out.push(`# ${g.title}`, '');
  out.push(`> Draft for ${g.subject}, assembled from the project's record on ${today}. Lines marked *common practice* are not the project's spec yet. ${open} questions are still open; each step lists its own.`, '');
  out.push(g.intro, '');
  if (g.variantNote) out.push(g.variantNote, '');
  out.push(`Sources: ${g.sources.map((s) => `[${s.label}](${s.url})`).join(' · ')}`, '');
  let k = 0;
  g.phases.forEach((ph, pi) => {
    const steps = g.steps.filter((s) => s.phase === ph.id);
    if (!steps.length) return;
    out.push(`## ${pi + 1}. ${ph.title}`, '', ph.summary, '');
    for (const s of steps) {
      k++;
      out.push(`### Step ${k}: ${s.title}`, '', `**Done when:** ${s.goal}`, '');
      if (s.parts?.length) out.push('**Parts**', ...s.parts.map((p) => `- ${p.qty} × ${n.partName(p.id)} (\`${p.id}\`)`), '');
      if (s.tools?.length) out.push('**Tools and supplies**', ...s.tools.map((t) => `- ${line(t)}`), '');
      out.push('**How**', ...s.how.map((h, i) => `${i + 1}. ${line(h)}`), '');
      if (s.checks?.length) out.push('**Check before moving on**', ...s.checks.map((c) => `- [ ] ${line(c)}`), '');
      if (s.safety?.length) out.push('**Safety**', ...s.safety.map((c) => `- ${line(c)}`), '');
      if (s.questions.length) {
        out.push('**Questions**');
        for (const q of s.questions) {
          const given = list.filter((a) => a.question === q.id);
          if (!given.length) {
            out.push(`- **${q.text}** Open. ${q.why}${q.ask ? ` Ask ${n.nameOf(q.ask)}.` : ''}`);
            continue;
          }
          out.push(`- **${q.text}**`);
          for (const a of given) {
            const what = `${a.value}${q.unit && q.kind === 'number' ? ` ${q.unit}` : ''}`;
            out.push(`  - ${what}${a.note ? `: ${a.note}` : ''} (${n.nameOf(a.authorId)}, ${n.day(a.editedAt ?? a.at)}${a.build ? `, ${n.buildLabel(a.build)}` : ''})`);
          }
        }
        out.push('');
      }
      if (s.shots?.length) out.push('**Photos to take**', ...s.shots.map((x) => `- [ ] ${x}`), '');
      const rel = [
        ...(s.issues ?? []).map((i) => `[#${i}](${n.issueUrl(i)})`),
        ...(s.threads ?? []),
      ];
      if (rel.length) out.push(`Related: ${rel.join(' · ')}`, '');
    }
  });
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
