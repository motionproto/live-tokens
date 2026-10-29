const HELP =
  'The message names the engine rule, the element, and the URL of a help page that states the requirement and its repair.';

const review = {
  'a11y-review': {
    severity: 'warn',
    repair: 'authored',
    guidance: `An engine could not decide the check, typically for text, a focus ring, or a control's edge over a gradient, an image, or a backdrop. ${HELP} Judge the element by eye against the help page, and repair it when it fails.`,
  },
};

const adaptation = {
  'a11y-text-spacing': {
    severity: 'warn',
    repair: 'authored',
    guidance: `Content overflows under the WCAG 2.2 SC 1.4.12 text spacing override: line height 1.5, paragraph spacing 2em, letter spacing 0.12em, and word spacing 0.16em. ${HELP} Let the element the finding names grow with its text: drop its fixed height or width, or its white-space: nowrap. In a component finding, details.variables in --json names the semantic properties that set the element's size.`,
  },
  'a11y-reduced-motion': {
    severity: 'warn',
    repair: 'authored',
    guidance: `An animation or transition keeps running past 200 ms under prefers-reduced-motion: reduce. ${HELP} Stop the motion, or cut it to a fade, inside @media (prefers-reduced-motion: reduce).`,
  },
};

export const componentRules = {
  'a11y-component': {
    severity: 'warn',
    repair: 'authored',
    guidance: `axe found a WCAG 2 A or AA failure inside the component's preview, or a focus ring or control boundary measures below 3:1 against its backdrop under WCAG 2.2 SC 1.4.11. ${HELP} Repair the runtime markup, or point the semantic property that fails at a design token that passes, then rerun check-component --tests. details.variables in --json names the semantic properties the finding traces to. An aria-snapshot finding means the component's accessibility tree changed since it was recorded: confirm the change is deliberate, then rerun with --update-aria.`,
  },
  ...review,
  'a11y-focus-visible': {
    severity: 'warn',
    repair: 'authored',
    guidance: `Siteimprove Alfa rule SIA-R65 found no visible change when the element takes focus. ${HELP} Give the element a :focus-visible style, such as an outline, that differs from its resting style. Alfa reads only the element, its descendants, and its ancestors. The suite's focus probe also reads the element's siblings and drops the finding when it finds the ring there.`,
  },
  'a11y-keyboard': {
    severity: 'warn',
    repair: 'authored',
    guidance: `A keyboard case of the component's interaction contract failed: a key that should activate, move, or close did nothing. ${HELP} Handle the key on the element that holds focus, as the WAI-ARIA pattern for its role describes.`,
  },
  ...adaptation,
};

export const pageRules = {
  'a11y-page': {
    severity: 'warn',
    repair: 'authored',
    guidance: `axe found a WCAG 2 A or AA failure on the page, outside the shipped components. ${HELP} Repair the page markup at the line the finding names. Text contrast reports under page-contrast.`,
  },
  ...review,
  ...adaptation,
};
