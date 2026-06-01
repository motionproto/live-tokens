<script module lang="ts">
  /* highlight.js core + the languages used across the docs.
     Registered once at module load so every CodeBlock instance shares the
     same registry. */
  import hljs from 'highlight.js/lib/core';
  import typescript from 'highlight.js/lib/languages/typescript';
  import javascript from 'highlight.js/lib/languages/javascript';
  import bash from 'highlight.js/lib/languages/bash';
  import scss from 'highlight.js/lib/languages/scss';
  import css from 'highlight.js/lib/languages/css';
  import json from 'highlight.js/lib/languages/json';
  import xml from 'highlight.js/lib/languages/xml';
  import plaintext from 'highlight.js/lib/languages/plaintext';

  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('ts',         typescript);
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('js',         javascript);
  hljs.registerLanguage('bash',       bash);
  hljs.registerLanguage('sh',         bash);
  hljs.registerLanguage('shell',      bash);
  hljs.registerLanguage('css',        css);
  hljs.registerLanguage('scss',       scss);
  hljs.registerLanguage('json',       json);
  hljs.registerLanguage('jsonc',      json);
  hljs.registerLanguage('xml',        xml);
  hljs.registerLanguage('html',       xml);
  hljs.registerLanguage('svelte',     xml);
  hljs.registerLanguage('plaintext',  plaintext);
</script>

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { marked, type Tokens } from 'marked';

  import Button from '../../system/components/Button.svelte';
  import Notification from '../../system/components/Notification.svelte';
  import SectionDivider from '../../system/components/SectionDivider.svelte';
  import SideNavigation, { type SideNavSection } from '../../system/components/SideNavigation.svelte';
  import Table from '../../system/components/Table.svelte';

  import CodeBlock from './CodeBlock.svelte';
  import MermaidDiagram from './MermaidDiagram.svelte';
  import {
    chapters,
    chapterIds,
    loadChapter,
    chapterNeighbours,
    type Chapter,
  } from './chapters';

  type Segment =
    | { kind: 'html';     html: string }
    | { kind: 'code';     lang: string | undefined; text: string }
    | { kind: 'mermaid';  source: string }
    | { kind: 'table';    html: string };

  /* ------------------------------------------------------------------ State */
  let hash = $state(typeof window !== 'undefined' ? window.location.hash : '');
  let segments = $state<Segment[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let chapterMeta = $state<Chapter | null>(null);

  /* Parse `/docs#editing-tokens~palettes` → chapter `editing-tokens`, anchor `palettes`.
     Using `~` as the delimiter keeps each part valid for an HTML id. */
  let parsedHash = $derived.by(() => {
    const raw = hash.replace(/^#/, '');
    const [chapter, anchor] = raw.split('~');
    const validChapter = chapterIds.includes(chapter) ? chapter : chapterIds[0];
    return { chapter: validChapter, anchor: anchor ?? null };
  });

  let neighbours = $derived(chapterNeighbours(parsedHash.chapter));

  /* Sidebar open/closed state. The SideNavigation toggle button dispatches
     `ontoggle`; this parent owns the actual boolean so layout reflows beside it. */
  let sidebarOpen = $state(true);

  /* Item paths match the chapter id verbatim so
     `currentPath={parsedHash.chapter}` lights up the active row. */
  const navSections: SideNavSection[] = [
    {
      path: 'guide',
      title: 'Guide',
      items: [
        { path: '01-overview',         title: 'Overview' },
        { path: 'getting-started',     title: 'Getting started' },
        { path: 'editing-tokens',      title: 'Editing tokens' },
        { path: 'themes-workflow',     title: 'Themes' },
        { path: 'creating-components', title: 'Creating components' },
      ],
    },
  ];

  /* ------------------------------------------------------------------ Marked configuration */
  function slug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
  }

  /* `currentChapterId` is read by the renderer overrides when emitting anchor
     hrefs. Set per render before calling `marked.parser`. */
  let currentChapterId = '';

  marked.use({
    gfm: true,
    breaks: false,
    renderer: {
      heading(token: Tokens.Heading): string {
        const text = (this as any).parser.parseInline(token.tokens);
        const raw = token.tokens.map((t: any) => ('text' in t ? t.text : '')).join('');
        const id = slug(raw);
        const link = `#${currentChapterId}~${id}`;
        return `<h${token.depth} id="${id}">${text}<a class="heading-anchor" href="${link}" aria-label="permalink">#</a></h${token.depth}>`;
      },
      link(token: Tokens.Link): string {
        const text = (this as any).parser.parseInline(token.tokens);
        let rewritten = token.href ?? '';
        if (/^\d{2}-[a-z0-9-]+\.md(#.*)?$/.test(rewritten)) {
          rewritten = '#' + rewritten.replace(/\.md/, '');
        }
        const isExt = /^https?:\/\//.test(rewritten);
        const attrs = isExt ? ' target="_blank" rel="noopener"' : '';
        const titleAttr = token.title ? ` title="${token.title.replace(/"/g, '&quot;')}"` : '';
        return `<a href="${rewritten}"${attrs}${titleAttr}>${text}</a>`;
      },
    },
  });

  /* ------------------------------------------------------------------ Segmenting */
  function segmentMarkdown(md: string): Segment[] {
    /* Drop the first H1 since the page chrome renders the chapter title via
       SectionDivider. */
    const tokens = marked.lexer(md) as Tokens.Generic[];
    let strippedFirstH1 = false;
    const filtered = tokens.filter((t) => {
      if (!strippedFirstH1 && t.type === 'heading' && (t as Tokens.Heading).depth === 1) {
        strippedFirstH1 = true;
        return false;
      }
      return true;
    });

    const out: Segment[] = [];
    let buffer: Tokens.Generic[] = [];

    const flush = () => {
      if (buffer.length === 0) return;
      out.push({ kind: 'html', html: marked.parser(buffer as any) });
      buffer = [];
    };

    for (const t of filtered) {
      if (t.type === 'code' && (t as Tokens.Code).lang === 'mermaid') {
        flush();
        out.push({ kind: 'mermaid', source: (t as Tokens.Code).text });
      } else if (t.type === 'code') {
        flush();
        out.push({ kind: 'code', lang: (t as Tokens.Code).lang, text: (t as Tokens.Code).text });
      } else if (t.type === 'table') {
        flush();
        out.push({ kind: 'table', html: marked.parser([t] as any) });
      } else {
        buffer.push(t);
      }
    }
    flush();
    return out;
  }

  /* ------------------------------------------------------------------ Loading */
  async function fetchChapter(id: string) {
    loading = true;
    error = null;
    try {
      const md = await loadChapter(id);
      currentChapterId = id;
      segments = segmentMarkdown(md);
      chapterMeta = chapters.find((c) => c.id === id) ?? null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      segments = [];
      chapterMeta = null;
    } finally {
      loading = false;
    }
  }

  /* When the chapter changes (hash change), refetch and reset scroll/anchor. */
  $effect(() => {
    const id = parsedHash.chapter;
    fetchChapter(id);
  });

  /* After segments render, scroll to anchor (or top of content). */
  $effect(() => {
    const anchor = parsedHash.anchor;
    if (segments.length === 0) return;
    tick().then(() => {
      if (anchor) {
        const el = document.getElementById(anchor);
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'start' });
          return;
        }
      }
      const top = document.getElementById('docs-content-top');
      if (top) top.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
  });

  /* ------------------------------------------------------------------ Lifecycle */
  onMount(() => {
    const handler = () => { hash = window.location.hash; };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  });
</script>

<div class="docs-page">
  <header class="docs-page-header">
    <div class="title-block">
      <p class="eyebrow">Live Tokens</p>
      <h1>Documentation</h1>
      <p class="lede">
        Set up a project, edit your tokens live, and ship a theme. A short
        guide to styling and building with Live Tokens.
      </p>
    </div>
  </header>

  <div class="docs-layout" class:collapsed={!sidebarOpen}>
    <SideNavigation
      class="docs-sidebar"
      sections={navSections}
      titleLabel="Live Tokens"
      titleHref="#01-overview"
      currentPath={parsedHash.chapter}
      open={sidebarOpen}
      ontoggle={() => (sidebarOpen = !sidebarOpen)}
    />

    <main class="docs-content" id="docs-content-top" tabindex="-1">
      {#if chapterMeta}
        <SectionDivider title={chapterMeta.title} variant="lg" />
      {/if}

      {#if error}
        <Notification
          title="Could not load chapter"
          description={error}
          variant="warning"
        />
      {:else if loading && segments.length === 0}
        <p class="loading-row">
          <span class="spinner" aria-hidden="true"></span>
          Loading...
        </p>
      {:else}
        <article class="prose">
          {#each segments as seg, i (i)}
            {#if seg.kind === 'html'}
              <div class="md-html">{@html seg.html}</div>
            {:else if seg.kind === 'code'}
              <CodeBlock lang={seg.lang} text={seg.text} />
            {:else if seg.kind === 'mermaid'}
              <MermaidDiagram source={seg.source} />
            {:else if seg.kind === 'table'}
              <Table>{@html seg.html}</Table>
            {/if}
          {/each}
        </article>

        <nav class="chapter-footer" aria-label="Chapter navigation">
          <div class="footer-slot prev">
            {#if neighbours.prev}
              <span class="footer-dir">Previous</span>
              <a class="chapter-link" href={`#${neighbours.prev.id}`}>
                <Button variant="outline" size="small" icon="fas fa-arrow-left">
                  {neighbours.prev.title}
                </Button>
              </a>
            {/if}
          </div>
          <div class="footer-slot next">
            {#if neighbours.next}
              <span class="footer-dir">Next</span>
              <a class="chapter-link" href={`#${neighbours.next.id}`}>
                <Button variant="outline" size="small" icon="fas fa-arrow-right" iconPosition="right">
                  {neighbours.next.title}
                </Button>
              </a>
            {/if}
          </div>
        </nav>
      {/if}
    </main>
  </div>
</div>

<style>
  .docs-page {
    background: var(--surface-neutral-lowest, #040c13);
    color: var(--text-primary);
    min-height: 100vh;
    padding-bottom: var(--space-96, 6rem);
  }

  /* -------------------------------------------------------------- Top header */
  .docs-page-header {
    border-bottom: 1px solid var(--border-neutral-faint, #1c2327);
    padding: var(--space-48, 3rem) var(--space-24, 1.5rem) var(--space-32, 2rem);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-neutral-lower, #162027) 50%, transparent),
      transparent
    );
  }
  .title-block {
    max-width: 1320px;
    margin: 0 auto;
    padding-left: 280px;
  }
  .title-block .eyebrow {
    font-size: var(--font-size-xs, 0.75rem);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--text-accent, #009d9a);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin: 0 0 var(--space-8, 0.5rem);
  }
  .title-block h1 {
    font-family: var(--font-display, var(--font-sans));
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.1;
    letter-spacing: -0.02em;
    margin: 0 0 var(--space-12, 0.75rem);
    color: var(--text-primary);
  }
  .title-block .lede {
    max-width: 60ch;
    color: var(--text-secondary);
    font-size: var(--font-size-md, 1rem);
    margin: 0;
  }

  /* -------------------------------------------------------------- Layout */
  .docs-layout {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    gap: var(--space-48, 3rem);
    max-width: 1320px;
    margin: 0 auto;
    padding: var(--space-32, 2rem) var(--space-24, 1.5rem) 0;
    transition: grid-template-columns var(--duration-200, 200ms) ease;
  }
  /* When the rail collapses to its toggle strip, the article reclaims the column. */
  .docs-layout.collapsed {
    grid-template-columns: 56px minmax(0, 1fr);
    gap: var(--space-24, 1.5rem);
  }

  /* -------------------------------------------------------------- Sidebar */
  /* SideNavigation owns its chrome; this wrapper rule just pins the rail to
     the viewport while the article scrolls. */
  :global(.docs-sidebar) {
    position: sticky;
    top: var(--space-24, 1.5rem);
    align-self: start;
    max-height: calc(100vh - var(--space-48, 3rem));
  }

  /* -------------------------------------------------------------- Content */
  .docs-content {
    min-width: 0;
    max-width: 760px;
    outline: none;
  }

  .loading-row {
    display: inline-flex;
    align-items: center;
    gap: var(--space-12, 0.75rem);
    color: var(--text-tertiary);
    padding: var(--space-32, 2rem) 0;
  }
  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid var(--border-neutral-subtle, #3a4146);
    border-top-color: var(--text-accent, #009d9a);
    border-radius: var(--radius-full, 9999px);
    animation: spin 720ms linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .prose {
    font-size: var(--font-size-md, 1rem);
    line-height: 1.65;
  }
  .prose :global(p),
  .prose :global(ul),
  .prose :global(ol) {
    margin: 0 0 var(--space-16, 1rem);
    color: var(--text-secondary, #c2cacf);
    max-width: 68ch;
  }
  .prose :global(p) { max-width: 70ch; }
  .prose :global(ul),
  .prose :global(ol) { padding-left: var(--space-24, 1.5rem); }
  .prose :global(li) { margin-bottom: var(--space-6, 0.375rem); }
  .prose :global(li::marker) { color: var(--text-tertiary); }
  .prose :global(strong) {
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold, 600);
  }
  .prose :global(em) { color: var(--text-primary); font-style: italic; }

  .prose :global(h1),
  .prose :global(h2),
  .prose :global(h3),
  .prose :global(h4) {
    font-family: var(--font-display, var(--font-sans));
    font-weight: var(--font-weight-semibold, 600);
    letter-spacing: -0.015em;
    line-height: 1.2;
    color: var(--text-primary);
    position: relative;
  }
  .prose :global(h2) {
    font-size: clamp(1.4rem, 2.2vw, 1.7rem);
    margin: var(--space-48, 3rem) 0 var(--space-16, 1rem);
    padding-top: var(--space-12, 0.75rem);
    border-top: 1px solid var(--border-neutral-faint, #1c2327);
  }
  .prose :global(h3) {
    font-size: var(--font-size-xl, 1.25rem);
    margin: var(--space-32, 2rem) 0 var(--space-12, 0.75rem);
  }
  .prose :global(h4) {
    font-size: var(--font-size-lg, 1.125rem);
    margin: var(--space-24, 1.5rem) 0 var(--space-8, 0.5rem);
    color: var(--text-secondary);
  }

  .prose :global(.heading-anchor) {
    margin-left: var(--space-8, 0.5rem);
    color: var(--text-tertiary);
    text-decoration: none;
    font-weight: var(--font-weight-normal);
    font-size: 0.7em;
    opacity: 0;
    transition: opacity 120ms ease, color 120ms ease;
  }
  .prose :global(h1:hover .heading-anchor),
  .prose :global(h2:hover .heading-anchor),
  .prose :global(h3:hover .heading-anchor),
  .prose :global(h4:hover .heading-anchor) { opacity: 1; }
  .prose :global(.heading-anchor:hover) { color: var(--text-accent); }

  .prose :global(a:not(.heading-anchor)) {
    color: var(--text-accent, #009d9a);
    text-decoration: none;
    border-bottom: 1px solid color-mix(in srgb, var(--text-accent, #009d9a) 35%, transparent);
    transition: color 120ms ease, border-color 120ms ease;
  }
  .prose :global(a:not(.heading-anchor):hover) {
    color: color-mix(in srgb, var(--text-accent, #009d9a) 75%, #fff);
    border-bottom-color: currentColor;
  }

  .prose :global(:not(pre) > code) {
    font-family: var(--font-mono, monospace);
    font-size: 0.875em;
    background: var(--surface-neutral-lower, #162027);
    color: var(--text-accent, #009d9a);
    padding: 0.15em 0.45em;
    border-radius: var(--radius-md, 0.25rem);
    border: 1px solid var(--border-neutral-faint, #1c2327);
    white-space: nowrap;
  }

  .prose :global(blockquote) {
    margin: 0 0 var(--space-20, 1.25rem);
    padding: var(--space-12, 0.75rem) var(--space-20, 1.25rem);
    border-left: 3px solid var(--text-accent, #009d9a);
    background: color-mix(in srgb, var(--surface-neutral-lower, #162027) 60%, transparent);
    border-radius: 0 var(--radius-md, 0.25rem) var(--radius-md, 0.25rem) 0;
    color: var(--text-secondary);
  }

  .prose :global(hr) {
    border: 0;
    border-top: 1px solid var(--border-neutral-faint, #1c2327);
    margin: var(--space-32, 2rem) 0;
  }

  /* GFM task lists (the verification checklists in chapter 08) */
  .prose :global(ul.contains-task-list) { list-style: none; padding-left: var(--space-4); }
  .prose :global(li.task-list-item) {
    display: flex;
    align-items: flex-start;
    gap: var(--space-8, 0.5rem);
  }
  .prose :global(li.task-list-item input[type="checkbox"]) {
    margin-top: 0.32em;
    accent-color: var(--text-accent, #009d9a);
  }

  /* -------------------------------------------------------------- Footer */
  .chapter-footer {
    margin-top: var(--space-48, 3rem);
    padding-top: var(--space-24, 1.5rem);
    border-top: 1px solid var(--border-neutral-faint, #1c2327);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-16, 1rem);
    align-items: end;
  }
  .footer-slot { display: flex; flex-direction: column; gap: var(--space-6, 0.375rem); }
  .footer-slot.next { align-items: flex-end; }
  .footer-dir {
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .chapter-link { text-decoration: none; }

  /* -------------------------------------------------------------- Responsive */
  @media (max-width: 960px) {
    .title-block { padding-left: 0; }
    .docs-layout { grid-template-columns: 1fr; }
    :global(.docs-sidebar) {
      position: static;
      max-height: none;
    }
  }
</style>
