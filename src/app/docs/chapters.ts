export interface Chapter {
  id: string;
  title: string;
}

export const chapters: Chapter[] = [
  { id: '01-overview',                    title: 'Overview' },
  { id: '02-architecture',                title: 'Architecture' },
  { id: '03-state-and-history',           title: 'State and history' },
  { id: '04-tokens-and-themes',           title: 'Tokens and themes' },
  { id: '05-component-system',            title: 'Component system' },
  { id: '06-dev-server-plugin',           title: 'Dev-server plugin' },
  { id: '07-overlay-and-routing',         title: 'Overlay and routing' },
  { id: '08-add-new-component',           title: 'Add a new component' },
  { id: '09-developer-recipes',           title: 'Developer recipes' },
  { id: '10-conventions-and-invariants',  title: 'Conventions and invariants' },
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
