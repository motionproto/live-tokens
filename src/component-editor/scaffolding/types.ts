/** Editor token: a single CSS custom property the user can theme. */
export type Token = {
  label: string;
  variable: string;
  /** When true, this token participates in the linked block when ≥2 variants agree on its value. */
  canBeLinked?: boolean;
  /** Used by the editor store to identify cross-variant counterparts (e.g. all `border-width` tokens link). */
  groupKey?: string;
  /** Token row is rendered in a disabled state (still visible). */
  disabled?: boolean;
  /** Token row is omitted entirely. */
  hidden?: boolean;
  /** When the linked block collapses several same-label same-value rows into one,
      the surviving row carries the other groupKey leads here so writes co-propagate. */
  mergeVariables?: string[];
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
