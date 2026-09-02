<script lang="ts">
  import Button from '../../system/components/Button.svelte';
  import CodeSnippet from '../../system/components/CodeSnippet.svelte';
  import SectionDivider from '../../system/components/SectionDivider.svelte';
  import Panel from '../../system/components/Panel.svelte';
  import { navigate } from '../../editor/core/routing/router';

  const skills = [
    { icon: 'fas fa-list-check', name: 'pick-component' },
    { icon: 'fas fa-table-columns', name: 'build-page' },
    { icon: 'fas fa-cube', name: 'create-component' },
    { icon: 'fas fa-palette', name: 'generate-theme' },
    { icon: 'fas fa-font', name: 'pair-fonts' },
    { icon: 'fas fa-ruler-combined', name: 'adjust-geometry' },
    { icon: 'fas fa-clipboard-list', name: 'check-compliance' },
    { icon: 'fas fa-check-double', name: 'fix-findings' }
  ];
</script>

<section class="claude">
  <SectionDivider
    title="With Claude skills (of course)"
    eyebrow="Pairs with Claude Code"
  />

  <div class="panel-col">
    <Panel>
      <ul class="skills">
        {#each skills as skill}
          <li class="skill">
            <i class="{skill.icon} skill-icon"></i>
            <span class="skill-name">{skill.name}</span>
          </li>
        {/each}
      </ul>
    </Panel>
  </div>

  <div class="copy">
    <p class="intro">
      LiveTokens includes eight skills to build new components, themes, and pages, and to check what you have and bring it back into line.
    </p>

    <div class="install">
      <CodeSnippet code="npx @motion-proto/live-tokens setup-claude" />
      <p class="install-caption">Run this once to copy them into your project.</p>
    </div>

    <div class="atlas">
      <Button variant="primary" onclick={() => navigate('/skills')} icon="fas fa-diagram-project" iconPosition="left">
        How do skills work?
      </Button>
      <p class="install-caption">
        Each skill as a decision tree, next to the lines of SKILL.md that decide it.
      </p>
    </div>
  </div>
</section>

<style>
  .claude {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-8);
    align-items: start;
    margin-bottom: var(--space-96);
  }

  .claude :global(.section-divider) {
    grid-column: 2 / -2;
  }

  /* Panel sits on page columns 2, 3, 4; the copy starts on column 5, hard
     against the panel's right edge. */
  .panel-col {
    grid-column: 2 / 5;
    grid-row: 2;
    align-self: start;
    margin-top: var(--space-16);
  }

  .copy {
    grid-column: 5 / 11;
    grid-row: 2;
    align-self: start;
    display: flex;
    flex-direction: column;
    gap: var(--space-24);
    margin-top: var(--space-16);
  }

  .intro {
    font-family: var(--font-sans);
    font-size: var(--font-size-xl);
    line-height: var(--line-height-tighter);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin: 0;
  }

  .install {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .install-caption {
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--font-size-md);
    line-height: var(--line-height-normal);
    color: var(--text-secondary);
  }

  /* No global border-box reset here, so the snippet's own padding+border would
     overflow its column under content-box. Pin it to border-box to fit exactly. */
  .install :global(.codesnippet) {
    box-sizing: border-box;
    width: 100%;
  }

  /* `.code` sets overflow-x: auto with overflow-y: visible, which the spec
     promotes to overflow-y: auto — a 1px line-height rounding then trips a
     spurious vertical scrollbar. Clamp the vertical axis; horizontal scroll
     for long lines still works. */
  .install :global(.codesnippet .code) {
    overflow-y: hidden;
  }

  .atlas {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-8);
  }

  .skills {
    width: 100%;
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-24);
  }

  .skill {
    display: flex;
    align-items: center;
    gap: var(--space-8);
  }

  /* Icon + name match the old card header sizing so the skills read identically. */
  .skill-icon {
    font-size: var(--icon-size-2xl);
    color: var(--text-secondary);
  }

  .skill-name {
    font-family: var(--font-sans);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-normal);
    color: var(--text-primary);
  }

  @media (max-width: 960px) {
    .claude :global(.section-divider),
    .panel-col,
    .copy {
      grid-column: 1 / -1;
    }

    .panel-col,
    .copy {
      grid-row: auto;
    }
  }
</style>
