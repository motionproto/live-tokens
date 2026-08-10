/** Drag payload shared by every surface that can hand a family to an axis: the
 *  axes list's own chips and the Selected color swatch row. The drop targets
 *  live in HarmonyAxesList and gate on this type alone. */
export const HARMONY_DRAG_TYPE = 'application/x-harmony-family';

export function startFamilyDrag(e: DragEvent, family: string): void {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData(HARMONY_DRAG_TYPE, family);
}
