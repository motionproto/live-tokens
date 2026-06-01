<script lang="ts">
  import CodeSnippet from '../../system/components/CodeSnippet.svelte';
  import SectionDivider from '../../system/components/SectionDivider.svelte';
  import Panel from '../../system/components/Panel.svelte';

  const skills = [
    { icon: 'fas fa-list-check', name: 'pick-component' },
    { icon: 'fas fa-table-columns', name: 'build-page' },
    { icon: 'fas fa-cube', name: 'create-component' }
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
      After installing the package, run this once to copy the skills into your project.
    </p>

    <div class="install">
      <CodeSnippet code="npx @motion-proto/live-tokens setup-claude" />
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

  /* Panel sits on page columns 2, 3, 4; copy takes columns 6–10. Column 5 is
     left empty as a one-column gap between them; column 11 stays empty. */
  .panel-col {
    grid-column: 2 / 5;
    grid-row: 2;
    align-self: start;
    margin-top: var(--space-16);
  }

  .copy {
    grid-column: 6 / 11;
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
    line-height: var(--line-height-sm);
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
    line-height: var(--line-height-md);
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
    line-height: var(--line-height-md);
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
