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

  /* On desktop the content column is the scroll region (the page is locked to
     the viewport), so navigation resets its scrollTop — see the scroll effect. */
  let scrollPane: HTMLElement | undefined;

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
        /* Rewrite intra-doc links to the hash router: `chapter.md` → `#chapter`,
           `chapter.md#anchor` → `#chapter~anchor` (the page joins chapter and
           anchor with `~`, not `#`). Chapter ids may be numbered or not. */
        const intra = rewritten.match(/^([a-z0-9-]+)\.md(?:#(.+))?$/i);
        if (intra) {
          rewritten = `#${intra[1]}${intra[2] ? `~${intra[2]}` : ''}`;
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

  /* After segments render, scroll to the anchor (deep link) or hard-reset to
     the top. Resetting the pane's own scrollTop is deterministic where the old
     scrollIntoView on <main> was not. Reset both the pane (desktop scroller)
     and the window (mobile, where the page scrolls) — the inactive one is a
     no-op. Every plain link lands on the masthead, the constant "top of page". */
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
      if (scrollPane) scrollPane.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  });

  /* ------------------------------------------------------------------ Lifecycle */
  onMount(() => {
    const handler = () => { hash = window.location.hash; };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  });
</script>

<svelte:head>
  <!-- Inter is not part of the theme's font set; load it just for the brand wordmark. -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap"
  />
</svelte:head>

<div class="docs-page">
  <div class="docs-shell" class:collapsed={!sidebarOpen}>
    <SideNavigation
      class="docs-sidebar"
      sections={navSections}
      titleLabel="Live Tokens"
      titleHref="#01-overview"
      currentPath={parsedHash.chapter}
      open={sidebarOpen}
      ontoggle={() => (sidebarOpen = !sidebarOpen)}
    >
      {#snippet lead()}
        <a class="rail-brand" href="https://motionproto.com/#top">MotionProto</a>
      {/snippet}

      {#snippet actions()}
        <div class="rail-actions">
          <a href="/demo" class="rail-action">
            <Button variant="outline" size="small" icon="fas fa-box-open" fullWidth>
              Demo Site
            </Button>
          </a>
          <a href="/components" class="rail-action">
            <Button variant="outline" size="small" icon="fas fa-puzzle-piece" fullWidth>
              Components
            </Button>
          </a>
        </div>
      {/snippet}
    </SideNavigation>

    <div class="docs-main" bind:this={scrollPane}>
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
</div>

<style>
  /* Full-bleed dark surface fills the viewport; the centered shell inside
     matches the demo page's 1440px band so navigating between docs and demo
     doesn't shift the content block left/right. On desktop the docs surface is
     locked to the viewport and only the content column scrolls (see the
     min-width: 961px block); below that it reverts to natural page scroll. */
  .docs-page {
    background: var(--surface-neutral-lowest, #040c13);
    color: var(--text-primary);
    min-height: 100vh;
  }
  .docs-shell {
    display: grid;
    grid-template-columns: var(--sidenavigation-panel-open-width, 16rem) minmax(0, 1fr);
    max-width: var(--columns-max-width, 1440px);
    margin: 0 auto;
    padding: 0 var(--space-32, 2rem);
    transition: grid-template-columns var(--duration-200, 200ms) var(--ease-in-out-sine, ease);
  }
  /* The rail's own width tween (its width tokens) drives the column; keep the
     grid track locked to the closed width so content reflows in step. */
  .docs-shell.collapsed {
    grid-template-columns: var(--sidenavigation-panel-closed-width, 3rem) minmax(0, 1fr);
  }

  .docs-main {
    min-width: 0;
    padding-bottom: var(--space-96, 6rem);
  }

  /* -------------------------------------------------------------- Top header */
  .docs-page-header {
    border-bottom: var(--border-width-1, 1px) solid var(--border-neutral-faint, #1c2327);
    padding: var(--space-48, 3rem) 0 var(--space-32, 2rem) var(--space-32, 2rem);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-neutral-lower, #162027) 50%, transparent),
      transparent
    );
  }
  .title-block {
    margin: 0;
  }
  .title-block .eyebrow {
    font-size: var(--font-size-xs, 0.75rem);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--text-accent, #009d9a);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wider, 0.12em);
    margin: 0 0 var(--space-8, 0.5rem);
  }
  .title-block h1 {
    font-family: var(--font-display, var(--font-sans));
    font-size: var(--font-size-5xl, 3rem);
    line-height: var(--line-height-xs, 1.1);
    letter-spacing: var(--letter-spacing-tight, -0.02em);
    margin: 0 0 var(--space-12, 0.75rem);
    color: var(--text-primary);
  }
  .title-block .lede {
    max-width: 60ch;
    color: var(--text-secondary);
    font-size: var(--font-size-md, 1rem);
    margin: 0;
  }

  /* -------------------------------------------------------------- Sidebar */
  /* Footer actions injected via SideNavigation's `actions` slot — the component
     owns the panel chrome and placement; this owns the gap below the nav and
     the button stacking. :global because the snippet renders inside the child. */
  :global(.rail-actions) {
    margin-top: var(--space-96, 6rem);
    display: flex;
    flex-direction: column;
    gap: var(--space-8, 0.5rem);
    padding: 0 var(--space-16, 1rem) var(--space-16, 1rem);
  }
  :global(.rail-action) {
    display: block;
    text-decoration: none;
  }

  /* MotionProto brand wordmark in the lead slot, matching the site's
     `text-lg sm:text-xl font-bold tracking-wide hover:text-primary
     transition-colors`. Inter and the literal Tailwind metrics (line-height,
     tracking) are deliberate brand exceptions; Inter is loaded in <svelte:head>. */
  :global(.rail-brand) {
    display: block;
    padding: var(--space-16, 1rem) var(--space-16, 1rem) var(--space-12, 0.75rem);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: var(--font-size-lg, 1.125rem);
    line-height: 1.75rem;
    font-weight: var(--font-weight-bold, 700);
    letter-spacing: 0.025em;
    color: var(--text-primary);
    text-decoration: none;
    cursor: pointer;
    transition: color var(--duration-150, 150ms) cubic-bezier(0.4, 0, 0.2, 1);
  }
  @media (min-width: 640px) {
    :global(.rail-brand) {
      font-size: var(--font-size-xl, 1.25rem);
    }
  }
  :global(.rail-brand:hover) {
    color: var(--text-brand);
  }

  /* -------------------------------------------------------------- Content */
  .docs-content {
    min-width: 0;
    max-width: 760px;
    outline: none;
    padding: var(--space-32, 2rem) 0 0 var(--space-32, 2rem);
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
    border: var(--border-width-2, 2px) solid var(--border-neutral-subtle, #3a4146);
    border-top-color: var(--text-accent, #009d9a);
    border-radius: var(--radius-full, 9999px);
    animation: spin var(--duration-750, 720ms) var(--ease-linear, linear) infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .prose {
    font-size: var(--font-size-md, 1rem);
    line-height: var(--line-height-lg, 1.65);
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
    letter-spacing: var(--letter-spacing-tight, -0.015em);
    line-height: var(--line-height-sm, 1.2);
    color: var(--text-primary);
    position: relative;
  }
  .prose :global(h2) {
    font-size: var(--font-size-2xl, 1.5rem);
    margin: var(--space-48, 3rem) 0 var(--space-16, 1rem);
    padding-top: var(--space-12, 0.75rem);
    border-top: var(--border-width-1, 1px) solid var(--border-neutral-faint, #1c2327);
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
    transition: opacity var(--duration-150, 120ms) var(--ease-in-out-sine, ease),
                color var(--duration-150, 120ms) var(--ease-in-out-sine, ease);
  }
  .prose :global(h1:hover .heading-anchor),
  .prose :global(h2:hover .heading-anchor),
  .prose :global(h3:hover .heading-anchor),
  .prose :global(h4:hover .heading-anchor) { opacity: 1; }
  .prose :global(.heading-anchor:hover) { color: var(--text-accent); }

  .prose :global(a:not(.heading-anchor)) {
    color: var(--text-accent, #009d9a);
    text-decoration: none;
    border-bottom: var(--border-width-1, 1px) solid color-mix(in srgb, var(--text-accent, #009d9a) 35%, transparent);
    transition: color var(--duration-150, 120ms) var(--ease-in-out-sine, ease),
                border-color var(--duration-150, 120ms) var(--ease-in-out-sine, ease);
  }
  .prose :global(a:not(.heading-anchor):hover) {
    color: color-mix(in srgb, var(--text-accent, #009d9a) 75%, var(--color-white, #fff));
    border-bottom-color: currentColor;
  }

  .prose :global(:not(pre) > code) {
    font-family: var(--font-mono, monospace);
    font-size: 0.875em;
    background: var(--surface-neutral-lower, #162027);
    color: var(--text-accent, #009d9a);
    padding: 0.15em 0.45em;
    border-radius: var(--radius-md, 0.25rem);
    border: var(--border-width-1, 1px) solid var(--border-neutral-faint, #1c2327);
    white-space: nowrap;
  }

  .prose :global(blockquote) {
    margin: 0 0 var(--space-20, 1.25rem);
    padding: var(--space-12, 0.75rem) var(--space-20, 1.25rem);
    border-left: var(--border-width-3, 3px) solid var(--text-accent, #009d9a);
    background: color-mix(in srgb, var(--surface-neutral-lower, #162027) 60%, transparent);
    border-radius: 0 var(--radius-md, 0.25rem) var(--radius-md, 0.25rem) 0;
    color: var(--text-secondary);
  }

  .prose :global(hr) {
    border: 0;
    border-top: var(--border-width-1, 1px) solid var(--border-neutral-faint, #1c2327);
    margin: var(--space-32, 2rem) 0;
  }

  /* GFM task lists (the verification checklists in archived chapters) */
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
    border-top: var(--border-width-1, 1px) solid var(--border-neutral-faint, #1c2327);
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
    letter-spacing: var(--letter-spacing-wider, 0.08em);
  }
  .chapter-link { text-decoration: none; }

  /* -------------------------------------------------------------- Responsive */
  /* Desktop: lock the docs surface to the viewport so only the content column
     scrolls — the rail is full-height and immovable, and there is never an
     empty band under the page. The router wrapper (.lt-app) assumes window-
     scroll pages (min-height + a 12rem bottom pad); neutralise that here, for
     the docs route only, via :has. The doubled .lt-app outranks the wrapper's
     own scoped rule on a specificity tie. */
  @media (min-width: 961px) {
    :global(.lt-app.lt-app:has(.docs-page)) {
      height: 100vh;
      min-height: 0;
      padding-bottom: 0;
      overflow: hidden;
    }
    .docs-page { height: 100%; overflow: hidden; }
    /* minmax(0, 1fr) pins the row to the viewport height so the pane below can
       scroll; an auto row would grow to content and break the scroll. */
    .docs-shell { height: 100%; grid-template-rows: minmax(0, 1fr); }
    .docs-main { height: 100%; overflow-y: auto; }
    .docs-shell :global(.docs-sidebar) { height: 100%; }
  }

  /* Below 960px the rail stacks above the content; the page scrolls naturally. */
  @media (max-width: 960px) {
    .docs-shell,
    .docs-shell.collapsed { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .docs-shell { padding: 0 var(--space-16, 1rem); }
  }
</style>
