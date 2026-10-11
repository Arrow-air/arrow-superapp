// Answers to a guide's open questions. Demo: kept in this browser. Live: the
// shared Supabase (sa_guide_answers), written through sa_guide_answer and
// sa_guide_answer_delete, readable by anyone. Loaded on its own rather than
// with the workspace, so until the table exists the guide still reads fine
// and only answering is switched off.
import { reactive } from 'vue';
import { remote, sb } from '../../lib/backend';
import { requireSignIn, say, session } from '../../lib/session';

export interface Answer {
  id: string;
  project: string;
  guide: string;
  question: string;
  /** '' for the process in general, else the build it was measured on. */
  build: string;
  value: string;
  note: string;
  /** 'me' for the visitor, else a member's user id. */
  authorId?: string;
  at: string;
  editedAt?: string;
}

export const answers = reactive({
  list: [] as Answer[],
  loaded: false,
  /** False when the live database doesn't have the table yet. */
  available: true,
  error: '',
});

const KEY = 'superapp:guide-answers.v1';
const readLocal = (): Answer[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Answer[]; } catch { return []; } };
const writeLocal = (all: Answer[]) => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage unavailable */ } };
const mine = (id: string | null | undefined) => (id && id === session.userId ? 'me' : id ?? undefined);
const MISSING = /PGRST205|42P01|sa_guide_answers.*(does not exist|schema cache)|could not find the table/i;
const OFFLINE = /failed to fetch|networkerror|load failed|network request failed|fetch failed/i;
const failed = (msg: string) => say(OFFLINE.test(msg) ? "Couldn't reach the server, so nothing was saved. Your answer is still here; try again." : msg);

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function loadAnswers(project: string, guide: string) {
  if (!remote) {
    answers.list = readLocal().filter((a) => a.project === project && a.guide === guide);
    answers.loaded = true;
    return;
  }
  const { data, error } = await sb!.from('sa_guide_answers').select('*').eq('project', project).eq('guide', guide).order('created_at');
  answers.loaded = true;
  if (error) {
    if (MISSING.test(`${error.code ?? ''} ${error.message}`)) answers.available = false;
    else answers.error = error.message;
    return;
  }
  answers.available = true;
  answers.error = '';
  answers.list = (data ?? []).map((r: any): Answer => ({
    id: r.id, project: r.project, guide: r.guide, question: r.question, build: r.build ?? '',
    value: r.value, note: r.note ?? '', authorId: mine(r.author_id), at: r.created_at, editedAt: r.edited_at ?? undefined,
  }));
}

/** Answer, or change your answer: one per person, question and build. */
export async function saveAnswer(a: { project: string; guide: string; question: string; build: string; value: string; note: string }): Promise<boolean> {
  const value = a.value.trim(), note = a.note.trim();
  if (!value) return false;
  if (!remote) {
    const all = readLocal();
    const now = new Date().toISOString();
    const i = all.findIndex((x) => x.project === a.project && x.guide === a.guide && x.question === a.question && x.build === a.build && x.authorId === 'me');
    if (i >= 0) { if (all[i].value !== value || all[i].note !== note) all[i] = { ...all[i], value, note, editedAt: now }; }
    else all.push({ id: `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ...a, value, note, authorId: 'me', at: now });
    writeLocal(all);
    await loadAnswers(a.project, a.guide);
    return true;
  }
  if (!requireSignIn()) return false;
  let error: { message: string } | null;
  try {
    ({ error } = await sb!.rpc('sa_guide_answer', { p_project: a.project, p_guide: a.guide, p_question: a.question, p_value: value, p_note: note, p_build: a.build }));
  } catch (e) { error = { message: String((e as Error)?.message ?? e) }; }
  if (error) { failed(error.message); return false; }
  await loadAnswers(a.project, a.guide);
  return true;
}

export async function removeAnswer(a: Answer): Promise<boolean> {
  if (!remote) {
    writeLocal(readLocal().filter((x) => x.id !== a.id));
    await loadAnswers(a.project, a.guide);
    return true;
  }
  if (!requireSignIn()) return false;
  let error: { message: string } | null;
  try { ({ error } = await sb!.rpc('sa_guide_answer_delete', { p_answer: a.id })); } catch (e) { error = { message: String((e as Error)?.message ?? e) }; }
  if (error) { failed(error.message); return false; }
  await loadAnswers(a.project, a.guide);
  return true;
}

/** Its author can remove an answer; live, a lead can too. */
export const canRemove = (a: Answer) => a.authorId === 'me' || (remote && session.member?.role === 'lead');
export const answersTo = (question: string) => answers.list.filter((a) => a.question === question);
