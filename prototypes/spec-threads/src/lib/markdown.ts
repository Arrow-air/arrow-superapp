import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

/** Render user-written markdown to sanitized HTML. Everything users type goes through here. */
export function renderMarkdown(src: string): string {
  const html = marked.parse(src ?? '', { async: false }) as string;
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
