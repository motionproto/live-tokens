import { docContent } from './content.generated';

export interface Chapter {
  id: string;
  title: string;
}

/* The user-facing guide, shipped with the package so consumers reference it in
   the editor while building. Markdown lives in ./content/; the original
   developer-reference chapters stay in the repo's docs/archive/ and don't
   ship. */
export const chapters: Chapter[] = [
  { id: '01-overview',         title: 'Overview' },
  { id: 'getting-started',     title: 'Getting started' },
  { id: 'editing-tokens',      title: 'Editing tokens' },
  { id: 'themes-workflow',     title: 'Themes' },
  { id: 'creating-components', title: 'Creating components' },
];

export const chapterIds = chapters.map((c) => c.id);

/* Bodies come from the generated module, NOT `import.meta.glob('./content/*.md',
   '?raw')`: that glob is a Vite compile-time transform, and esbuild's
   optimizeDeps doesn't expand it inside a pre-bundled node_modules dep, so the
   guide threw "Chapter not found" in tarball consumers. Edit ./content/*.md
   then run `npm run sync:docs` to regenerate. */
export async function loadChapter(id: string): Promise<string> {
  const md = docContent[id];
  if (md === undefined) {
    throw new Error(`Chapter not found: ${id}`);
  }
  return md;
}

export function chapterNeighbours(id: string): { prev: Chapter | null; next: Chapter | null } {
  const idx = chapterIds.indexOf(id);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? chapters[idx - 1] : null,
    next: idx < chapters.length - 1 ? chapters[idx + 1] : null,
  };
}
