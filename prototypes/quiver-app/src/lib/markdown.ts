import { marked } from 'marked';
import DOMPurify from 'dompurify';
export const md = (s: string) => DOMPurify.sanitize(marked.parse(s, { async: false, gfm: true }) as string);
