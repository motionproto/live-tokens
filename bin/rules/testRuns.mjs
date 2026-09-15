import { COLOR_BY_ROLE } from './tokens.mjs';

// Detection lives in bin/contractRunner.mjs: `runContractTests` for the
// component rules, `runPageTests` for the page rules. The ids are fixed by
// design decisions 8 and 9. Every one is an error, including the setup rules,
// which `--tests` treats as never-silenceable (see cli.mjs). A failed
// obligation is always authored: the component has to start behaving.

const RERUN =
  'Rerun the same command with --tests until every applicable rule passes with no rule left --off.';

const CREATE_COMPONENT = 'live-tokens-create-component';

const tooling = {
  'tests-not-installed': {
    severity: 'error',
    repair: 'authored',
    guidance: `The run itself failed because a tool is missing. Install the named package, @playwright/test, vitest, or happy-dom, as a devDependency, then run \`npx playwright install chromium\` for a missing browser. ${RERUN}`,
  },
  'tests-setup': {
    severity: 'error',
    repair: 'authored',
    guidance: `The run itself failed before it reported. Fix the tool, the path, or the config the message names. ${RERUN}`,
  },
  'tests-incomplete': {
    severity: 'error',
    repair: 'authored',
    guidance: `An obligation never ran to a result. Add the missing contract, or find from the message why the suite skipped it. ${RERUN}`,
  },
};

export const componentRules = {
  'contract-registry': {
    severity: 'error',
    repair: 'authored',
    guidance: `The registry contract failed. Register the component in the shared module the Registration section of ${CREATE_COMPONENT} wires up, importable by the app and by check-component --tests.`,
  },
  'contract-behavior': {
    severity: 'error',
    repair: 'authored',
    guidance: `A declared case in the component's contract failed under Vitest: a callback that never fired, fired with the wrong argument, or fired when the case said it should stay silent. Wire the runtime as the recipe in ${CREATE_COMPONENT} wires it.`,
  },
  'contract-render': {
    severity: 'error',
    repair: 'authored',
    guidance: `A shipped alias never wrote through its editor control, or the editor targets the wrong part. Fix the editor schema, states, or preview props by the Component editor section of ${CREATE_COMPONENT}.`,
  },
  'contract-alias': {
    severity: 'error',
    repair: 'authored',
    guidance: `The editor has to declare every part and every shipped alias, and each alias it paints with has to resolve at the root. Fix the editor schema by the Component editor section of ${CREATE_COMPONENT}, and point a broken alias at a design token.`,
  },
  'contract-persist': {
    severity: 'error',
    repair: 'authored',
    guidance: `An edit failed to persist, or reset failed to restore the saved config. Make the :global(:root) default the value Reset should restore, per the Runtime component section of ${CREATE_COMPONENT}.`,
  },
  'contract-theme': {
    severity: 'error',
    repair: 'authored',
    guidance: `The component failed to take the theme's values and give them back. Make each :global(:root) default read a design token, composed when needed, and declare a structural keyword, such as start, in the editor's \`intrinsics\`.`,
  },
  'contract-states': {
    severity: 'error',
    repair: 'authored',
    guidance: `The editor preview failed to show the state being edited. Fix the editor states or preview props by the Component editor section of ${CREATE_COMPONENT}.`,
  },
  'contract-interaction': {
    severity: 'error',
    repair: 'authored',
    guidance: `The component failed to answer the pointer or the keyboard in the editor. Fix the editor schema, states, or preview props by the Component editor section of ${CREATE_COMPONENT}.`,
  },
  'contract-listed': {
    severity: 'error',
    repair: 'authored',
    guidance: `The component is missing from its registry group. Register it in the shared module the Registration section of ${CREATE_COMPONENT} wires up, importable by the app and by check-component --tests.`,
  },
  'contract-sketch': {
    severity: 'error',
    repair: 'authored',
    guidance: `Add the missing Sketch part or marker, per the Sketch mode and overlays section of ${CREATE_COMPONENT}.`,
  },
  'contract-missing': {
    severity: 'error',
    repair: 'authored',
    guidance: `Add a ComponentContract for the component to the module contractsModule names, as references/contract-tests.md in ${CREATE_COMPONENT} shows. ${RERUN}`,
  },
  ...tooling,
};

export const pageRules = {
  'page-component-paint': {
    severity: 'error',
    repair: 'authored',
    guidance:
      "The finding names the page file and the line of the instance whose part painted a value its semantic property never resolves to. Remove the global rule that reaches past the component, from site.css or the page's own CSS, and retune the component's semantic property for the whole project at /live-tokens/components.",
  },
  'page-text-style': {
    severity: 'error',
    repair: 'authored',
    guidance:
      'The finding names the page file, the line of the text element, and the nearest bundle it missed. Set the text style on the text element itself, from one shipped bundle: heading, body, editorial, or code, each printed by `npx live-tokens tokens --scale <name>`. An ancestor typed for a different role hands down the wrong style.',
  },
  'page-contrast': {
    severity: 'error',
    repair: 'authored',
    guidance: `The finding names the page file, the line of the text element, the surface ancestor, and both computed colors. Pick the text token the surface pairs with. ${COLOR_BY_ROLE}`,
  },
  'page-grid': {
    severity: 'error',
    repair: 'authored',
    guidance:
      'The finding names the page file and the line of the section whose edge sits off a column line. Move the edge onto the line: place it by page-column numbers per the Grid section of live-tokens-create-page, and center a section with symmetric insets. Keep its margin, width, and transform out of the centering.',
  },
  'page-overflow': {
    severity: 'error',
    repair: 'authored',
    guidance:
      'The finding names the page file and the line of the element or the instance that overflows. Give the control its shipped width, remove a fixed width wider than its column at the viewport, and set overflow-x: auto only on an element meant to scroll, such as a code block. When the page grid itself overflows at a phone width, collapse it to grid-template-columns: 1fr and column-gap: 0, per the Grid section of live-tokens-create-page.',
  },
  ...tooling,
};
