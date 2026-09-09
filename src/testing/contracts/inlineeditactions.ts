import type { ComponentContract, PaintMap } from '../componentContract';

type Btn = 'save' | 'cancel';
type BtnState = 'default' | 'hover';

function statePaints(btn: Btn, s: BtnState): PaintMap {
  const p = `--inlineeditactions-${btn}-${s}`;
  const button = btn === 'save' ? 'saveBtn' : 'cancelBtn';
  return {
    // `-icon-size` lands as `font-size` on the button itself (the icon glyph
    // inherits it), not on a separate icon element — and a declared "icon"
    // part here would be the button's own `<i class="fas ...">`, whose native
    // ::before glyph content is never 'none', which reads as "drawn" to
    // `assertNoSketchPaint` regardless of sketch mode.
    [button]: {
      backgroundColor: `${p}-surface`,
      borderTopColor: `${p}-border`,
      borderTopWidth: `${p}-border-width`,
      borderRadius: `${p}-radius`,
      paddingTop: `${p}-padding`,
      color: `${p}-text`,
      fontSize: `${p}-icon-size`,
    },
  };
}

export const inlineEditActionsContract: ComponentContract = {
  id: 'inlineeditactions',
  origin: 'system',
  view: { variant: 'Save button' },
  root: 'saveBtn',
  parts: {
    saveBtn: '.save-btn',
    cancelBtn: '.cancel-btn',
  },
  // Every entry names its own `state` explicitly. VariantGroup mirrors the
  // last-clicked state tab across sibling variants (for the linked-block
  // chart), so switching variants without repeating `state` would silently
  // carry the previous entry's tab forward.
  properties: [
    { variant: 'Save button', state: 'default', paints: statePaints('save', 'default') },
    { variant: 'Save button', state: 'hover', paints: statePaints('save', 'hover') },
    { variant: 'Cancel button', state: 'default', paints: statePaints('cancel', 'default') },
    { variant: 'Cancel button', state: 'hover', paints: statePaints('cancel', 'hover') },
  ],
  states: [
    { state: 'default' },
    { state: 'hover' },
  ],
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--inlineeditactions-save-default-border-width',
        observe: { part: 'saveBtn', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--inlineeditactions-save-default-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--inlineeditactions-save-default-border-width', '--inlineeditactions-save-default-radius'],
    unchanged: ['--inlineeditactions-save-default-icon-size'],
    aliasedTo: {
      '--inlineeditactions-save-default-border-width': '--border-width-2',
      '--inlineeditactions-save-default-radius': '--radius-none',
    },
    observe: { part: 'saveBtn', css: 'borderTopWidth', variable: '--inlineeditactions-save-default-border-width' },
  },
  interaction: {
    part: 'saveBtn',
    role: 'button',
    cases: [
      {
        name: 'clicking save focuses the button',
        action: { kind: 'click', part: 'saveBtn' },
        expect: { kind: 'focused', part: 'saveBtn', value: true },
      },
    ],
  },
  sketch: {
    applicable: false,
    reason: 'the sketch layer has no drawable-part entry for inlineeditactions',
  },
};
