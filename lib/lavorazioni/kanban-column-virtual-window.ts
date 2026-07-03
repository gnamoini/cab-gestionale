/** PR-6 — kanban column virtual window (presentation U5). */

export const KANBAN_CARD_ESTIMATE_PX = 92;
export const KANBAN_COLUMN_OVERSCAN = 4;

export type KanbanColumnWindow = Readonly<{
  start: number;
  end: number;
  topSpacerPx: number;
  bottomSpacerPx: number;
}>;

export function sliceKanbanColumnWindow<T>(
  items: readonly T[],
  scrollTop: number,
  viewportHeight: number,
  itemHeightPx = KANBAN_CARD_ESTIMATE_PX,
  overscan = KANBAN_COLUMN_OVERSCAN,
): KanbanColumnWindow {
  if (items.length === 0) {
    return { start: 0, end: 0, topSpacerPx: 0, bottomSpacerPx: 0 };
  }
  const start = Math.max(0, Math.floor(scrollTop / itemHeightPx) - overscan);
  const visibleCount = Math.ceil(viewportHeight / itemHeightPx) + overscan * 2;
  const end = Math.min(items.length, start + visibleCount);
  return {
    start,
    end,
    topSpacerPx: start * itemHeightPx,
    bottomSpacerPx: Math.max(0, (items.length - end) * itemHeightPx),
  };
}
