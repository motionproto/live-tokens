export interface Chapter {
  id: string;
  title: string;
}

/* The user-facing guide. The original developer-reference chapters were moved
   to docs/archive/ (off the non-recursive docs/*.md glob below), so they no
   longer render on the site. */
export const chapters: Chapter[] = [
  { id: '01-overview',         title: 'Overview' },
  { id: 'getting-started',     title: 'Getting started' },
  { id: 'editing-tokens',      title: 'Editing tokens' },
  { id: 'themes-workflow',     title: 'Themes' },
  { id: 'creating-components', title: 'Creating components' },
];

export const chapterIds = chapters.map((c) => c.id);

/* Vite resolves this glob at build time. The `?raw` query loads each .md
   file as a string, so the markdown lives next to the runtime page module
   and reloads on edit via HMR. */
const docModules = import.meta.glob<string>(
  '../../../docs/*.md',
  { query: '?raw', import: 'default' },
);

export async function loadChapter(id: string): Promise<string> {
  const key = `../../../docs/${id}.md`;
  const loader = docModules[key];
  if (!loader) {
    throw new Error(`Chapter not found: ${id} (expected at ${key}).`);
  }
  return loader();
}

export function chapterNeighbours(id: string): { prev: Chapter | null; next: Chapter | null } {
  const idx = chapterIds.indexOf(id);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? chapters[idx - 1] : null,
    next: idx < chapters.length - 1 ? chapters[idx + 1] : null,
  };
}
