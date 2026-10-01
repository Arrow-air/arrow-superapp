import type { IconName } from '../../frame/icons';
import type { ThreadType } from './data';

// How each kind of thread looks everywhere it appears. Colours are the
// --type-* tokens: questions grass, proposals teal, ideas amber. From
// Gavin's app-frame (2026-10-01).
export const threadTypes: Record<ThreadType, { label: string; icon: IconName; hint: string }> = {
  question: { label: 'Question', icon: 'question', hint: 'Something you need answered' },
  proposal: { label: 'Proposal', icon: 'branch', hint: 'A change you want decided' },
  idea: { label: 'Idea', icon: 'bulb', hint: 'Worth exploring, no decision yet' },
};
export const typeStyle = (t: ThreadType) => ({ '--tfg': `var(--type-${t})`, '--tbg': `var(--type-${t}-bg)` });
