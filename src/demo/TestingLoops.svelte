<script lang="ts">
  import Button from '../system/components/Button.svelte';
  import CollapsibleSection from '../system/components/CollapsibleSection.svelte';
  import { navigate } from '../editor/core/routing/router';

  const chapters = [
    { id: 'tokens', title: 'Design tokens and semantic properties' },
    { id: 'skills', title: 'Skills and checkers' },
    { id: 'test-runs', title: 'Three test runs' },
    { id: 'walkthrough', title: 'A page with a new component' },
    { id: 'gates', title: 'Gates on rules and skills' },
    { id: 'reference', title: 'Rule reference' },
  ];

  function jump(event: MouseEvent, id: string) {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      <div class="masthead-top">
        <h1>Testing Loops</h1>
        <Button variant="primary" onclick={() => navigate('/demo')} icon="fas fa-arrow-left" iconPosition="left">
          Back to Demo
        </Button>
      </div>
      <p class="standfirst">Every skill ends by running a checker. Each finding names a rule, a file, a line, and a fix. The skill applies the fix and runs the checker again until it exits 0.</p>
      <nav class="contents" aria-label="Contents">
        <ol>
          {#each chapters as chapter}
            <li>
              <a href="#{chapter.id}" onclick={(event) => jump(event, chapter.id)}>{chapter.title}</a>
            </li>
          {/each}
        </ol>
      </nav>
    </div>
  </header>

  <section class="chapter" id="tokens" aria-labelledby="tokens-title">
    <div class="chapter-body">
      <h2 id="tokens-title">Design tokens and semantic properties</h2>
      <p>Every visual value passes through two names before it paints.</p>
      <p>A <strong>design token</strong> names a value: <code>--space-16</code>, <code>--radius-md</code>, <code>--surface-neutral</code>. A theme sets the design tokens.</p>
      <p>A <strong>semantic property</strong> names a role inside one component and points at a design token: <code>--card-padding: var(--space-16)</code>. The component's CSS reads the semantic property, and the editor changes the token it points at. Because the property always points at a token, a theme change reaches the component.</p>
      <p>Page CSS reads design tokens directly.</p>

      <figure>
        <div class="figure-scroll">
          <svg class="dg" width="1200" height="466.7" viewBox="0 0 1200 466.7" role="img" aria-label="A design token fills a semantic property. The property feeds a component rule, and the browser paints it. Page CSS reads the design token directly. The rule that catches each break sits under each step.">
            <text class="lbl" x="186.7" y="69.3" text-anchor="middle">a theme sets the value</text>
            <text class="lbl" x="600" y="69.3" text-anchor="middle">the editor sets the assignment</text>
            <text class="lbl" x="1013.3" y="69.3" text-anchor="middle">the browser paints</text>

            <rect class="box" x="32" y="101.3" width="309.3" height="101.3" rx="4" />
            <text class="t" x="53.3" y="133.3">Design token</text>
            <text class="m" x="53.3" y="158.7">--space-16: 16px</text>
            <text class="s" x="53.3" y="182.7">tokens.css</text>

            <rect class="box" x="421.3" y="101.3" width="357.3" height="101.3" rx="4" />
            <text class="t" x="442.7" y="133.3">Semantic property</text>
            <text class="m" x="442.7" y="158.7">--card-padding: var(--space-16)</text>
            <text class="s" x="442.7" y="182.7">Card.svelte :global(:root)</text>

            <rect class="box" x="858.7" y="101.3" width="309.3" height="101.3" rx="4" />
            <text class="t" x="880" y="133.3">Painted rule</text>
            <text class="m" x="880" y="158.7">padding: var(--card-padding)</text>
            <text class="s" x="880" y="182.7">.card</text>

            <path class="flow" d="M341.3,152 H410.7" />
            <text class="lbl" x="376" y="90.7" text-anchor="middle">fills</text>
            <path class="flow" d="M778.7,152 H848" />
            <text class="lbl" x="813.3" y="90.7" text-anchor="middle">feeds</text>

            <text class="rule" x="186.7" y="232" text-anchor="middle">unknown-token</text>
            <text class="rule" x="600" y="232" text-anchor="middle">default-not-token · unknown-suffix</text>
            <text class="rule" x="1013.3" y="232" text-anchor="middle">contract-theme</text>

            <path class="flow" d="M106.7,202.7 V370.7 H410.7" />
            <text class="lbl" x="273.3" y="360" text-anchor="middle">page CSS reads it</text>

            <rect class="box" x="421.3" y="325.3" width="357.3" height="90.7" rx="4" />
            <text class="t" x="442.7" y="356">Page CSS</text>
            <text class="m" x="442.7" y="381.3">gap: var(--space-16)</text>
            <text class="s" x="442.7" y="404">Pricing.svelte</text>

            <text class="rule" x="600" y="442.7" text-anchor="middle">color-literal · dimension-literal</text>
          </svg>
        </div>
        <figcaption><b>Figure 1.</b> Each step has a rule that catches a break. A literal color or size in page CSS trips <code>color-literal</code> or <code>dimension-literal</code>. A component default without a design token trips <code>default-not-token</code>. A component that keeps its old paint after a theme change trips <code>contract-theme</code>.</figcaption>
      </figure>
    </div>
  </section>

  <section class="chapter" id="skills" aria-labelledby="skills-title">
    <div class="chapter-body">
      <h2 id="skills-title">Skills and checkers</h2>
      <h3>Nine skills</h3>
      <p>The package bundles nine skills. <code>npx live-tokens setup-claude</code> copies them into a project.</p>
      <ul class="trio">
        <li><h4>Theme skills</h4><p><span class="name">create-theme</span> splits a request into color, type, and geometry, and passes each part to <span class="name">set-colors</span>, <span class="name">set-type</span>, or <span class="name">set-geometry</span>.</p></li>
        <li><h4>Build skills</h4><p><span class="name">create-page</span> builds a page from shipped components. It calls <span class="name">pick-component</span> to choose between similar components and <span class="name">create-component</span> to write a new one.</p></li>
        <li><h4>Check skills</h4><p><span class="name">check-compliance</span> runs <code>npx live-tokens report</code> and lists the findings. <span class="name">fix-findings</span> repairs them and reruns the checkers until both exit 0.</p></li>
      </ul>
      <p>Skills make design decisions, such as which component fits a task. Checkers verify that the files follow the rules.</p>

      <h3>Two checkers</h3>
      <p><code>check-page</code> checks a page. <code>check-component</code> checks a component's runtime file, editor file, and registration. <code>report</code> runs both across the project.</p>
      <p>Every finding has a rule id, file, line, fix slug, and repair level. <code>--fix</code> applies <code>auto</code> findings. A <code>choice</code> finding needs a decision. An <code>authored</code> finding needs new code. Skills read the <code>--json</code> output, repair, and rerun.</p>
      <p>Each checker starts by loading the project's vocabulary: the names in <code>tokens.css</code> and the semantic properties its components declare. Any other name produces a finding.</p>
      <p><code>live-tokens.config.json</code> sets each rule's severity. <code>--strict</code> turns warnings into errors for one run. <code>--tests</code> adds the test runs below.</p>
    </div>
  </section>

  <section class="chapter" id="test-runs" aria-labelledby="test-runs-title">
    <div class="chapter-body">
      <h2 id="test-runs-title">Three test runs</h2>
      <p><code>--tests</code> checks a running app. The runner copies the project data to a temporary directory, starts a dev server and a browser, and runs three suites.</p>

      <figure>
        <div class="figure-scroll">
          <svg class="dg" width="1200" height="1133.3" viewBox="0 0 1200 1133.3" role="img" aria-label="Both checkers match every name against the vocabulary in the project's tokens.css. Either checker starts one test runner, which copies the project data and starts three runs: Vitest for registration and callbacks, Playwright for the component in the editor, and Playwright for the page at its route. The skill fixes the findings and runs both checkers again until every check passes.">
            <rect class="box" x="373.3" y="32" width="453.3" height="96" rx="4" />
            <text class="t" x="394.7" y="61.3">The token vocabulary</text>
            <text class="s" x="394.7" y="85.3">every name the project’s tokens.css declares</text>
            <text class="m" x="394.7" y="109.3">--surface-* --text-* --space-* --radius-*</text>

            <path class="flow end" d="M600,128 V160" />
            <path class="flow end" d="M306.7,160 H893.3" />
            <path class="flow" d="M306.7,160 V197.3" />
            <path class="flow" d="M893.3,160 V197.3" />
            <text class="lbl" x="613.3" y="149.3">checkers match every name against it</text>

            <rect class="box-lead" x="53.3" y="197.3" width="506.7" height="146.7" rx="4" />
            <text class="t" x="74.7" y="226.7">check-component</text>
            <text class="s" x="74.7" y="256">one name per editable value</text>
            <text class="s" x="74.7" y="280">each name points at a design token</text>
            <text class="s" x="74.7" y="304">each editor row names a declared property</text>
            <text class="s" x="74.7" y="328">a valid id and a registration</text>

            <rect class="box-lead" x="640" y="197.3" width="506.7" height="146.7" rx="4" />
            <text class="t" x="661.3" y="226.7">check-page</text>
            <text class="s" x="661.3" y="256">components from the catalogue</text>
            <text class="s" x="661.3" y="280">only the props they declare</text>
            <text class="s" x="661.3" y="304">colors and sizes from design tokens</text>
            <text class="s" x="661.3" y="328">a route with a source</text>

            <path class="flow end" d="M306.7,344 V376 H600" />
            <path class="flow end" d="M893.3,344 V376 H600" />
            <path class="flow" d="M600,376 V405.3" />

            <rect class="box" x="373.3" y="405.3" width="453.3" height="85.3" rx="4" />
            <text class="t" x="394.7" y="434.7">The test runner</text>
            <text class="s" x="394.7" y="458.7">either checker starts it</text>
            <text class="m" x="394.7" y="480">bin/contractRunner.mjs</text>

            <path class="flow" d="M600,490.7 V533.3" />

            <rect class="box" x="373.3" y="533.3" width="453.3" height="85.3" rx="4" />
            <text class="t" x="394.7" y="562.7">Test harness</text>
            <text class="s" x="394.7" y="586.7">a temporary copy of the project data</text>
            <text class="s" x="394.7" y="608">its own dev server and browser</text>

            <path class="flow end" d="M600,618.7 V656" />
            <path class="flow end" d="M221.3,656 H976" />
            <path class="flow" d="M221.3,656 V688" />
            <path class="flow" d="M600,656 V688" />
            <path class="flow" d="M976,656 V688" />

            <rect class="box" x="53.3" y="688" width="337.3" height="128" rx="4" />
            <text class="t" x="74.7" y="717.3">Vitest</text>
            <text class="s" x="74.7" y="744">no browser</text>
            <text class="s" x="74.7" y="768">registration, declarations, seeds,</text>
            <text class="s" x="74.7" y="792">and callback props</text>

            <rect class="box" x="430.7" y="688" width="337.3" height="128" rx="4" />
            <text class="t" x="452" y="717.3">Playwright, the component</text>
            <text class="s" x="452" y="744">edits the component in the editor</text>
            <text class="s" x="452" y="768">eight checks, including save,</text>
            <text class="s" x="452" y="792">reload, and theme change</text>

            <rect class="box" x="808" y="688" width="337.3" height="128" rx="4" />
            <text class="t" x="829.3" y="717.3">Playwright, the page</text>
            <text class="s" x="829.3" y="744">opens the page at its route</text>
            <text class="s" x="829.3" y="768">five checks at each viewport</text>
            <text class="s" x="829.3" y="792">paint, text, contrast, grid, overflow</text>

            <path class="flow end" d="M221.3,816 V853.3" />
            <path class="flow end" d="M600,816 V853.3" />
            <path class="flow end" d="M976,816 V853.3" />
            <path class="flow end" d="M221.3,853.3 H976" />
            <path class="flow" d="M600,853.3 V885.3" />

            <rect class="box" x="373.3" y="885.3" width="453.3" height="85.3" rx="4" />
            <text class="t" x="394.7" y="914.7">Findings</text>
            <text class="s" x="394.7" y="938.7">each with a rule, file, line,</text>
            <text class="s" x="394.7" y="960">and fix slug</text>

            <path class="flow" d="M600,970.7 V1002.7" />

            <rect class="box-lead" x="400" y="1002.7" width="400" height="69.3" rx="4" />
            <text class="t" x="600" y="1032" text-anchor="middle">Fix, then run the checks again</text>
            <text class="s" x="600" y="1056" text-anchor="middle">until every check passes</text>

            <path class="back end" d="M400,1037.3 H24 V270.7" />
            <path class="back" d="M24,270.7 H50.7" />
            <path class="back end" d="M800,1037.3 H1176 V270.7" />
            <path class="back" d="M1176,270.7 H1149.3" />
            <text class="rule" x="17.3" y="653.3" text-anchor="middle" transform="rotate(-90 17.3 653.3)">run again</text>

            <text class="rule" x="600" y="1112" text-anchor="middle">a missing result counts as a failure</text>
          </svg>
        </div>
        <figcaption><b>Figure 2.</b> Both checkers use one test runner. Each run works on a fresh copy of the project data, so every run starts from the same baseline and the editor keeps its state. Results return as findings. A missing result counts as a failure.</figcaption>
      </figure>

      <h3>Vitest: wiring</h3>
      <p>Two suites run without a browser. The registry suite checks that each component has a registration, declares every editable property, and seeds each property in its default config. The behavior suite mounts each component, fires DOM events, and checks that callback props receive the right arguments.</p>

      <h3>Playwright: component in the editor</h3>
      <p>Each component has a contract in <code>src/testing/contracts/</code> that lists its parts, states, and theme expectations. One suite runs every contract through eight checks. The component appears in the editor, declares its parts and aliases, resolves every alias, renders each state, responds to pointer and keyboard, keeps an edit through save and reload, repaints on a theme change, and draws every part in Sketch mode.</p>
      <p>The theme check tests the last step in figure 1. It previews a theme and checks that each property changes or holds as the contract says. Then it cancels the preview and checks that every value returns. A component that paints a literal fails.</p>

      <h3>Playwright: page at its route</h3>
      <p>The page suite opens each page at its route, at every viewport in the testing settings, and applies five rules: component paint, text style, contrast, page grid, and overflow. A rule outside its range reports the reason. At 390px, for example, the grid rule reports that the grid needs 768px.</p>

      <h3>Coverage</h3>
      <p>The runner maps each result to a rule by the test's position in the suite, so a test keeps its rule through a rename. A component and rule pair with no result produces a <code>tests-incomplete</code> finding. <code>tests-not-installed</code>, <code>tests-setup</code>, and <code>tests-incomplete</code> always report, whatever the config says.</p>
    </div>
  </section>

  <section class="chapter" id="walkthrough" aria-labelledby="walkthrough-title">
    <div class="chapter-body">
      <h2 id="walkthrough-title">A page with a new component</h2>

      <figure>
        <div class="figure-scroll">
          <svg class="dg" width="1200" height="1066.7" viewBox="0 0 1200 1066.7" role="img" aria-label="To create a page, read the project, plan the sections, and match each need to a component. When the catalogue lacks a component, write one and check it until exit 0. Assemble the page, then verify it with the static checks and a browser. Findings return to assembly until both checkers exit 0.">
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
            <text class="lbl" x="382.7" y="946.7">exit 0</text>

            <rect class="box-lead" x="146.7" y="957.3" width="440" height="61.3" rx="4" />
            <text class="t" x="168" y="994.7">Read the page yourself</text>

            <text class="rule" x="146.7" y="1048">accent: findings return to the step that fixes them</text>
          </svg>
        </div>
        <figcaption><b>Figure 3.</b> The page path runs down the left. When the catalogue lacks a component, the path branches right, builds and checks the component, and rejoins at assembly. Both loops end at exit 0. A person reads the page last.</figcaption>
      </figure>

      <ol class="steps">
        <li><strong>Read the project.</strong> Read the route table, <code>--columns-count</code>, and the catalogue from <code>npx live-tokens components</code>.</li>
        <li><strong>Plan sections, then columns.</strong> Give each purpose its own section. Take column spans from the layout that fits the reader's task.</li>
        <li><strong>Choose components.</strong> Start with shipped components. pick-component decides between similar ones. create-component writes a missing one.</li>
        <li><strong>Check the new component.</strong> Run <code>check-component &lt;id&gt; --tests --strict</code> until it exits 0.</li>
        <li><strong>Assemble the page.</strong> Use components at their defaults, design tokens in page CSS, one text style per element, and a route with a <code>source</code>.</li>
        <li><strong>Verify.</strong> Run <code>report</code>, then <code>check-page &lt;file&gt; --tests --strict</code>. fix-findings repairs the findings. Repeat until exit 0.</li>
        <li><strong>Review by eye.</strong> Check for one <code>h1</code>, sequential heading levels, readable line lengths, and the primary action last. A person judges the layout.</li>
      </ol>
    </div>
  </section>

  <section class="chapter" id="gates" aria-labelledby="gates-title">
    <div class="chapter-body">
      <h2 id="gates-title">Gates on rules and skills</h2>
      <p>Each rule must fail on a known defect. Each skill must name only commands and flags the CLI accepts. Gates enforce both.</p>

      <figure>
        <div class="figure-scroll">
          <svg class="dg" width="1200" height="400" viewBox="0 0 1200 400" role="img" aria-label="A skill states the contract in prose. A checker rule detects a breach. A finding carries the rule and its fix slug, and the slug points to the skill section with the repair steps. A gate guards each step: check:skills, the checker unit tests and defect fixtures, and the fix-slug table.">
            <text class="lbl" x="181.3" y="53.3" text-anchor="middle">check:skills</text>
            <text class="lbl" x="181.3" y="74.7" text-anchor="middle">check:cli-strings · check:skill-atlas</text>
            <line class="lead" x1="181.3" y1="93.3" x2="181.3" y2="154.7" />

            <text class="lbl" x="600" y="53.3" text-anchor="middle">bin/check-page.test.ts</text>
            <text class="lbl" x="600" y="74.7" text-anchor="middle">tests/e2e/contract-defects · page-defects</text>
            <line class="lead" x1="600" y1="93.3" x2="600" y2="154.7" />

            <text class="lbl" x="1018.7" y="53.3" text-anchor="middle">COMPONENT_RULE_FIX</text>
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
        <figcaption><b>Figure 4.</b> Each finding carries a fix slug. fix-findings maps the slug to the skill section with the repair steps.</figcaption>
      </figure>

      <dl class="defs">
        <div><dt>Defect fixtures</dt><dd><code>tests/e2e/contract-defects</code> and <code>page-defects</code> break each rule once and confirm that the rule fails. Only development builds include them.</dd></div>
        <div><dt>Checker unit tests</dt><dd><code>bin/check-page.test.ts</code> and <code>bin/check-component.test.ts</code> test the static rules.</dd></div>
        <div><dt>check:skills</dt><dd>Lints skill prose: names, length, references, verbs, and flags. A skill that documents a verb names all its flags, and every verb appears in some skill.</dd></div>
        <div><dt>check:skill-atlas and check:skill-sources</dt><dd>Keep the Skill Atlas line citations in sync with each SKILL.md.</dd></div>
        <div><dt>Smoke runs</dt><dd>Install the packed tarball into temporary projects and run both test paths end to end.</dd></div>
      </dl>

      <div class="aside">
        <p>A model uses only the flags its skill names. <code>--carry-from</code> shipped in the CLI but appeared in no skill, so two set-colors runs carried the first theme's fonts and geometry into the second. check:skills now catches a flag missing from its skill.</p>
      </div>
    </div>
  </section>

  <section class="chapter" id="reference" aria-labelledby="reference-title">
    <div class="chapter-body">
      <h2 id="reference-title">Rule reference</h2>
      <p>A <span class="warn">warn</span> tag means the rule reports a warning by default. <code>--strict</code> makes it an error.</p>

      <CollapsibleSection label="check-page, static (17)">
        <ul class="rules">
          <li><span class="id">unknown-component</span><span>An import names a component outside the catalogue.</span></li>
          <li><span class="id">unknown-prop</span><span>A component receives a prop it does not declare.</span></li>
          <li><span class="id">unknown-prop-value</span><span>A prop receives a value outside the set the component accepts.</span></li>
          <li><span class="id">deep-import</span><span>An import reaches into package internals. Import from a public entry point.</span></li>
          <li><span class="id">unknown-token</span><span>A <code>var()</code> names something outside the vocabulary.</span></li>
          <li><span class="id">color-literal</span><span>A literal color stands where a design token belongs.</span></li>
          <li><span class="id">reserved-route</span><span>A route sits inside the reserved <code>/live-tokens/*</code> namespace.</span></li>
          <li><span class="id">site-css-in-main</span><span><code>main.ts</code> imports <code>site.css</code>, which leaks it into the editor routes.</span></li>
          <li><span class="id">raw-text-axis</span><span>A font size, family, weight, line height, or letter spacing sits outside a text style.</span></li>
          <li><span class="id">dimension-literal<span class="warn">warn</span></span><span>A spacing, stroke, or radius value is a raw dimension.</span></li>
          <li><span class="id">hardcoded-columns<span class="warn">warn</span></span><span>A grid hardcodes four or more columns. Read <code>--columns-count</code>.</span></li>
          <li><span class="id">missing-source<span class="warn">warn</span></span><span>A route has no <code>source</code>, so Page Source cannot open it.</span></li>
          <li><span class="id">control-size<span class="warn">warn</span></span><span>The page sets <code>size</code> on a shipped component.</span></li>
          <li><span class="id">multiple-primary<span class="warn">warn</span></span><span>The page holds more than one primary Button.</span></li>
          <li><span class="id">danger-without-dialog<span class="warn">warn</span></span><span>A danger Button has no Dialog to confirm it.</span></li>
          <li><span class="id">native-control<span class="warn">warn</span></span><span>A bare <code>&lt;button&gt;</code>, <code>&lt;input&gt;</code>, <code>&lt;select&gt;</code>, or <code>&lt;textarea&gt;</code> replaces a shipped control.</span></li>
          <li><span class="id">property-override<span class="warn">warn</span></span><span>The page redeclares a component's semantic property for one instance.</span></li>
        </ul>
      </CollapsibleSection>

      <CollapsibleSection label="page-*, browser (5)">
        <ul class="rules">
          <li><span class="id">page-component-paint</span><span>Each contract part of a shipped component paints its semantic property's value.</span></li>
          <li><span class="id">page-text-style</span><span>Each run of text outside a component matches a shipped text style on every axis.</span></li>
          <li><span class="id">page-contrast</span><span>Every text and surface pair meets WCAG AA.</span></li>
          <li><span class="id">page-grid</span><span>Section edges align to column lines at 768px and wider.</span></li>
          <li><span class="id">page-overflow</span><span>Content stays inside its container, and the page scrolls only vertically.</span></li>
        </ul>
      </CollapsibleSection>

      <CollapsibleSection label="check-component, static (20)">
        <ul class="rules">
          <li><span class="id">invalid-id</span><span>The id contains characters other than lowercase letters and digits.</span></li>
          <li><span class="id">missing-file</span><span>The runtime or editor file is missing.</span></li>
          <li><span class="id">missing-root-block</span><span>The runtime has no <code>:global(:root)</code> block.</span></li>
          <li><span class="id">no-tokens</span><span>The <code>:global(:root)</code> block declares no <code>--&lt;id&gt;-*</code> property.</span></li>
          <li><span class="id">missing-description<span class="warn">warn</span></span><span>The runtime's <code>catalogue</code> export lacks a required field.</span></li>
          <li><span class="id">unread-token<span class="warn">warn</span></span><span>The runtime declares a property and never reads it.</span></li>
          <li><span class="id">state-after-property</span><span>A state follows the property in a name. Write <code>-hover-surface</code>.</span></li>
          <li><span class="id">disabled-is-terminal</span><span>A name pairs <code>disabled</code> with another state. That pair never paints.</span></li>
          <li><span class="id">unknown-suffix</span><span>A property name ends in a suffix the editor has no picker for.</span></li>
          <li><span class="id">phantom-editor-token</span><span>An editor row names a property the runtime never declares.</span></li>
          <li><span class="id">color-literal</span><span>A default is a literal color.</span></li>
          <li><span class="id">missing-component-const</span><span>The editor lacks <code>const component = '&lt;id&gt;'</code>.</span></li>
          <li><span class="id">missing-all-tokens</span><span>The editor does not export <code>allTokens</code>.</span></li>
          <li><span class="id">deep-import</span><span>A component file imports from package internals.</span></li>
          <li><span class="id">missing-registration</span><span>Nothing under <code>src/</code> registers the id.</span></li>
          <li><span class="id">unknown-token-ref</span><span>A default reads a name outside the vocabulary.</span></li>
          <li><span class="id">default-not-token</span><span>A default lacks both a design token and a declared intrinsic.</span></li>
          <li><span class="id">phantom-link<span class="warn">warn</span></span><span>A font helper spans several slots without a derivation, which links their fonts.</span></li>
          <li><span class="id">dimension-literal<span class="warn">warn</span></span><span>A default uses a raw dimension where a space, radius, or border-width token belongs.</span></li>
          <li><span class="id">config-token</span><span>A saved default config names something outside the vocabulary.</span></li>
        </ul>
      </CollapsibleSection>

      <CollapsibleSection label="contract-*, Vitest and browser (11)">
        <ul class="rules">
          <li><span class="id">contract-registry</span><span>Vitest. The registration is valid, declared, and seeded.</span></li>
          <li><span class="id">contract-behavior</span><span>Vitest. Callback props receive the arguments each case expects.</span></li>
          <li><span class="id">contract-listed</span><span>Playwright. The component appears in its registry group.</span></li>
          <li><span class="id">contract-alias</span><span>Playwright. The component declares every part and alias, each alias resolves, and each edit reaches the document root.</span></li>
          <li><span class="id">contract-states</span><span>Playwright. The preview renders the state being edited.</span></li>
          <li><span class="id">contract-interaction</span><span>Playwright. The component answers the pointer and the keyboard.</span></li>
          <li><span class="id">contract-persist</span><span>Playwright. An edit survives save and reload, and Reset restores the saved config.</span></li>
          <li><span class="id">contract-theme</span><span>Playwright. A theme preview repaints the component, and Cancel restores every value.</span></li>
          <li><span class="id">contract-sketch</span><span>Playwright. Sketch mode draws every painted part.</span></li>
          <li><span class="id">contract-render</span><span>Playwright. The runtime preview paints each property on its part.</span></li>
          <li><span class="id">contract-missing</span><span>A component in the run has no contract.</span></li>
        </ul>
      </CollapsibleSection>

      <CollapsibleSection label="tests-*, always on (3)">
        <ul class="rules">
          <li><span class="id">tests-not-installed</span><span><code>@playwright/test</code>, <code>vitest</code>, or <code>happy-dom</code> is missing.</span></li>
          <li><span class="id">tests-setup</span><span>The harness failed to start, or a tool crashed before it wrote a report.</span></li>
          <li><span class="id">tests-incomplete</span><span>A run timed out, collected no tests, or left a component and rule pair without a result.</span></li>
        </ul>
      </CollapsibleSection>
    </div>
  </section>

  <footer>Source: .claude/skills, bin/, src/testing, and scripts/ at v0.78.0.</footer>
</div>

<style>
  .markers {
    position: absolute;
    width: var(--space-0);
    height: var(--space-0);
    overflow: hidden;
  }

  /* The page grid: every section and text run sits on its column lines, so
     no width here is a literal. */
  .loops {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), minmax(var(--space-0), 1fr));
    column-gap: var(--columns-gutter);
    max-width: var(--columns-max-width);
    margin-inline: auto;
    padding: var(--space-48) var(--space-32) var(--space-96);
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
    padding-block: var(--space-24) var(--space-64);
  }

  .chapter {
    padding-block: var(--space-64);
    border-top: var(--border-width-1) solid var(--border-neutral-subtle);
    scroll-margin-top: var(--space-16);
  }

  /* The body's children join the section's grid, so a figure can span the
     full width while the text beside it keeps to the reading columns. */
  .chapter-body {
    display: contents;
  }


  .chapter-body > * {
    grid-column: 1 / 7;
  }

  .chapter-body > .masthead-top {
    grid-column: 1 / -1;
  }

  .chapter-body > .trio,
  .chapter-body > .defs,
  .chapter-body > :global(.es-root) {
    grid-column: 1 / 10;
  }

  .chapter-body > .standfirst {
    grid-column: 1 / 8;
  }

  .chapter-body > .contents {
    grid-column: 1 / 9;
  }

  .chapter-body > figure {
    grid-column: 1 / -1;
  }



  h1 {
    font-family: var(--heading-lg-font-family);
    font-size: var(--heading-lg-font-size);
    font-weight: var(--heading-lg-font-weight);
    line-height: var(--heading-lg-line-height);
    letter-spacing: var(--heading-lg-letter-spacing);
    margin: var(--space-0);
  }

  h2 {
    font-family: var(--heading-md-font-family);
    font-size: var(--heading-md-font-size);
    font-weight: var(--heading-md-font-weight);
    line-height: var(--heading-md-line-height);
    letter-spacing: var(--heading-md-letter-spacing);
    margin: var(--space-0) var(--space-0) var(--space-24);
  }

  h3 {
    font-family: var(--heading-sm-font-family);
    font-size: var(--heading-sm-font-size);
    font-weight: var(--heading-sm-font-weight);
    line-height: var(--heading-sm-line-height);
    letter-spacing: var(--heading-sm-letter-spacing);
    margin: var(--space-48) var(--space-0) var(--space-12);
  }

  h2 + h3 {
    margin-top: var(--space-0);
  }

  h4 {
    font-family: var(--body-md-font-family);
    font-size: var(--body-md-font-size);
    font-weight: var(--font-weight-semibold);
    line-height: var(--body-md-line-height);
    letter-spacing: var(--body-md-letter-spacing);
    margin: var(--space-0) var(--space-0) var(--space-8);
  }

  p,
  li,
  dt,
  dd,
  figcaption,
  .contents a {
    font-family: var(--body-md-font-family);
    font-size: var(--body-md-font-size);
    font-weight: var(--body-md-font-weight);
    line-height: var(--body-md-line-height);
    letter-spacing: var(--body-md-letter-spacing);
  }

  p {
    margin: var(--space-0) var(--space-0) var(--space-16);
  }

  strong,
  dt {
    font-weight: var(--font-weight-semibold);
  }

  /* Inline-block keeps a command in one chip: it moves to the next line
     whole, and wraps inside only when it outruns the line. */
  code {
    display: inline-block;
    font-family: var(--code-font-family);
    font-size: var(--body-md-font-size);
    background: var(--tint-low);
    padding-inline: var(--space-4);
    border-radius: var(--radius-sm);
    overflow-wrap: anywhere;
  }

  .name {
    white-space: nowrap;
  }

  .masthead-top {
    display: flex;
    align-items: center;
    /* Beside the title: the editor overlay pins top-right and would cover a
       button parked at the far edge. */
    gap: var(--space-24);
    flex-wrap: wrap;
    margin-bottom: var(--space-24);
  }

  .standfirst {
    font-family: var(--editorial-lg-font-family);
    font-size: var(--editorial-lg-font-size);
    font-weight: var(--editorial-lg-font-weight);
    line-height: var(--editorial-lg-line-height);
    letter-spacing: var(--editorial-lg-letter-spacing);
    color: var(--text-secondary);
    margin: var(--space-0);
  }

  .contents {
    margin-top: var(--space-48);
    display: grid;
    grid-template-columns: subgrid;
    border-top: var(--border-width-1) solid var(--border-neutral-subtle);
  }

  .contents ol {
    display: contents;
  }

  .contents li {
    list-style: none;
    grid-column: span 4;
    border-bottom: var(--border-width-1) solid var(--border-neutral-subtle);
  }

  .contents a {
    display: block;
    padding-block: var(--space-12);
    color: var(--text-primary);
    text-decoration: none;
  }

  .contents a:hover {
    color: var(--text-accent);
  }

  .trio {
    list-style: none;
    margin: var(--space-24) var(--space-0) var(--space-32);
    padding: var(--space-0);
    display: grid;
    grid-template-columns: subgrid;
    row-gap: var(--space-16);
  }

  .trio li {
    grid-column: span 3;
    padding: var(--space-20);
    background: var(--tint-low);
    border-top: var(--border-width-2) solid var(--border-accent);
    border-radius: var(--radius-sm);
  }

  .trio p {
    margin: var(--space-0);
    color: var(--text-secondary);
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
    margin: var(--space-24) var(--space-0);
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
    grid-column: 1 / 4;
  }

  .defs dd {
    grid-column: 4 / -1;
    margin: var(--space-0);
    color: var(--text-secondary);
  }

  /* The ids size their own column, so the descriptions line up without a
     fixed width. */
  .rules {
    list-style: none;
    margin: var(--space-0);
    padding: var(--space-0);
    display: grid;
    grid-template-columns: max-content minmax(var(--space-0), 1fr);
    column-gap: var(--space-24);
  }

  .rules li {
    display: contents;
  }

  .rules li > span {
    padding-block: var(--space-12);
    border-top: var(--border-width-1) solid var(--border-neutral-subtle);
  }

  .rules li:first-child > span {
    border-top: none;
  }

  .rules li > span:last-child {
    color: var(--text-secondary);
  }

  .rules .id {
    font-family: var(--code-font-family);
    font-size: var(--body-md-font-size);
    color: var(--text-primary);
  }

  .warn {
    display: inline-block;
    margin-left: var(--space-8);
    font-family: var(--code-font-family);
    font-size: var(--body-md-font-size);
    color: var(--text-warning);
  }

  .chapter-body > :global(.es-root) {
    margin-bottom: var(--space-12);
  }

  .aside {
    border-left: var(--border-width-2) solid var(--border-accent);
    background: var(--tint-low);
    padding: var(--space-16) var(--space-24);
    margin-top: var(--space-32);
  }

  .aside p {
    margin: var(--space-0);
  }

  figure {
    display: grid;
    grid-template-columns: subgrid;
    margin: var(--space-40) var(--space-0) var(--space-48);
  }

  .figure-scroll {
    grid-column: 1 / -1;
    overflow-x: auto;
  }

  figcaption {
    grid-column: 1 / 7;
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
    background: var(--surface-neutral-lowest);
    border: var(--border-width-1) solid var(--border-neutral-subtle);
    border-radius: var(--radius-md);
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
    font-size: var(--body-md-font-size);
    color: var(--text-secondary);
  }

  /* Home's one-column point: twelve gutters leave a phone no room. A media
     query cannot read a custom property, so this width stays literal. */
  @media (max-width: 767px) {
    .loops {
      grid-template-columns: minmax(var(--space-0), 1fr);
      padding-inline: var(--space-16);
    }

    .chapter-body > *,
    .chapter-body > .masthead-top,
    .chapter-body > .trio,
    .chapter-body > .defs,
    .chapter-body > :global(.es-root),
    .chapter-body > .standfirst,
    .chapter-body > .contents,
    .chapter-body > figure,
    figcaption,
    .defs dt,
    .defs dd,
    footer {
      grid-column: 1 / -1;
    }


    .contents li,
    .trio li {
      grid-column: auto;
    }

    .rules {
      grid-template-columns: minmax(var(--space-0), 1fr);
    }

    .rules li > span:last-child {
      padding-top: var(--space-0);
      border-top: none;
    }
  }
</style>
