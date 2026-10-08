import {
  DEFAULTS,
  EYEBROW_PREFIX,
  STEPS,
  USAGES,
  stepPrefix,
  type StylePrefix,
  type Usage,
} from '../../core/typeScale/typeScale';

export interface TextStyle {
  name: string;
  label: string;
  /** Variable prefix, e.g. `--heading-xl`; suffixes form each axis var. */
  prefix: StylePrefix;
  /** The elements `site.css` styles with it, or else its class. */
  defaultElement: string;
  preview: string;
  /** Whether this style exposes an editable `-text-transform` axis. */
  hasTextTransform?: boolean;
}

const USAGE_LABEL: Readonly<Record<Usage, string>> = {
  display: 'Display',
  heading: 'Heading',
  body: 'Body',
  editorial: 'Editorial',
  code: 'Code',
};

const USAGE_PREVIEW: Readonly<Record<Usage, string>> = {
  display: 'Tokens that move with every edit',
  heading: 'Choosing a palette for the launch page',
  body: 'Body copy for comfortable reading.',
  editorial: 'A pull quote sets the tone for the essay.',
  code: 'const total = sum(items.map(price));',
};

/** Every text style in `tokens.css` order: each usage's steps, largest first, then the eyebrow. */
export const TEXT_STYLES: TextStyle[] = [
  ...USAGES.flatMap((usage) =>
    [...STEPS].reverse().map((step): TextStyle => {
      const name = `${usage}-${step}`;
      const elements = DEFAULTS.usages[usage].elements[step];
      return {
        name,
        label: `${USAGE_LABEL[usage]} ${step.toUpperCase()}`,
        prefix: stepPrefix(usage, step),
        defaultElement: elements ? elements.join(', ') : `.${name}`,
        preview: USAGE_PREVIEW[usage],
      };
    }),
  ),
  {
    name: 'eyebrow',
    label: 'Eyebrow',
    prefix: EYEBROW_PREFIX,
    defaultElement: '.eyebrow',
    preview: 'Release notes',
    hasTextTransform: true,
  },
];
