<script lang="ts">
  import { onMount } from 'svelte';
  import CollapsibleSection from '../system/components/CollapsibleSection.svelte';
  import Panel from '../system/components/Panel.svelte';
  import Table from '../system/components/Table.svelte';
  import Card from '../system/components/Card.svelte';
  import { portal } from '../system/internal/portal';
  import { navigate } from '../editor/core/routing/router';
  import { pickComponentEval as result } from './evalResults';

  let { homeHref = '/demo' }: { homeHref?: string } = $props();

  const chapters = [
    { id: 'skills', title: 'LiveTokens skills' },
    { id: 'checkers', title: 'CLI Check' },
    { id: 'test-runs', title: 'Testing pages and components' },
    { id: 'walkthrough', title: 'Build and check a page' },
    { id: 'reference', title: 'Rule reference' },
    { id: 'measured-value', title: 'Measured value' },
  ];

  // Closed by default: open, the fixed panel covers the full-width figures.
  let contentsOpen = $state(false);

  let openRules = $state<Record<string, boolean>>({});

  // The router loads this page lazily, after the browser's own jump to a hash has passed.
  onMount(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  });

  function jump(event: MouseEvent, id: string) {
    event.preventDefault();
    contentsOpen = false;
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
</script>

<!-- The markers live in one hidden SVG so every figure can reference them by a
     single document-unique id. -->
<svg class="markers" aria-hidden="true">
  <defs>
    <marker id="loops-arw" viewBox="0 0 10 10" refX="5.9" refY="5" markerWidth="5.7" markerHeight="5.7" orient="auto-start-reverse">
      <polygon class="head" points="0,1.5 10,5 0,8.5" />
    </marker>
    <marker id="loops-arw-back" viewBox="0 0 10 10" refX="5.9" refY="5" markerWidth="5.7" markerHeight="5.7" orient="auto-start-reverse">
      <polygon class="head-back" points="0,1.5 10,5 0,8.5" />
    </marker>
  </defs>
</svg>

<div class="loops">
  <header class="masthead">
    <div class="chapter-body">
      <a class="back-link" href={homeHref} onclick={(event) => { event.preventDefault(); navigate(homeHref); }}>
        <span aria-hidden="true">←</span> Back to demo
      </a>
      <h1>Validating Skill Output</h1>
      <div class="introduction">
        <p>LiveTokens includes Claude skills that create pages and components. The results of these skills are checked with CLI commands to validate the output against the design system. This creates an inner feedback loop that mirrors the testing you would have in a build process: a deterministic layer with a pass/fail result rather than an interpretive LLM response.</p>
      </div>
    </div>
  </header>

  <section class="chapter" id="skills" aria-labelledby="skills-title">
    <div class="chapter-body">
      <h2 id="skills-title">LiveTokens skills</h2>
      <div class="text-columns skills-overview">
        <div>
          <p>The CLI checks verify that skill output uses the design system and works correctly in the browser. They cover token use, component behavior, and page layout. Skills make design decisions and the CLI verifies the code.</p>
          <p>The package includes eight skills, and one setup command copies them into your project.</p>
        </div>
        <ul class="skill-stack">
          <li><Card variant="bare" prose={false}><h3>Build skills</h3><p>Build pages and create new components.</p></Card></li>
          <li><Card variant="bare" prose={false}><h3>Check skills</h3><p>Check the code of every page and component.</p></Card></li>
          <li><Card variant="bare" prose={false}><h3>Theme skills</h3><p>Create and customize themes for LiveTokens.</p></Card></li>
        </ul>
      </div>
    </div>
  </section>

  <section class="chapter" id="checkers" aria-labelledby="checkers-title">
    <div class="chapter-body">
      <h2 id="checkers-title">CLI Check</h2>
      <div class="text-columns checker-details">
        <div>
          <p>The page checker confirms that pages use catalogue components, valid props, and design tokens.</p>
          <p>The component checker confirms that every property uses design tokens and that the component appears in the catalogue and the editor.</p>
          <p>Both checkers flag unknown token and property names. Each finding names the rule broken and explains the fix. The table lists what each repair level means.</p>
          <p>The skill makes its fixes and runs the checks again.</p>
        </div>
        <Table>
          <table aria-label="Repair levels">
            <thead><tr><th scope="col">Repair level</th><th scope="col">Description</th></tr></thead>
            <tbody>
              <tr><td>Automatic</td><td>The checker fixed the problem.</td></tr>
              <tr><td>Choice</td><td>The skill picks a fix.</td></tr>
              <tr><td>Authored</td><td>The skill writes the fix.</td></tr>
            </tbody>
          </table>
        </Table>
      </div>
    </div>
  </section>

  <section class="chapter" id="test-runs" aria-labelledby="test-runs-title">
    <div class="chapter-body">
      <h2 id="test-runs-title">Testing pages and components</h2>
      <p>When a skill creates a component or a page, the checker reviews the code against the design system, then tests the result. For a component, Vitest checks its registration and callbacks, and Playwright checks its rendering, input handling, and themes. For a page, Playwright checks layout, contrast, and typography.</p>

      <figure>
        <figcaption><b>Figure 1. The testing loop.</b></figcaption>
        <div class="figure-stage">
            <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll the diagram.) -->
            <div class="figure-scroll" role="region" aria-label="Figure 1" tabindex="0">
          <svg class="dg" viewBox="20 12 1160 866" role="img" aria-label="The skill builds a page or component and runs the checks. The CLI checker checks the code, makes the routine repairs, tests the result, and reports the findings. The skill repairs each finding and runs the checks again until every check passes.">
            <rect class="lane-checker" x="20" y="12" width="1160" height="866" rx="8" />
            <path class="lane-skill" d="M28,12 H600 V878 H28 A8,8 0 0 1 20,870 V20 A8,8 0 0 1 28,12 Z" />
            <path class="lane-shade" d="M600,12 H1172 A8,8 0 0 1 1180,20 V870 A8,8 0 0 1 1172,878 H600 Z" />
            <text class="lane-title" x="80" y="52">Claude Skill</text>
            <text class="lane-title" x="660" y="52">CLI checker</text>
            <path class="flow" d="M540,148 L876,148 Q890,148 890,162 L890,225" />
            <path class="flow" d="M890,320 L890,353" />
            <path class="flow" d="M890,448 L890,481" />
            <path class="flow" d="M890,600 L890,633" />
            <path class="flow" d="M660,684 L547,684" />
            <path class="flow" d="M890,728 L890,781" />
            <path class="back" d="M310,640 L310,290 Q310,276 324,276 L653,276" />
            <rect class="box-lead" x="80" y="104" width="460" height="88" rx="4" />
            <text class="t" x="101.3" y="138">Build a page or component</text>
            <text class="s" x="101.3" y="166">from the catalogue and design tokens</text>
            <rect class="box" x="660" y="232" width="460" height="88" rx="4" />
            <text class="t" x="681.3" y="266">Check the code</text>
            <text class="tag" x="1098.7" y="266" text-anchor="end">Static check</text>
            <text class="s" x="681.3" y="294">design tokens, components, and props</text>
            <rect class="box" x="660" y="360" width="460" height="88" rx="4" />
            <text class="t" x="681.3" y="394">Make the routine repairs</text>
            <text class="s" x="681.3" y="422">fixes with one right answer</text>
            <rect class="box" x="660" y="488" width="460" height="112" rx="4" />
            <text class="t" x="681.3" y="522">Test the result</text>
            <text class="tag" x="1098.7" y="522" text-anchor="end">Vitest · Playwright</text>
            <text class="s" x="681.3" y="550">Test component interactions, rendering, and themes.</text>
            <text class="s" x="681.3" y="574">Check page layout, contrast, and typography.</text>
            <rect class="box" x="660" y="640" width="460" height="88" rx="4" />
            <text class="t" x="681.3" y="674">Report the findings</text>
            <text class="s" x="681.3" y="702">each with guidance for its repair</text>
            <rect class="box" x="80" y="640" width="460" height="88" rx="4" />
            <text class="t" x="101.3" y="674">Repair each finding</text>
            <text class="s" x="101.3" y="702">make the choice or write the code</text>
            <rect class="box-lead" x="660" y="788" width="460" height="72" rx="4" />
            <text class="t" x="890" y="830" text-anchor="middle">Every check passes</text>
            <text class="lbl" x="715" y="136" text-anchor="middle">run the checks</text>
            <text class="lbl" x="600" y="672" text-anchor="middle">findings</text>
            <text class="lbl" x="906" y="759">none remain</text>
            <text class="rule" x="479" y="262" text-anchor="middle">check again</text>
          </svg>
            </div>
        </div>
      </figure>

    </div>
  </section>

  <section class="chapter" id="walkthrough" aria-labelledby="walkthrough-title">
    <div class="chapter-body">
      <h2 id="walkthrough-title">Build and check a page</h2>
      <p><span class="name">create-page</span> builds each page from tested components. When the catalogue lacks a component, the skill creates one and checks it before the page uses it.</p>

      <figure class="workflow-diagram">
        <figcaption><b>Figure 2. The page workflow.</b></figcaption>
        <div class="figure-stage">
            <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll the diagram.) -->
            <div class="figure-scroll" role="region" aria-label="Figure 2" tabindex="0">
          <svg class="dg" viewBox="20 12 1160 916" role="img" aria-label="Read the project, plan the sections, and choose components. When no component fits, create one and check it until every check passes, and it joins the catalogue. Assemble the page and check it. Repair each finding until every check passes, then review the page.">
            <rect class="lane-checker" x="20" y="12" width="1160" height="916" rx="8" />
            <path class="lane-skill" d="M28,12 H600 V928 H28 A8,8 0 0 1 20,920 V20 A8,8 0 0 1 28,12 Z" />
            <path class="lane-shade" d="M600,12 H1172 A8,8 0 0 1 1180,20 V920 A8,8 0 0 1 1172,928 H600 Z" />
            <text class="lane-title" x="80" y="52">Page</text>
            <text class="lane-title" x="660" y="52">New component</text>
            <path class="flow" d="M310,192 L310,225" />
            <path class="flow" d="M310,320 L310,353" />
            <path class="flow" d="M310,448 L310,545" />
            <path class="flow" d="M540,404 L653,404" />
            <path class="flow" d="M890,472 L890,570 Q890,584 876,584 L547,584" />
            <path class="flow" d="M310,640 L310,673" />
            <path class="back" d="M540,724 L556,724 Q570,724 570,710 L570,629 Q570,620 561,620 L547,620" />
            <path class="flow" d="M310,768 L310,813" />
            <rect class="box-lead" x="80" y="104" width="460" height="88" rx="4" />
            <text class="t" x="101.3" y="138">Read the project</text>
            <text class="s" x="101.3" y="166">routes, grid, and the component catalogue</text>
            <rect class="box" x="80" y="232" width="460" height="88" rx="4" />
            <text class="t" x="101.3" y="266">Plan the sections</text>
            <text class="s" x="101.3" y="294">one section per purpose</text>
            <rect class="box" x="80" y="360" width="460" height="88" rx="4" />
            <text class="t" x="101.3" y="394">Choose components</text>
            <text class="s" x="101.3" y="422">from the catalogue first</text>
            <rect class="box" x="660" y="360" width="460" height="112" rx="4" />
            <text class="t" x="681.3" y="394">Create the component</text>
            <text class="s" x="681.3" y="422">check it and repair it</text>
            <text class="s" x="681.3" y="446">until every check passes</text>
            <rect class="box" x="80" y="552" width="460" height="88" rx="4" />
            <text class="t" x="101.3" y="586">Assemble the page</text>
            <text class="s" x="101.3" y="614">components, tokens, and text styles</text>
            <rect class="box" x="80" y="680" width="460" height="88" rx="4" />
            <text class="t" x="101.3" y="714">Check the page</text>
            <text class="s" x="101.3" y="742">review the code and test it in the browser</text>
            <rect class="box-lead" x="80" y="820" width="460" height="88" rx="4" />
            <text class="t" x="101.3" y="854">Review the page</text>
            <text class="s" x="101.3" y="882">read it the way a visitor would</text>
            <text class="lbl" x="326" y="499">a shipped component fits</text>
            <text class="lbl" x="600" y="392" text-anchor="middle">none fits</text>
            <text class="lbl" x="715" y="572" text-anchor="middle">joins the catalogue</text>
            <text class="rule" x="584" y="677">repair</text>
            <text class="lbl" x="326" y="793">every check passes</text>
          </svg>
            </div>
        </div>
      </figure>

      <ol class="steps">
        <li><strong>Read the project.</strong> Read the routes, the grid, and the component catalogue.</li>
        <li><strong>Plan the sections.</strong> Give each purpose its own section.</li>
        <li><strong>Choose components.</strong> Start with the catalogue. When no component fits, create one, then check and repair it until every check passes.</li>
        <li><strong>Assemble the page.</strong> Build it from components, design tokens, and text styles.</li>
        <li><strong>Check the page.</strong> The checker reviews the code and tests the page in the browser. Repair each finding and check again until every check passes.</li>
        <li><strong>Review the page.</strong> Read it the way a visitor would, and confirm that it supports the reader’s task.</li>
      </ol>
    </div>
  </section>

  <section class="chapter" id="reference" aria-labelledby="reference-title">
    <div class="chapter-body">
      <h2 id="reference-title">Rule reference</h2>
      <p>Expand a group to read its rules. The skills treat every rule as an error and repair each finding before they finish.</p>
      <div class="reference-groups">
        <div class="rule-group">
          <CollapsibleSection label="Page code · 19 rules" variant="hairline" prose={false} open={openRules['0'] ?? false} ontoggle={() => openRules['0'] = !openRules['0']}>
            <Table>
              <table aria-label="Page code · 19 rules">
                <thead><tr><th scope="col">Rule</th><th scope="col">Description</th></tr></thead>
                <tbody>
                  <tr><td>tokens-migration</td><td>An additive migration would add design tokens <code>tokens.css</code> lacks. The checker applies it during a repair run.</td></tr>
                  <tr><td>tokens-breaking-migration</td><td>A breaking migration that renames, removes, or rewrites design tokens in <code>tokens.css</code> is pending.</td></tr>
                  <tr><td>unknown-component</td><td>An import names a component outside the catalogue.</td></tr>
                  <tr><td>unknown-prop</td><td>A component receives a prop it does not declare.</td></tr>
                  <tr><td>unknown-prop-value</td><td>A prop receives a value outside the set the component accepts.</td></tr>
                  <tr><td>deep-import</td><td>An import reaches into package internals. Import from a public entry point.</td></tr>
                  <tr><td>unknown-token</td><td>A <code>var()</code> reference uses an unknown token name.</td></tr>
                  <tr><td>color-literal</td><td>A color value uses a literal instead of a design token.</td></tr>
                  <tr><td>reserved-route</td><td>A route uses the reserved <code>/live-tokens/*</code> namespace.</td></tr>
                  <tr><td>site-css-in-main</td><td><code>main.ts</code> imports <code>site.css</code>, which leaks it into the editor routes.</td></tr>
                  <tr><td>raw-text-axis</td><td>A font size, family, line height, or letter spacing uses a literal or a single-axis token instead of a text style.</td></tr>
                  <tr><td>dimension-literal</td><td>A spacing, inset, stroke, radius, or shadow value uses a non-zero px or rem literal instead of a token.</td></tr>
                  <tr><td>hardcoded-columns</td><td>A grid uses <code>repeat(N, 1fr)</code> with four or more columns. Use <code>--columns-count</code>.</td></tr>
                  <tr><td>missing-source</td><td>A route has no <code>source</code>, so Page Source cannot open it.</td></tr>
                  <tr><td>control-size</td><td>The page sets <code>size</code> on a shipped component.</td></tr>
                  <tr><td>multiple-primary</td><td>The page uses more than one primary Button.</td></tr>
                  <tr><td>danger-without-dialog</td><td>The page has a danger Button or IconButton and no Dialog.</td></tr>
                  <tr><td>native-control</td><td>A bare <code>&lt;button&gt;</code>, <code>&lt;input&gt;</code>, <code>&lt;select&gt;</code>, or <code>&lt;textarea&gt;</code> replaces a shipped control.</td></tr>
                  <tr><td>property-override</td><td>The page redeclares a component's semantic property for one instance.</td></tr>
                </tbody>
              </table>
            </Table>
          </CollapsibleSection>
        </div>
        <div class="rule-group">
          <CollapsibleSection label="Page browser tests · 5 rules" variant="hairline" prose={false} open={openRules['1'] ?? false} ontoggle={() => openRules['1'] = !openRules['1']}>
            <Table>
              <table aria-label="Page browser tests · 5 rules">
                <thead><tr><th scope="col">Rule</th><th scope="col">Description</th></tr></thead>
                <tbody>
                  <tr><td>page-component-paint</td><td>Each component part renders the value of its semantic property.</td></tr>
                  <tr><td>page-text-style</td><td>Text outside components matches a complete text style from the design system.</td></tr>
                  <tr><td>page-contrast</td><td>Text outside components meets WCAG AA against its surface.</td></tr>
                  <tr><td>page-grid</td><td>Section edges align to column lines at 768px and wider.</td></tr>
                  <tr><td>page-overflow</td><td>Content stays inside its container, and the page scrolls only vertically.</td></tr>
                </tbody>
              </table>
            </Table>
          </CollapsibleSection>
        </div>
        <div class="rule-group">
          <CollapsibleSection label="Component code · 22 rules" variant="hairline" prose={false} open={openRules['2'] ?? false} ontoggle={() => openRules['2'] = !openRules['2']}>
            <Table>
              <table aria-label="Component code · 22 rules">
                <thead><tr><th scope="col">Rule</th><th scope="col">Description</th></tr></thead>
                <tbody>
                  <tr><td>tokens-migration</td><td>An additive migration would add design tokens <code>tokens.css</code> lacks. The checker applies it during a repair run.</td></tr>
                  <tr><td>tokens-breaking-migration</td><td>A breaking migration that renames, removes, or rewrites design tokens in <code>tokens.css</code> is pending.</td></tr>
                  <tr><td>invalid-id</td><td>The id contains characters other than lowercase letters and digits, or starts with a digit.</td></tr>
                  <tr><td>missing-file</td><td>The runtime or editor file is missing.</td></tr>
                  <tr><td>missing-root-block</td><td>The runtime has no <code>:global(:root)</code> block.</td></tr>
                  <tr><td>no-tokens</td><td>The <code>:global(:root)</code> block declares no <code>--&lt;id&gt;-*</code> property.</td></tr>
                  <tr><td>missing-description</td><td>The runtime's <code>catalogue</code> export is missing or lacks a required field.</td></tr>
                  <tr><td>unread-token</td><td>The runtime declares a property and never reads it.</td></tr>
                  <tr><td>state-after-property</td><td>A property name places the state after the property. Use <code>-hover-surface</code>.</td></tr>
                  <tr><td>disabled-is-terminal</td><td>A property name combines <code>disabled</code> with another state. The component cannot render that combination.</td></tr>
                  <tr><td>unknown-suffix</td><td>A property name uses a suffix the editor cannot edit.</td></tr>
                  <tr><td>phantom-editor-token</td><td>An editor row names a property the runtime never declares.</td></tr>
                  <tr><td>color-literal</td><td>A default is a literal color.</td></tr>
                  <tr><td>missing-component-const</td><td>The editor lacks <code>const component = '&lt;id&gt;'</code>.</td></tr>
                  <tr><td>missing-all-tokens</td><td>The editor does not export <code>allTokens</code>.</td></tr>
                  <tr><td>deep-import</td><td>A component file imports from package internals.</td></tr>
                  <tr><td>missing-registration</td><td>Nothing under <code>src/</code> registers the id.</td></tr>
                  <tr><td>unknown-token-ref</td><td>A default references an unknown token name.</td></tr>
                  <tr><td>default-not-token</td><td>A default lacks both a design token and a declared intrinsic.</td></tr>
                  <tr><td>phantom-link</td><td>A font helper spans several slots without a derivation, which links their fonts.</td></tr>
                  <tr><td>dimension-literal</td><td>A default uses a non-zero px or rem literal instead of a design token.</td></tr>
                  <tr><td>config-token</td><td>A default config references an unknown token name, or aliases a literal the editor does not declare as intrinsic.</td></tr>
                </tbody>
              </table>
            </Table>
          </CollapsibleSection>
        </div>
        <div class="rule-group">
          <CollapsibleSection label="Component tests · 11 rules" variant="hairline" prose={false} open={openRules['3'] ?? false} ontoggle={() => openRules['3'] = !openRules['3']}>
            <Table>
              <table aria-label="Component tests · 11 rules">
                <thead><tr><th scope="col">Rule</th><th scope="col">Description</th></tr></thead>
                <tbody>
                  <tr><td>contract-registry</td><td>Vitest. The component has a valid registration, property declarations, and default values.</td></tr>
                  <tr><td>contract-behavior</td><td>Vitest. Callback props receive the arguments each case expects.</td></tr>
                  <tr><td>contract-listed</td><td>Playwright. The component appears in its registry group.</td></tr>
                  <tr><td>contract-alias</td><td>Playwright. The component declares every part and alias, each alias resolves, and each edit reaches the document root.</td></tr>
                  <tr><td>contract-states</td><td>Playwright. The preview renders the state the editor selects.</td></tr>
                  <tr><td>contract-interaction</td><td>Playwright. The component responds to pointer and keyboard input.</td></tr>
                  <tr><td>contract-persist</td><td>Playwright. An edit survives save and reload, and Reset restores the saved config.</td></tr>
                  <tr><td>contract-theme</td><td>Playwright. A theme preview updates the component, and Cancel restores the original values.</td></tr>
                  <tr><td>contract-sketch</td><td>Playwright. Sketch mode draws every visible part.</td></tr>
                  <tr><td>contract-render</td><td>Playwright. The runtime preview applies each property to the correct part.</td></tr>
                  <tr><td>contract-missing</td><td>Playwright. The named component has no contract.</td></tr>
                </tbody>
              </table>
            </Table>
          </CollapsibleSection>
        </div>
        <div class="rule-group">
          <CollapsibleSection label="Test runner · 3 rules" variant="hairline" prose={false} open={openRules['4'] ?? false} ontoggle={() => openRules['4'] = !openRules['4']}>
            <Table>
              <table aria-label="Test runner · 3 rules">
                <thead><tr><th scope="col">Rule</th><th scope="col">Description</th></tr></thead>
                <tbody>
                  <tr><td>tests-not-installed</td><td><code>@playwright/test</code>, <code>vitest</code>, or <code>happy-dom</code> is missing, or Playwright’s Chromium is not installed.</td></tr>
                  <tr><td>tests-setup</td><td>The run could not start, found nothing to check, found no route for the page, or a tool crashed before it wrote a report.</td></tr>
                  <tr><td>tests-incomplete</td><td>A run timed out, collected no tests, or left a component and rule pair without a result.</td></tr>
                </tbody>
              </table>
            </Table>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  </section>

  <section class="chapter" id="measured-value" aria-labelledby="measured-value-title">
    <div class="chapter-body">
      <h2 id="measured-value-title">Measured value</h2>
      <p>An eval asked an agent to choose a component for {result.requirements} requirements. It ran in four arms of {result.runsPerArm} runs each: with and without the skills, and with and without the CLI. The arms chose the same components, with one miss among 144 answers, and differ in turns, time, and cost.</p>
      <div class="eval-results">
        <Table>
          <table aria-label="Eval arms">
            <thead>
              <tr>
                <th scope="col">Skills</th>
                <th scope="col">CLI</th>
                <th scope="col">Requirements right</th>
                <th scope="col">Turns</th>
                <th scope="col">Seconds</th>
                <th scope="col">Cost</th>
              </tr>
            </thead>
            <tbody>
              {#each result.arms as arm (`${arm.skills}-${arm.cli}`)}
                <tr>
                  <td>{arm.skills ? 'Yes' : 'No'}</td>
                  <td>{arm.cli ? 'Yes' : 'No'}</td>
                  <td>{arm.rowsRight}</td>
                  <td>{arm.turns}</td>
                  <td>{arm.seconds}</td>
                  <td>{arm.cost}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </Table>
      </div>
      <ul class="eval-summary">
        <li><strong>Turns:</strong> the skill saves turns only through the CLI command. Without the CLI, the skill arm takes as many turns as the agent with neither.</li>
        <li><strong>Time and cost:</strong> the skills and the CLI each save time on their own, and together the run costs less than half as much as with neither.</li>
        <li><strong>Accuracy:</strong> every arm scores about the same. The choices come from the entries in the component files.</li>
        <li><strong>Change since 2026-09-20:</strong> in that run, no agent without the skills found the CLI; this time 2 of 3 did, so that arm varies from run to run.</li>
      </ul>
      <div class="text-columns">
        <div>
          <h3>Method</h3>
          <ul>
            <li>Cases <code>{result.cases[0]}</code> and <code>{result.cases[1]}</code>, run on {result.date} at package {result.packageVersion}.</li>
            <li>Ten requirements with one right component, and two that nothing shipped fits.</li>
            <li>The second case seeds the same project without the package’s <code>bin</code> folder, so the command the skill names fails. The skills are unchanged.</li>
            <li>The runner adds the arm without skills to each case.</li>
            <li>Each requirement has its own pattern grader, so a failure names its row.</li>
          </ul>
        </div>
        <div>
          <h3>Limits</h3>
          <p>Three runs per arm is a small sample. The twelve requirements each have a clear answer in the entries. A harder case, where two components both fit, has not been measured.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- NOTES, open questions for this page:
  - "Review by eye" (walkthrough step 7) and Figure 2's "Read the page yourself".
    Leaning toward removing both. The create-page skill says "Open the page at
    the width it is built for" but gives it no browser or screenshot, so the
    model mostly reads the source and imagines the layout. Options discussed:
    measure line length, bottom alignment, focus order, and heading order in
    the page tests; save a screenshot per viewport from check-page --tests for
    the visual items; keep only the judgment items in the skill. Revisit after
    the intro paragraph is settled.
-->
  <footer>Source: .claude/skills, bin/, src/testing, and scripts/ at v0.79.0.</footer>
  <div class="contents" class:contents-collapsed={!contentsOpen} use:portal>
    <Panel>
      <div class="contents-body">
        <CollapsibleSection
          label="Contents"
          variant="chromeless"
          prose={false}
          open={contentsOpen}
          ontoggle={() => contentsOpen = !contentsOpen}
        >
          <nav aria-label="On this page">
            <ol>
              {#each chapters as chapter (chapter.id)}
                <li><a href="#{chapter.id}" onclick={(event) => jump(event, chapter.id)}>{chapter.title}</a></li>
              {/each}
            </ol>
          </nav>
        </CollapsibleSection>
      </div>
    </Panel>
  </div>
</div>

<style>
  .markers {
    position: absolute;
    width: var(--space-0);
    height: var(--space-0);
    overflow: hidden;
  }

  .loops {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), minmax(var(--space-0), 1fr));
    column-gap: var(--columns-gutter);
    max-width: var(--columns-max-width);
    margin-inline: auto;
    padding: var(--space-48) var(--space-32) var(--space-64);
    color: var(--text-primary);
  }

  .masthead,
  .chapter {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: subgrid;
    align-items: start;
  }

  .masthead {
    padding-bottom: var(--space-48);
  }

  .chapter {
    padding-block: var(--space-40);
    scroll-margin-top: var(--space-32);
  }

  /* Prose follows the demo inset. Paired topics and diagrams share the
     wider ten-column span; standalone paragraphs match the left column of
     that span. */
  .chapter-body {
    display: contents;
  }

  .chapter-body > * {
    grid-column: 2 / 7;
    min-width: var(--space-0);
  }

  .chapter-body > h2 {
    grid-column: 2 / -2;
    padding-top: var(--space-24);
    border-top: var(--border-width-1) solid var(--border-neutral-subtle);
  }

  .chapter-body > h1,
  .chapter-body > .text-columns,
  .chapter-body > .steps,
  .chapter-body > figure {
    grid-column: 2 / -2;
  }

  .chapter-body > .eval-results {
    grid-column: 2 / -2;
    margin-block: var(--space-12) var(--space-40);
  }

  .chapter-body > .reference-groups {
    grid-column: 2 / 11;
  }

  .text-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(var(--space-0), 1fr));
    column-gap: var(--columns-gutter);
    row-gap: var(--space-32);
  }

  .text-columns > * {
    min-width: var(--space-0);
  }

  .text-columns p:last-child {
    margin-bottom: var(--space-0);
  }

  h1 {
    font-family: var(--heading-xl-font-family);
    font-size: var(--heading-xl-font-size);
    font-weight: var(--heading-xl-font-weight);
    line-height: var(--heading-xl-line-height);
    letter-spacing: var(--heading-xl-letter-spacing);
    margin: var(--space-0) var(--space-0) var(--space-40);
  }

  h2 {
    font-family: var(--heading-lg-font-family);
    font-size: var(--heading-lg-font-size);
    font-weight: var(--heading-lg-font-weight);
    line-height: var(--heading-lg-line-height);
    letter-spacing: var(--heading-lg-letter-spacing);
    margin: var(--space-0) var(--space-0) var(--space-24);
  }

  .text-columns h3 {
    font-family: var(--heading-sm-font-family);
    font-size: var(--heading-sm-font-size);
    font-weight: var(--heading-sm-font-weight);
    line-height: var(--heading-sm-line-height);
    letter-spacing: var(--heading-sm-letter-spacing);
    margin: var(--space-0) var(--space-0) var(--space-12);
  }

  .eval-summary {
    margin: var(--space-0) var(--space-0) var(--space-40);
    padding-left: var(--space-24);
    color: var(--text-secondary);
  }

  .eval-summary li + li {
    margin-top: var(--space-12);
  }

  .text-columns ul {
    margin: var(--space-0);
    padding-left: var(--space-24);
    color: var(--text-secondary);
  }

  .text-columns li + li {
    margin-top: var(--space-8);
  }

  p,
  li,
  figcaption {
    font-family: var(--editorial-md-font-family);
    font-size: var(--editorial-md-font-size);
    font-weight: var(--editorial-md-font-weight);
    line-height: var(--editorial-md-line-height);
    letter-spacing: var(--editorial-md-letter-spacing);
  }

  .back-link,
  .contents a {
    font-family: var(--body-md-font-family);
    font-size: var(--body-md-font-size);
    font-weight: var(--body-md-font-weight);
    line-height: var(--body-md-line-height);
    letter-spacing: var(--body-md-letter-spacing);
  }

  p {
    margin: var(--space-0) var(--space-0) var(--space-20);
    color: var(--text-secondary);
  }

  strong {
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }


  code {
    font-family: var(--code-font-family);
    font-size: var(--code-font-size);
    font-weight: var(--code-font-weight);
    line-height: var(--code-line-height);
    letter-spacing: var(--code-letter-spacing);
    background: var(--tint-low);
    padding-inline: var(--space-4);
    border-radius: var(--radius-sm);
    overflow-wrap: anywhere;
  }

  .name {
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .back-link {
    justify-self: start;
    scroll-margin-top: var(--space-64);
    display: inline-flex;
    align-items: center;
    gap: var(--space-8);
    padding-block: var(--space-8);
    margin-bottom: var(--space-48);
    color: var(--text-secondary);
    text-decoration: none;
  }

  .introduction p {
    font-family: var(--editorial-lg-font-family);
    font-size: var(--editorial-lg-font-size);
    font-weight: var(--editorial-lg-font-weight);
    line-height: var(--editorial-lg-line-height);
    letter-spacing: var(--editorial-lg-letter-spacing);
  }

  .introduction p:last-child {
    margin-bottom: var(--space-0);
  }

  /* Panel owns the frame and surface; the page positions the overlay. */
  .contents {
    position: fixed;
    top: var(--space-96);
    right: var(--space-24);
    z-index: 10;
    width: calc(var(--space-96) * 3 + var(--space-24));
    max-width: calc(100vw - var(--space-32));
    max-height: calc(100dvh - var(--space-96) - var(--space-24));
    overflow-y: auto;
    border-radius: var(--panel-frame-radius);
    backdrop-filter: blur(var(--blur-lg));
  }

  .contents.contents-collapsed {
    width: auto;
  }

  .contents-body {
    width: 100%;
    min-width: var(--space-0);
  }

  .contents ol {
    list-style: none;
    margin: var(--space-0);
    padding: var(--space-0);
  }

  .contents li {
    margin: var(--space-0);
  }

  .contents a {
    display: block;
    padding-block: var(--space-12);
    color: var(--text-primary);
    text-decoration: none;
  }

  .contents a:hover,
  .back-link:hover {
    color: var(--text-accent);
    text-decoration: underline;
    text-underline-offset: var(--space-4);
  }

  a:focus-visible,
  .figure-scroll:focus-visible {
    outline: var(--border-width-2) solid var(--border-accent);
    outline-offset: var(--space-4);
  }

  .skill-stack {
    list-style: none;
    margin: var(--space-0);
    padding: var(--space-0);
    display: grid;
    gap: var(--space-16);
  }

  .skill-stack li {
    display: grid;
    min-width: var(--space-0);
    margin: var(--space-0);
  }

  .skill-stack h3 {
    font-family: var(--heading-sm-font-family);
    font-size: var(--heading-sm-font-size);
    font-weight: var(--heading-sm-font-weight);
    line-height: var(--heading-sm-line-height);
    letter-spacing: var(--heading-sm-letter-spacing);
    margin: var(--space-0) var(--space-0) var(--space-8);
    color: var(--text-primary);
  }

  .steps {
    display: none;
    list-style: none;
    counter-reset: step;
    margin: var(--space-24) var(--space-0) var(--space-0);
    padding: var(--space-0);
  }

  /* Positioned rather than a grid: the step's strong, text, and code runs
     would each become a grid cell. */
  .steps li {
    counter-increment: step;
    position: relative;
    margin: var(--space-0);
    padding: var(--space-12) var(--space-0) var(--space-12) var(--space-40);
    border-top: var(--border-width-1) solid var(--border-neutral-subtle);
  }

  .steps li::before {
    content: counter(step) ".";
    position: absolute;
    left: var(--space-0);
    color: var(--text-secondary);
  }

  .reference-groups {
    display: grid;
    grid-template-columns: minmax(var(--space-0), 1fr);
    gap: var(--space-16);
  }

  .rule-group {
    width: 100%;
    min-width: var(--space-0);
  }


  figure {
    display: grid;
    grid-template-columns: subgrid;
    margin: var(--space-24) var(--space-0) var(--space-32);
  }

  .figure-stage {
    grid-column: 1 / -1;
    min-width: var(--space-0);
  }

  .figure-scroll {
    overflow-x: auto;
  }

  /* Inside the figure's subgrid, so 1 / 7 lines up with the text column. */
  figcaption {
    grid-column: 1 / 7;
    margin-bottom: var(--space-16);
    color: var(--text-secondary);
  }

  figcaption b {
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }

  /* The diagram scales to the document width. Below the floor its labels would
     shrink past legibility, so a narrow frame scrolls instead. */
  .dg {
    display: block;
    width: 100%;
    height: auto;
    min-width: calc(var(--space-96) * 7);
    color: var(--text-primary);
  }

  .dg :global(.lane-checker) {
    fill: none;
    stroke: var(--border-neutral-subtle);
    stroke-width: var(--border-width-1);
  }

  .dg :global(.lane-skill) {
    fill: var(--tint-low);
  }

  /* No faint scrim token exists, so thin the lowest one to a light wash. */
  .dg :global(.lane-shade) {
    fill: color-mix(in srgb, var(--scrim-low) 40%, transparent);
  }

  .dg :global(.lane-title) {
    font-family: var(--heading-md-font-family);
    font-weight: var(--heading-md-font-weight);
    font-size: var(--heading-md-font-size);
    line-height: var(--heading-md-line-height);
    letter-spacing: var(--heading-md-letter-spacing);
    fill: var(--text-primary);
  }

  .dg :global(.tag) {
    font-family: var(--body-sm-font-family);
    font-size: var(--body-sm-font-size);
    font-weight: var(--body-sm-font-weight);
    line-height: var(--body-sm-line-height);
    letter-spacing: var(--body-sm-letter-spacing);
    fill: var(--text-tertiary);
  }

  .dg :global(.box) {
    fill: var(--tint-low);
    stroke: var(--border-neutral-medium);
    stroke-width: var(--border-width-1);
  }

  .dg :global(.box-lead) {
    fill: var(--tint-low);
    stroke: var(--border-accent-medium);
    stroke-width: var(--border-width-2);
  }

  .dg :global(.t) {
    font-family: var(--heading-sm-font-family);
    font-weight: var(--heading-sm-font-weight);
    font-size: var(--heading-sm-font-size);
    line-height: var(--heading-sm-line-height);
    letter-spacing: var(--heading-sm-letter-spacing);
    fill: var(--text-primary);
  }

  .dg :global(.s),
  .dg :global(.lbl) {
    font-family: var(--body-md-font-family);
    font-size: var(--body-md-font-size);
    font-weight: var(--body-md-font-weight);
    line-height: var(--body-md-line-height);
    letter-spacing: var(--body-md-letter-spacing);
    fill: var(--text-secondary);
  }

  .dg :global(.rule) {
    font-family: var(--code-font-family);
    font-size: var(--code-font-size);
    font-weight: var(--code-font-weight);
    line-height: var(--code-line-height);
    letter-spacing: var(--code-letter-spacing);
    fill: var(--text-accent);
  }

  .dg :global(.flow),
  .dg :global(.back) {
    fill: none;
    stroke-width: var(--border-width-3);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .dg :global(.flow) {
    stroke: var(--text-secondary);
    marker-end: url(#loops-arw);
  }

  .dg :global(.back) {
    stroke: var(--text-accent);
    marker-end: url(#loops-arw-back);
  }

  .markers :global(.head) {
    fill: var(--text-secondary);
  }

  .markers :global(.head-back) {
    fill: var(--text-accent);
  }

  footer {
    grid-column: 2 / -2;
    padding-top: var(--space-24);
    border-top: var(--border-width-1) solid var(--border-neutral-subtle);
    font-family: var(--code-font-family);
    font-size: var(--code-font-size);
    font-weight: var(--code-font-weight);
    line-height: var(--code-line-height);
    letter-spacing: var(--code-letter-spacing);
    color: var(--text-secondary);
  }

  @media (max-width: 1279px) {
    .chapter-body > * {
      grid-column: 2 / -2;
    }

    figcaption {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 1023px) {
    .chapter-body > *,
    .chapter-body > h2,
    .chapter-body > .text-columns,
    .chapter-body > .steps,
    .chapter-body > figure,
    footer,
    .chapter-body > .reference-groups,
    figcaption {
      grid-column: 1 / -1;
    }

    .text-columns {
      grid-template-columns: minmax(var(--space-0), 1fr);
    }

    .contents {
      top: var(--space-64);
      right: var(--space-16);
    }
  }

  /* Media queries cannot read the grid tokens. */
  @media (width < 768px) {
    .workflow-diagram {
      display: none;
    }

    .steps {
      display: block;
    }

    .loops {
      grid-template-columns: minmax(var(--space-0), 1fr);
      /* Leave room for the fixed editor toolbar above the back link. */
      padding: var(--space-64) var(--space-20) var(--space-48);
    }

    h1 {
      margin-bottom: var(--space-32);
    }

    .back-link {
      margin-bottom: var(--space-24);
    }

    .masthead {
      padding-bottom: var(--space-32);
    }

    .chapter {
      padding-block: var(--space-32);
    }

  }
</style>
