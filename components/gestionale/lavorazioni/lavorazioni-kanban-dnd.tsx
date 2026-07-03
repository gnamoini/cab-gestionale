"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import {
  findKanbanColumnIdForRow,
  kanbanDndDevLog,
  resolveKanbanDropStato,
} from "@/lib/lavorazioni/kanban-stato-move";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const DRAG_ACTIVATION_PX = 8;

export type KanbanDndMoveHandler = (row: LavorazioneListRow, nextStato: string) => void;

export type KanbanDndBoardProps = {
  enabled: boolean;
  rows: readonly LavorazioneListRow[];
  statiOpts: readonly StatoLavorazioneConfig[];
  workflowColumnIds: ReadonlySet<string>;
  completateColumnId: string;
  attesaPreventivoColumnId: string;
  onMoveStato?: KanbanDndMoveHandler;
  renderDragOverlay: (row: LavorazioneListRow) => ReactNode;
  children: ReactNode;
};

export function KanbanDndBoard({
  enabled,
  rows,
  statiOpts,
  workflowColumnIds,
  completateColumnId,
  attesaPreventivoColumnId,
  onMoveStato,
  renderDragOverlay,
  children,
}: KanbanDndBoardProps) {
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const activeRow = activeRowId ? rowsById.get(activeRowId) : undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_PX } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      setActiveRowId(id);
      kanbanDndDevLog("dragStart", { lavorazioneId: id });
    },
    [],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveRowId(null);

      if (!over) {
        kanbanDndDevLog("dragEnd", { lavorazioneId: String(active.id), result: "cancelled" });
        return;
      }

      const rowId = String(active.id);
      const targetColumnId = String(over.id);
      const row = rowsById.get(rowId);
      if (!row) {
        kanbanDndDevLog("dragEnd", { lavorazioneId: rowId, result: "row-missing" });
        return;
      }

      const sourceColumnId = findKanbanColumnIdForRow(
        row,
        statiOpts,
        completateColumnId,
        attesaPreventivoColumnId,
        workflowColumnIds,
      );
      if (sourceColumnId === targetColumnId) {
        kanbanDndDevLog("dragEnd", { lavorazioneId: rowId, result: "same-column", targetColumnId });
        return;
      }

      const nextStato = resolveKanbanDropStato(targetColumnId, statiOpts, completateColumnId);
      if (!nextStato) {
        kanbanDndDevLog("dragEnd", { lavorazioneId: rowId, result: "invalid-target", targetColumnId });
        return;
      }

      kanbanDndDevLog("dragEnd", { lavorazioneId: rowId, from: sourceColumnId, to: targetColumnId, nextStato });
      onMoveStato?.(row, nextStato);
    },
    [
      rowsById,
      statiOpts,
      completateColumnId,
      attesaPreventivoColumnId,
      workflowColumnIds,
      onMoveStato,
    ],
  );

  const onDragCancel = useCallback(() => {
    setActiveRowId(null);
    kanbanDndDevLog("dragEnd", { result: "cancelled" });
  }, []);

  if (!enabled) return <>{children}</>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      autoScroll
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {activeRow ? renderDragOverlay(activeRow) : null}
      </DragOverlay>
    </DndContext>
  );
}

type KanbanDndDraggableProps = {
  id: string;
  disabled?: boolean;
  ariaLabel?: string;
  children: ReactNode;
};

export const KanbanDndDraggable = memo(function KanbanDndDraggable({
  id,
  disabled = false,
  ariaLabel,
  children,
}: KanbanDndDraggableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 1 : undefined }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "lavorazioni-kanban-card-dragging" : undefined}
      aria-label={ariaLabel}
      aria-grabbed={disabled ? undefined : isDragging}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
    >
      {children}
    </div>
  );
});

type KanbanDndDropZoneProps = {
  id: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

export const KanbanDndDropZone = memo(function KanbanDndDropZone({
  id,
  disabled = false,
  className,
  children,
}: KanbanDndDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      className={[
        className,
        isOver && !disabled ? "lavorazioni-kanban-column-drop-over" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
});
