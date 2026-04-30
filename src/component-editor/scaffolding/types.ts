/** Editor token: a single CSS custom property the user can theme. */
export type Token = {
  label: string;
  variable: string;
  /** When true, this token participates in the shared block when ≥2 variants agree on its value. */
  canBeShared?: boolean;
  /** Used by the editor store to identify cross-variant counterparts (e.g. all `border-width` tokens link). */
  groupKey?: string;
  /** Token row is rendered in a disabled state (still visible). */
  disabled?: boolean;
  /** Token row is omitted entirely. */
  hidden?: boolean;
};

/** Editor type-group: a fieldset containing a coordinated set of typography tokens
    (text color + font-family/size/weight/line-height) for a piece of content
    (e.g. a card title, notification body). */
export type TypeGroupConfig = {
  legend?: string;
  colorVariable: string;
  colorLabel?: string;
  familyVariable?: string;
  familyLabel?: string;
  sizeVariable?: string;
  sizeLabel?: string;
  weightVariable?: string;
  weightLabel?: string;
  lineHeightVariable?: string;
  lineHeightLabel?: string;
};
