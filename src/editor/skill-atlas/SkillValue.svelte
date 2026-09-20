<script lang="ts">
  import Table from '../../system/components/Table.svelte';
  import { pickComponentEval } from './evalResults';

  const result = pickComponentEval;
  const [withSkills, without] = result.arms;
  const difference = (withSkills.score - without.score).toFixed(2);
</script>

<article class="skill-value" aria-labelledby="skill-value-title">
  <div class="measure">
    <p class="eyebrow">Measured value</p>
    <h2 id="skill-value-title">The skills make an agent faster. The component entries make it right.</h2>
    <p class="lead">
      An eval asked an agent to choose a component for twelve requirements, three times with the
      skills loaded and three times with none. Every run that finished chose all twelve correctly,
      in both arms. The skills changed the cost of getting there.
    </p>
  </div>

  <div class="results">
    <Table>
      <table>
        <thead>
          <tr>
            <th scope="col"><span class="visually-hidden">Arm</span></th>
            <th scope="col">Score</th>
            <th scope="col">Requirements right</th>
            <th scope="col">Ran the catalogue command</th>
            <th scope="col">Turns</th>
            <th scope="col">Seconds</th>
          </tr>
        </thead>
        <tbody>
          {#each result.arms as arm (arm.label)}
            <tr>
              <td class="arm">{arm.label}</td>
              <td>{arm.score.toFixed(2)}</td>
              <td>{arm.rowsRight}</td>
              <td>{arm.ranCatalogue}</td>
              <td>{arm.turns}</td>
              <td>{arm.seconds}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </Table>
  </div>

  <div class="measure">
    <h3>Accuracy comes from the component</h3>
    <p>
      Each component file carries its own entry: <code>whenToUse</code> states the condition that
      makes it right, and <code>whenNotToUse</code> lists the conditions that rule it out, each with
      the component to use in its place. An agent with no skills opened the component files, found
      those entries, and made the same twelve choices, including the two requirements nothing
      shipped fits and the destructive action that belongs in a Dialog.
    </p>

    <h3>Efficiency comes from the skill</h3>
    <p>
      The pick-component skill sends the agent to one command,
      <code>npx live-tokens components --json</code>, which returns every entry at once. With the
      skills the agent answered in {withSkills.turns} turns and under a minute. Without them it
      never found the command, read files one at a time for {without.turns} turns, and one of its
      three runs reached the five minute limit before it answered.
    </p>

    <h3>Method</h3>
    <ul>
      <li>Case <code>{result.id}</code>, run on {result.date}.</li>
      <li>Twelve requirements: ten with one right component, two that nothing shipped fits.</li>
      <li>Three runs per arm. The runner adds the arm without skills on its own.</li>
      <li>
        Each requirement has its own pattern grader, so a failure names its row. One more grader
        checks that the agent ran the catalogue command.
      </li>
      <li>
        The score is the share of graders that pass. The difference of {difference} comes from one
        timeout and from the catalogue-command grader. No finished run chose a wrong component.
      </li>
    </ul>

    <h3>Limits</h3>
    <p>
      Three runs per arm is a small sample, and one timeout moves the score a long way. The twelve
      requirements each have a clear answer in the entries. A harder case, where two components
      both fit, has not been measured.
    </p>
  </div>
</article>

<style>
  /* The atlas locks to the viewport on desktop, so the report scrolls itself. */
  .skill-value {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: var(--space-48);
    color: var(--text-secondary);
  }

  .measure {
    max-width: 70ch;
  }

  .results {
    max-width: 110ch;
    margin: var(--space-32) 0 var(--space-40);
  }

  .eyebrow {
    margin: 0 0 var(--space-8);
    font-family: var(--eyebrow-font-family);
    font-size: var(--eyebrow-font-size);
    font-weight: var(--eyebrow-font-weight);
    line-height: var(--eyebrow-line-height);
    letter-spacing: var(--eyebrow-letter-spacing);
    text-transform: var(--eyebrow-text-transform);
    color: var(--text-tertiary);
  }

  h2 {
    margin: 0 0 var(--space-24);
    font-family: var(--heading-lg-font-family);
    font-size: var(--heading-lg-font-size);
    font-weight: var(--heading-lg-font-weight);
    line-height: var(--heading-lg-line-height);
    letter-spacing: var(--heading-lg-letter-spacing);
    color: var(--text-primary);
  }

  h3 {
    margin: var(--space-40) 0 var(--space-12);
    font-family: var(--heading-sm-font-family);
    font-size: var(--heading-sm-font-size);
    font-weight: var(--heading-sm-font-weight);
    line-height: var(--heading-sm-line-height);
    letter-spacing: var(--heading-sm-letter-spacing);
    color: var(--text-primary);
  }

  .measure > h3:first-child {
    margin-top: 0;
  }

  p,
  li {
    font-family: var(--body-md-font-family);
    font-size: var(--body-md-font-size);
    font-weight: var(--body-md-font-weight);
    line-height: var(--body-md-line-height);
    letter-spacing: var(--body-md-letter-spacing);
  }

  p {
    margin: 0 0 var(--space-16);
  }

  .lead {
    margin-bottom: 0;
    color: var(--text-primary);
  }

  ul {
    margin: 0;
    padding-left: var(--space-24);
  }

  li + li {
    margin-top: var(--space-8);
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
    /* The code face joins `--` into one dash, and a line may break between the
       two hyphens. Either misprints a CLI flag. */
    font-variant-ligatures: none;
    white-space: nowrap;
  }

  .results td.arm {
    color: var(--text-primary);
    white-space: nowrap;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
