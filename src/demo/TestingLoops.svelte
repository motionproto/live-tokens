<script lang="ts">
  import { onMount } from 'svelte';
  import CollapsibleSection from '../system/components/CollapsibleSection.svelte';
  import Panel from '../system/components/Panel.svelte';
  import Table from '../system/components/Table.svelte';
  import Badge from '../system/components/Badge.svelte';
  import Card from '../system/components/Card.svelte';
  import Callout from '../system/components/Callout.svelte';
  import { portal } from '../system/internal/portal';
  import { navigate } from '../editor/core/routing/router';

  const chapters = [
    { id: 'tokens', title: 'A shared design system' },
    { id: 'skills', title: 'Skills and checkers' },
    { id: 'test-runs', title: 'Testing pages and components' },
    { id: 'walkthrough', title: 'Build and check a page' },
    { id: 'gates', title: 'Checks for rules and skills' },
    { id: 'reference', title: 'Rule reference' },
  ];

  let contentsOpen = $state(false);

  onMount(() => {
    contentsOpen = window.matchMedia('(min-width: 1024px)').matches;
  });

  let openRules = $state<Record<string, boolean>>({});

  function jump(event: MouseEvent, id: string) {
    event.preventDefault();
    if (window.matchMedia('(max-width: 1023px)').matches) contentsOpen = false;
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
</script>

<!-- The markers live in one hidden SVG so every figure can reference them by a
     single document-unique id. -->
<svg class="markers" aria-hidden="true">
  <defs>
    <marker id="loops-arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <polygon class="head" points="0,1.5 10,5 0,8.5" />
    </marker>
    <marker id="loops-arw-back" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <polygon class="head-back" points="0,1.5 10,5 0,8.5" />
    </marker>
  </defs>
</svg>

<div class="loops">
  <header class="masthead">
    <div class="chapter-body">
      <a class="back-link" href="/demo" onclick={(event) => { event.preventDefault(); navigate('/demo'); }}>
        <span aria-hidden="true">←</span> Back to demo
      </a>
      <div class="hero-copy">
        <h1>Testing loops</h1>
        <p class="introduction">Live tokens checks the work that skills produce. Skills build pages and components, then run CLI commands to check the code and test the result in a browser. Each problem comes back as a finding that names its fix. The CLI makes the routine fixes. The skill makes the fixes that need judgment, then runs the checks again until they pass.</p>
      </div>
    </div>
  </header>

  <section class="chapter" id="tokens" aria-labelledby="tokens-title">
    <div class="chapter-body">
      <h2 id="tokens-title">A shared design system</h2>
      <p>Live tokens lets you edit design tokens and components in the browser. Tokens define shared values for color, type, spacing, and shape. Pages and components use those values to keep the design consistent.</p>
      <p>The checks verify that your code uses the design system and that the result works in the browser. They cover token use, component behavior, and page layout.</p>
    </div>
  </section>

  <section class="chapter" id="skills" aria-labelledby="skills-title">
    <div class="chapter-body">
      <h2 id="skills-title">Skills and checkers</h2>
      <h3>Skills build and repair</h3>
      <p>The package includes nine skills. Run <code>npx live-tokens setup-claude</code> to add them to your project.</p>
      <ul class="trio">
        <li><Card title="Theme skills"><span class="name">create-theme</span> passes color, type, and geometry tasks to <span class="name">set-colors</span>, <span class="name">set-type</span>, and <span class="name">set-geometry</span>.</Card></li>
        <li><Card title="Build skills"><span class="name">create-page</span> builds a page from the component catalogue. It calls <span class="name">pick-component</span> to choose a component and <span class="name">create-component</span> to write a new one.</Card></li>
        <li><Card title="Check skills"><span class="name">check-compliance</span> runs <code>npx live-tokens report</code> and lists the findings. <span class="name">fix-findings</span> repairs each finding and runs both checkers again until they pass.</Card></li>
      </ul>
      <p>Skills make design decisions. Checkers verify the code and test the result.</p>

      <h3>Checkers report problems</h3>
      <p><code>check-page</code> checks page code. <code>check-component</code> checks a component's code, editor controls, and registration. Use <code>report</code> to list findings from both across the project. It always exits <code>0</code>.</p>
      <p>Each finding identifies the rule, file, line, and fix. Its repair level tells the skill what to do:</p>
      <dl class="defs repair-levels">
        <div><dt><code>auto</code></dt><dd>The checker applies the repair itself.</dd></div>
        <div><dt><code>choice</code></dt><dd>Choose a repair based on the design or task.</dd></div>
        <div><dt><code>authored</code></dt><dd>Write code to resolve the finding.</dd></div>
      </dl>
      <p>The checkers read the token names in <code>tokens.css</code> and the properties each component declares. They report references to unknown names. Skills read these findings with <code>--json</code>, apply the fixes, and run the checks again.</p>
      <p>Set rule severity in <code>live-tokens.config.json</code>. Add <code>--strict</code> to treat warnings as errors, or <code>--tests</code> to run the test suites below. A checker exits with code <code>0</code> when it passes.</p>
    </div>
  </section>

  <section class="chapter" id="test-runs" aria-labelledby="test-runs-title">
    <div class="chapter-body">
      <h2 id="test-runs-title">Testing pages and components</h2>
      <p>When a skill creates a component or a page, it calls CLI commands to validate the result. Each command checks the code against the design tokens. With <code>--tests</code>, <code>check-component</code> also runs Vitest on the component’s registration and callbacks, and Playwright on the component in the editor. <code>check-page</code> runs Playwright on the page in the browser.</p>

      <figure>
        <div class="figure-stage">
          <Panel>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll the diagram.) -->
            <div class="figure-scroll" role="region" aria-label="Figure 1" tabindex="0">
          <svg class="dg" width="1200" height="818.7" viewBox="0 0 1200 818.7" role="img" aria-label="With --tests, each checker starts its own test run on a temporary copy of the project data. check-component runs Vitest for registration and callbacks, and Playwright for the component in the editor. check-page runs Playwright for the page at its route. The skill fixes the findings and runs the checks again until every check passes.">
            <rect class="box-lead" x="56" y="32" width="600" height="146.7" rx="4" />
            <text class="t" x="77.3" y="61.4">check-component</text>
            <text class="s" x="77.3" y="90.7">one name per editable value</text>
            <text class="s" x="77.3" y="114.7">each name points at a design token</text>
            <text class="s" x="77.3" y="138.7">each editor row names a declared property</text>
            <text class="s" x="77.3" y="162.7">a valid id and a registration</text>

            <rect class="box-lead" x="704" y="32" width="440" height="146.7" rx="4" />
            <text class="t" x="725.3" y="61.4">check-page</text>
            <text class="s" x="725.3" y="90.7">components from the catalogue</text>
            <text class="s" x="725.3" y="114.7">only the props they declare</text>
            <text class="s" x="725.3" y="138.7">colors and sizes from design tokens</text>
            <text class="s" x="725.3" y="162.7">a route with a source</text>

            <path class="flow" d="M356,178.7 V226.7" />
            <text class="m" x="370.7" y="208">--tests</text>
            <path class="flow" d="M924,178.7 V226.7" />
            <text class="m" x="938.7" y="208">--tests</text>

            <rect class="box" x="56" y="226.7" width="600" height="85.3" rx="4" />
            <text class="t" x="77.3" y="256">Test run</text>
            <text class="s" x="77.3" y="280">a temporary copy of the project data</text>
            <text class="s" x="77.3" y="301.4">its own dev server and browser</text>

            <rect class="box" x="704" y="226.7" width="440" height="85.3" rx="4" />
            <text class="t" x="725.3" y="256">Test run</text>
            <text class="s" x="725.3" y="280">a temporary copy of the project data</text>
            <text class="s" x="725.3" y="301.4">its own dev server and browser</text>

            <path class="flow end" d="M356,312 V344" />
            <path class="flow end" d="M201,344 H511" />
            <path class="flow" d="M201,344 V376" />
            <path class="flow" d="M511,344 V376" />
            <path class="flow" d="M924,312 V376" />

            <rect class="box" x="56" y="376" width="290" height="128" rx="4" />
            <text class="t" x="77.3" y="405.4">Vitest</text>
            <text class="s" x="77.3" y="432">no browser</text>
            <text class="s" x="77.3" y="456">registration, declarations,</text>
            <text class="s" x="77.3" y="480">seeds, and callback props</text>

            <rect class="box" x="366" y="376" width="290" height="128" rx="4" />
            <text class="t" x="387.3" y="405.4">Playwright</text>
            <text class="s" x="387.3" y="432">the component in the editor</text>
            <text class="s" x="387.3" y="456">checks include save,</text>
            <text class="s" x="387.3" y="480">reload, and theme change</text>

            <rect class="box" x="704" y="376" width="440" height="128" rx="4" />
            <text class="t" x="725.3" y="405.4">Playwright</text>
            <text class="s" x="725.3" y="432">opens the page at its route</text>
            <text class="s" x="725.3" y="456">five checks at each viewport</text>
            <text class="s" x="725.3" y="480">paint, text, contrast, grid, overflow</text>

            <path class="flow end" d="M201,504 V536" />
            <path class="flow end" d="M511,504 V536" />
            <path class="flow end" d="M924,504 V536" />
            <path class="flow end" d="M201,536 H924" />
            <path class="flow" d="M600,536 V568" />

            <rect class="box" x="373.3" y="568" width="453.3" height="85.3" rx="4" />
            <text class="t" x="394.7" y="597.4">Findings</text>
            <text class="s" x="394.7" y="621.4">each with a rule, file, line,</text>
            <text class="s" x="394.7" y="642.7">and fix slug</text>

            <path class="flow" d="M600,653.4 V685.4" />

            <rect class="box-lead" x="400" y="685.4" width="400" height="69.3" rx="4" />
            <text class="t" x="600" y="714.7" text-anchor="middle">Fix, then run the checks again</text>
            <text class="s" x="600" y="738.7" text-anchor="middle">until every check passes</text>

            <path class="back end" d="M400,720 H24 V105.4" />
            <path class="back" d="M24,105.4 H53.3" />
            <path class="back end" d="M800,720 H1176 V105.4" />
            <path class="back" d="M1176,105.4 H1146.7" />
            <text class="rule" x="17.3" y="412.7" text-anchor="middle" transform="rotate(-90 17.3 412.7)">run again</text>

            <text class="rule" x="600" y="794.7" text-anchor="middle">a missing result counts as a failure</text>
          </svg>
            </div>
          </Panel>
        </div>
        <figcaption><b>Figure 1. The testing loop.</b> Each checker starts its own test run. Each run works on a copy of the project data, so the project’s own data stays untouched. The runner reports failures and missing results as findings.</figcaption>
      </figure>

      <h3>Vitest checks component setup</h3>
      <p>Vitest runs registry and behavior checks without a browser. The registry checks confirm that each component has a registration and a default value for every editable property. The behavior checks trigger DOM events and verify the arguments each callback receives.</p>

      <h3>Playwright checks components in the editor</h3>
      <p>Each component has a test contract. It defines the component’s parts, states, and expected response to a theme change. Playwright uses it to check editor controls, rendering, pointer and keyboard input, save and reload, themes, and Sketch mode.</p>
      <p>The theme check previews a theme and verifies the expected values. It then cancels the preview and checks that the original values return.</p>

      <h3>Playwright checks pages in the browser</h3>
      <p>Playwright opens each page at every viewport in the testing settings. It checks component appearance, text styles, contrast, grid alignment, and overflow. When a rule does not apply, the report explains why. For example, the grid rule applies at widths of 768px and above.</p>

      <h3>Every expected result must arrive</h3>
      <p>The runner matches each test result to its rule. A missing result fails the run. So do setup failures and missing test tools, regardless of rule settings.</p>
    </div>
  </section>

  <section class="chapter" id="walkthrough" aria-labelledby="walkthrough-title">
    <div class="chapter-body">
      <h2 id="walkthrough-title">Build and check a page</h2>
      <p>Start with the component catalogue. If the page needs a new component, build and check that component first. Then assemble the page, run the checks, and review the layout.</p>

      <figure>
        <div class="figure-stage">
          <Panel>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll the diagram.) -->
            <div class="figure-scroll" role="region" aria-label="Figure 2" tabindex="0">
          <svg class="dg" width="1200" height="1066.7" viewBox="0 0 1200 1066.7" role="img" aria-label="To create a page, read the project, plan the sections, and match each need to a component. When the catalogue lacks a component, write one and check it until it passes. Assemble the page, then verify it with the static checks and a browser. Findings return to assembly until the checks pass.">
            <rect class="box-lead" x="146.7" y="26.7" width="440" height="66.7" rx="4" />
            <text class="t" x="168" y="56">Create a page</text>
            <text class="m" x="168" y="80">live-tokens-create-page</text>

            <path class="flow" d="M366.7,93.3 V128" />

            <rect class="box" x="146.7" y="128" width="440" height="85.3" rx="4" />
            <text class="t" x="168" y="157.3">Read the project</text>
            <text class="s" x="168" y="181.3">routes, --columns-count, the catalogue</text>
            <text class="m" x="168" y="202.7">npx live-tokens components</text>

            <path class="flow" d="M366.7,213.3 V248" />

            <rect class="box" x="146.7" y="248" width="440" height="85.3" rx="4" />
            <text class="t" x="168" y="277.3">Sections, then columns</text>
            <text class="s" x="168" y="301.3">one section per purpose</text>
            <text class="s" x="168" y="322.7">column spans from the layout table</text>

            <path class="flow" d="M366.7,333.3 V368" />

            <rect class="box" x="146.7" y="368" width="440" height="69.3" rx="4" />
            <text class="t" x="168" y="397.3">Match each need to a component</text>
            <text class="s" x="168" y="421.3">shipped components first</text>

            <path class="flow" d="M366.7,437.3 V626.7" />
            <text class="lbl" x="382.7" y="538.7">a shipped component fits</text>

            <path class="flow" d="M586.7,402.7 H653.3 V350.7 H746.7" />
            <text class="lbl" x="662.7" y="426.7">no clear fit</text>

            <line class="rail" x1="714.7" y1="304" x2="714.7" y2="616" />
            <text class="lbl" x="714.7" y="285.3">close calls and gaps</text>

            <rect class="box" x="746.7" y="317.3" width="400" height="66.7" rx="4" />
            <text class="t" x="768" y="346.7">pick-component</text>
            <text class="s" x="768" y="370.7">decision tests for similar components</text>

            <path class="flow" d="M946.7,384 V418.7" />
            <text class="lbl" x="962.7" y="408">no component fits</text>

            <rect class="box" x="746.7" y="418.7" width="400" height="101.3" rx="4" />
            <text class="t" x="768" y="448">create-component</text>
            <text class="s" x="768" y="472">runtime + editor + registration + contract</text>
            <text class="s" x="768" y="496">one semantic property per editable value</text>

            <path class="flow" d="M946.7,520 V552" />

            <rect class="box" x="746.7" y="552" width="400" height="64" rx="4" />
            <text class="m" x="768" y="580">check-component &lt;id&gt; --tests --strict</text>
            <text class="s" x="768" y="604">static, Vitest, and browser checks</text>

            <path class="back" d="M1146.7,584 H1168 V469.3 H1149.3" />
            <text class="rule" x="1154.7" y="526.7" text-anchor="middle" transform="rotate(-90 1154.7 526.7)">run again</text>

            <path class="flow" d="M946.7,616 V682.7 H586.7" />
            <text class="lbl" x="766.7" y="672" text-anchor="middle">joins the catalogue</text>

            <rect class="box" x="146.7" y="626.7" width="440" height="112" rx="4" />
            <text class="t" x="168" y="656">Assemble the page</text>
            <text class="s" x="168" y="680">components at their defaults</text>
            <text class="s" x="168" y="701.3">page CSS in design tokens</text>
            <text class="s" x="168" y="722.7">one text style per element, a route with a source</text>

            <path class="flow" d="M366.7,738.7 V773.3" />

            <rect class="box" x="146.7" y="773.3" width="440" height="149.3" rx="4" />
            <text class="t" x="168" y="802.7">Verify</text>
            <text class="m" x="168" y="828">npx live-tokens report</text>
            <text class="s" x="168" y="850.7">static findings by rule</text>
            <text class="m" x="168" y="876">check-page &lt;file&gt; --tests --strict</text>
            <text class="s" x="168" y="898.7">paint, text style, contrast, grid, overflow</text>
            <text class="s" x="168" y="917.3">at each viewport in the settings</text>

            <path class="back" d="M146.7,848 H104 V682.7 H144" />
            <text class="rule" x="93.3" y="765.3" text-anchor="middle" transform="rotate(-90 93.3 765.3)">fix-findings</text>

            <path class="flow" d="M366.7,922.7 V957.3" />
            <text class="lbl" x="382.7" y="946.7">checks pass</text>

            <rect class="box-lead" x="146.7" y="957.3" width="440" height="61.3" rx="4" />
            <text class="t" x="168" y="994.7">Read the page yourself</text>

            <text class="rule" x="146.7" y="1048">accent arrows: findings return to the step that fixes them</text>
          </svg>
            </div>
          </Panel>
        </div>
        <figcaption><b>Figure 2. The page workflow.</b> Follow the left path to build a page. Take the right branch to create and check a new component, then return to page assembly. Fix findings until the checks pass, then review the page yourself.</figcaption>
      </figure>

      <ol class="steps">
        <li><strong>Read the project.</strong> Read the route table, <code>--columns-count</code>, and the catalogue from <code>npx live-tokens components</code>.</li>
        <li><strong>Plan sections, then columns.</strong> Give each purpose its own section. Take column spans from the layout that fits the reader's task.</li>
        <li><strong>Choose components.</strong> Start with the catalogue. Use <span class="name">pick-component</span> to choose between similar components and <span class="name">create-component</span> to add one.</li>
        <li><strong>Check the new component.</strong> Run <code>report</code>, then <code>check-component &lt;id&gt; --tests --strict</code>. Fix each finding and repeat until the checks pass.</li>
        <li><strong>Assemble the page.</strong> Use components at their defaults, design tokens in page CSS, one text style per element, and a route with a <code>source</code>.</li>
        <li><strong>Verify.</strong> Run <code>report</code> and repair its findings with <span class="name">fix-findings</span>. Then run <code>check-page &lt;file&gt; --tests --strict</code>. Repeat until the checks pass.</li>
        <li><strong>Review by eye.</strong> Check the heading hierarchy, line lengths, alignment, and placement of the primary action. Confirm that the page reads clearly and supports the reader’s task.</li>
      </ol>
    </div>
  </section>

  <section class="chapter" id="gates" aria-labelledby="gates-title">
    <div class="chapter-body">
      <h2 id="gates-title">Checks for rules and skills</h2>
      <p>Tests verify the testing tools too. Rules must detect known defects, and each skill must describe commands and flags the CLI accepts.</p>

      <figure>
        <div class="figure-stage">
          <Panel>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll the diagram.) -->
            <div class="figure-scroll" role="region" aria-label="Figure 3" tabindex="0">
          <svg class="dg" width="1200" height="400" viewBox="0 0 1200 400" role="img" aria-label="A skill states the contract in prose. A checker rule detects a breach. A finding carries the rule and its fix slug, and the slug points to the skill section with the repair steps. A gate guards each step: check:skills, the checker unit tests and defect fixtures, and the fix-slug table.">
            <text class="lbl" x="181.3" y="53.3" text-anchor="middle">check:skills</text>
            <text class="lbl" x="181.3" y="74.7" text-anchor="middle">check:skill-atlas · check:skill-sources</text>
            <line class="lead" x1="181.3" y1="93.3" x2="181.3" y2="154.7" />

            <text class="lbl" x="600" y="53.3" text-anchor="middle">bin/check-page.test.ts</text>
            <text class="lbl" x="600" y="74.7" text-anchor="middle">tests/e2e/contract-defects · page-defects</text>
            <line class="lead" x1="600" y1="93.3" x2="600" y2="154.7" />

            <text class="lbl" x="1018.7" y="53.3" text-anchor="middle">COMPONENT_RULE_FIX · PAGE_RULE_FIX</text>
            <text class="lbl" x="1018.7" y="74.7" text-anchor="middle">one slug per rule</text>
            <line class="lead" x1="1018.7" y1="93.3" x2="1018.7" y2="154.7" />

            <rect class="box" x="40" y="160" width="282.7" height="112" rx="4" />
            <text class="t" x="61.3" y="194.7">SKILL.md</text>
            <text class="s" x="61.3" y="220">the contract in prose</text>
            <text class="s" x="61.3" y="244">the model reads this</text>

            <rect class="box" x="458.7" y="160" width="282.7" height="112" rx="4" />
            <text class="t" x="480" y="194.7">The rule</text>
            <text class="s" x="480" y="220">one id, one severity</text>
            <text class="s" x="480" y="244">per project or per run</text>

            <rect class="box" x="877.3" y="160" width="282.7" height="112" rx="4" />
            <text class="t" x="898.7" y="194.7">The finding</text>
            <text class="m" x="898.7" y="220">rule · file · line · fix</text>
            <text class="s" x="898.7" y="244">goes to fix-findings</text>

            <path class="flow" d="M322.7,216 H448" />
            <text class="lbl" x="385.3" y="205.3" text-anchor="middle">becomes</text>
            <path class="flow" d="M741.3,216 H866.7" />
            <text class="lbl" x="804" y="205.3" text-anchor="middle">on failure</text>

            <path class="back" d="M1018.7,272 V349.3 H181.3 V274.7" />
            <text class="rule" x="600" y="338.7" text-anchor="middle">the fix slug points to the repair steps</text>
          </svg>
            </div>
          </Panel>
        </div>
        <figcaption><b>Figure 3. Rules and repairs.</b> Each finding includes a fix slug: an identifier that links to repair instructions in a skill. <span class="name">fix-findings</span> follows that link to make the repair.</figcaption>
      </figure>

      <dl class="defs">
        <div><dt>Defect fixtures</dt><dd><code>tests/e2e/contract-defects</code> and <code>page-defects</code> introduce known defects and confirm that the browser test rules catch them.</dd></div>
        <div><dt>Checker unit tests</dt><dd><code>bin/check-page.test.ts</code> and <code>bin/check-component.test.ts</code> test the static rules.</dd></div>
        <div><dt>check:skills</dt><dd>Checks skill names, length, references, commands, and flags. Every CLI command except <code>create</code> and <code>setup-claude</code> must appear in a skill, along with all its flags.</dd></div>
        <div><dt>check:skill-atlas and check:skill-sources</dt><dd>Keep the Skill Atlas citations and skill sources in sync with each <code>SKILL.md</code>.</dd></div>
        <div><dt>Smoke runs</dt><dd>Install the package in temporary projects, build them, and run the component and page tests.</dd></div>
      </dl>

    </div>
  </section>

  <section class="chapter" id="reference" aria-labelledby="reference-title">
    <div class="chapter-body">
      <h2 id="reference-title">Rule reference</h2>
      <p>Expand a group to read its rules. The <Badge variant="warning">warn</Badge> label marks a warning by default. Add <code>--strict</code> to treat it as an error.</p>
      <div class="reference-groups">
        <div class="rule-group">
          <CollapsibleSection label="Page code · 17 rules" variant="hairline" prose={false} open={openRules['0'] ?? false} ontoggle={() => openRules['0'] = !openRules['0']}>
            <Table>
              <table aria-label="Page code · 17 rules">
                <thead><tr><th scope="col">Rule</th><th scope="col">Description</th></tr></thead>
                <tbody>
                  <tr><td>unknown-component</td><td>An import names a component outside the catalogue.</td></tr>
                  <tr><td>unknown-prop</td><td>A component receives a prop it does not declare.</td></tr>
                  <tr><td>unknown-prop-value</td><td>A prop receives a value outside the set the component accepts.</td></tr>
                  <tr><td>deep-import</td><td>An import reaches into package internals. Import from a public entry point.</td></tr>
                  <tr><td>unknown-token</td><td>A <code>var()</code> reference uses an unknown token name.</td></tr>
                  <tr><td>color-literal</td><td>A color value uses a literal instead of a design token.</td></tr>
                  <tr><td>reserved-route</td><td>A route uses the reserved <code>/live-tokens/*</code> namespace.</td></tr>
                  <tr><td>site-css-in-main</td><td><code>main.ts</code> imports <code>site.css</code>, which leaks it into the editor routes.</td></tr>
                  <tr><td>raw-text-axis</td><td>A font size, family, weight, line height, or letter spacing uses a value outside a text style.</td></tr>
                  <tr><td><div class="rule-name"><span>dimension-literal</span><Badge variant="warning">warn</Badge></div></td><td>A spacing, stroke, radius, or shadow value uses a literal instead of a token.</td></tr>
                  <tr><td><div class="rule-name"><span>hardcoded-columns</span><Badge variant="warning">warn</Badge></div></td><td>A grid uses <code>repeat(N, 1fr)</code> with four or more columns. Use <code>--columns-count</code>.</td></tr>
                  <tr><td><div class="rule-name"><span>missing-source</span><Badge variant="warning">warn</Badge></div></td><td>A route has no <code>source</code>, so Page Source cannot open it.</td></tr>
                  <tr><td><div class="rule-name"><span>control-size</span><Badge variant="warning">warn</Badge></div></td><td>The page sets <code>size</code> on a shipped component.</td></tr>
                  <tr><td><div class="rule-name"><span>multiple-primary</span><Badge variant="warning">warn</Badge></div></td><td>The page uses more than one primary Button.</td></tr>
                  <tr><td><div class="rule-name"><span>danger-without-dialog</span><Badge variant="warning">warn</Badge></div></td><td>The page has a danger Button or IconButton and no Dialog.</td></tr>
                  <tr><td><div class="rule-name"><span>native-control</span><Badge variant="warning">warn</Badge></div></td><td>A bare <code>&lt;button&gt;</code>, <code>&lt;input&gt;</code>, <code>&lt;select&gt;</code>, or <code>&lt;textarea&gt;</code> replaces a shipped control.</td></tr>
                  <tr><td><div class="rule-name"><span>property-override</span><Badge variant="warning">warn</Badge></div></td><td>The page redeclares a component's semantic property for one instance.</td></tr>
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
          <CollapsibleSection label="Component code · 20 rules" variant="hairline" prose={false} open={openRules['2'] ?? false} ontoggle={() => openRules['2'] = !openRules['2']}>
            <Table>
              <table aria-label="Component code · 20 rules">
                <thead><tr><th scope="col">Rule</th><th scope="col">Description</th></tr></thead>
                <tbody>
                  <tr><td>invalid-id</td><td>The id contains characters other than lowercase letters and digits.</td></tr>
                  <tr><td>missing-file</td><td>The runtime or editor file is missing.</td></tr>
                  <tr><td>missing-root-block</td><td>The runtime has no <code>:global(:root)</code> block.</td></tr>
                  <tr><td>no-tokens</td><td>The <code>:global(:root)</code> block declares no <code>--&lt;id&gt;-*</code> property.</td></tr>
                  <tr><td><div class="rule-name"><span>missing-description</span><Badge variant="warning">warn</Badge></div></td><td>The runtime's <code>catalogue</code> export is missing or lacks a required field.</td></tr>
                  <tr><td><div class="rule-name"><span>unread-token</span><Badge variant="warning">warn</Badge></div></td><td>The runtime declares a property and never reads it.</td></tr>
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
                  <tr><td><div class="rule-name"><span>phantom-link</span><Badge variant="warning">warn</Badge></div></td><td>A font helper spans several slots without a derivation, which links their fonts.</td></tr>
                  <tr><td><div class="rule-name"><span>dimension-literal</span><Badge variant="warning">warn</Badge></div></td><td>A default uses a raw dimension where a space, radius, or border-width token belongs.</td></tr>
                  <tr><td>config-token</td><td>A default config references an unknown token name.</td></tr>
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
                  <tr><td>tests-setup</td><td>The run could not start, found nothing to check, or a tool crashed before it wrote a report.</td></tr>
                  <tr><td>tests-incomplete</td><td>A run timed out, collected no tests, or left a component and rule pair without a result.</td></tr>
                </tbody>
              </table>
            </Table>
          </CollapsibleSection>
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
  <footer>Source: .claude/skills, bin/, src/testing, and scripts/ at v0.78.0.</footer>
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
              {#each chapters as chapter}
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
    padding: var(--space-32) var(--space-32) var(--space-64);
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
    row-gap: var(--space-40);
  }

  .chapter {
    padding-block: var(--space-48);
    scroll-margin-top: var(--space-32);
  }

  /* Prose uses seven columns; diagrams and skill groups use the full grid. */
  .chapter-body {
    display: contents;
  }

  .chapter-body > * {
    grid-column: 1 / 8;
    min-width: var(--space-0);
  }

  .chapter-body > .trio,
  .chapter-body > figure,
  .chapter-body > h2 {
    grid-column: 1 / -1;
  }

  .chapter-body > .defs,
  .chapter-body > .reference-groups {
    grid-column: 1 / 10;
  }

  .chapter-body > .repair-levels {
    grid-column: 1 / 8;
  }

  h1 {
    font-family: var(--heading-xl-font-family);
    font-size: var(--heading-xl-font-size);
    font-weight: var(--heading-xl-font-weight);
    line-height: var(--heading-xl-line-height);
    letter-spacing: var(--heading-xl-letter-spacing);
    margin: var(--space-0) var(--space-0) var(--space-128);
  }

  h2 {
    font-family: var(--heading-lg-font-family);
    font-size: var(--heading-lg-font-size);
    font-weight: var(--heading-lg-font-weight);
    line-height: var(--heading-lg-line-height);
    letter-spacing: var(--heading-lg-letter-spacing);
    margin: var(--space-0) var(--space-0) var(--space-24);
  }

  h3 {
    font-family: var(--heading-md-font-family);
    font-size: var(--heading-md-font-size);
    font-weight: var(--heading-md-font-weight);
    line-height: var(--heading-md-line-height);
    letter-spacing: var(--heading-md-letter-spacing);
    margin: var(--space-32) var(--space-0) var(--space-12);
  }

  h2 + h3 {
    margin-top: var(--space-0);
  }

  p,
  li,
  dt,
  dd,
  figcaption,
  .back-link,
  .contents a {
    font-family: var(--body-md-font-family);
    font-size: var(--body-md-font-size);
    font-weight: var(--body-md-font-weight);
    line-height: var(--body-md-line-height);
    letter-spacing: var(--body-md-letter-spacing);
  }

  p {
    margin: var(--space-0) var(--space-0) var(--space-16);
    color: var(--text-secondary);
  }

  strong {
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }

  dt {
    color: var(--text-primary);
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
    color: var(--text-secondary);
    text-decoration: none;
  }

  .introduction {
    margin: var(--space-0);
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

  .trio {
    list-style: none;
    margin: var(--space-16) var(--space-0) var(--space-24);
    padding: var(--space-0);
    display: grid;
    grid-template-columns: subgrid;
    row-gap: var(--space-16);
  }

  .trio li {
    display: grid;
    grid-column: span 4;
    min-width: var(--space-0);
    margin: var(--space-0);
  }

  .steps {
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

  .defs {
    margin: var(--space-8) var(--space-0) var(--space-24);
    display: grid;
    grid-template-columns: subgrid;
  }

  .defs > div {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: subgrid;
    padding-block: var(--space-12);
    border-top: var(--border-width-1) solid var(--border-neutral-subtle);
  }

  .defs dt {
    grid-column: 1 / 3;
    overflow-wrap: anywhere;
  }

  .defs dd {
    grid-column: 3 / -1;
    margin: var(--space-0);
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

  .rule-name {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-8);
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

  figcaption {
    grid-column: 1 / 8;
    margin-top: var(--space-16);
    color: var(--text-secondary);
  }

  figcaption b {
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }

  /* Each diagram draws at its intrinsic size, so its medium text never scales
     down; a narrower frame scrolls. */
  .dg {
    display: block;
    color: var(--text-primary);
    margin-inline: auto;
  }

  .dg :global(.box) {
    fill: var(--surface-neutral-lower);
    stroke: var(--border-neutral-subtle);
    stroke-width: var(--border-width-1);
  }

  .dg :global(.box-lead) {
    fill: var(--surface-neutral-lower);
    stroke: var(--border-accent);
    stroke-width: var(--border-width-2);
  }

  .dg :global(.t) {
    font-family: var(--heading-sm-font-family);
    font-weight: var(--heading-sm-font-weight);
    font-size: var(--heading-sm-font-size);
    fill: var(--text-primary);
  }

  .dg :global(.s),
  .dg :global(.lbl) {
    font-family: var(--body-md-font-family);
    font-size: var(--body-md-font-size);
    fill: var(--text-secondary);
  }

  .dg :global(.m) {
    font-family: var(--code-font-family);
    font-size: var(--body-md-font-size);
    fill: var(--text-secondary);
  }

  .dg :global(.rule) {
    font-family: var(--code-font-family);
    font-size: var(--body-md-font-size);
    fill: var(--text-accent);
  }

  .dg :global(.flow) {
    fill: none;
    stroke: var(--text-secondary);
    stroke-width: var(--border-width-2);
    marker-end: url(#loops-arw);
  }

  .dg :global(.flow.end) {
    marker-end: none;
  }

  .dg :global(.back) {
    fill: none;
    stroke: var(--text-accent);
    stroke-width: var(--border-width-2);
    marker-end: url(#loops-arw-back);
  }

  .dg :global(.back.end) {
    marker-end: none;
  }

  .dg :global(.rail) {
    stroke: var(--border-neutral-subtle);
    stroke-width: var(--border-width-3);
  }

  .dg :global(.lead) {
    stroke: var(--border-neutral-subtle);
    stroke-width: var(--border-width-1);
    stroke-dasharray: var(--border-width-3) var(--border-width-4);
  }

  .markers :global(.head) {
    fill: var(--text-secondary);
  }

  .markers :global(.head-back) {
    fill: var(--text-accent);
  }

  footer {
    grid-column: 1 / -1;
    padding-top: var(--space-24);
    border-top: var(--border-width-1) solid var(--border-neutral-subtle);
    font-family: var(--code-font-family);
    font-size: var(--code-font-size);
    font-weight: var(--code-font-weight);
    line-height: var(--code-line-height);
    letter-spacing: var(--code-letter-spacing);
    color: var(--text-secondary);
  }

  @media (max-width: 1023px) {
    .chapter-body > *,
    .chapter-body > .defs,
    .chapter-body > .repair-levels,
    .chapter-body > .reference-groups,
    figcaption {
      grid-column: 1 / -1;
    }

    .contents {
      top: var(--space-64);
      right: var(--space-16);
    }

    .contents.contents-collapsed {
      width: auto;
    }
  }

  /* Media queries cannot read the grid tokens. */
  @media (max-width: 767px) {
    .loops {
      grid-template-columns: minmax(var(--space-0), 1fr);
      /* Leave room for the fixed editor toolbar above the back link. */
      padding: var(--space-64) var(--space-20) var(--space-48);
    }

    h1 {
      margin-bottom: var(--space-64);
    }

    .masthead {
      row-gap: var(--space-24);
      padding-bottom: var(--space-32);
    }

    .chapter {
      padding-block: var(--space-32);
    }

    .trio li,
    .defs dt,
    .defs dd {
      grid-column: 1 / -1;
    }

    .defs dd {
      margin-top: var(--space-8);
    }

  }
</style>
