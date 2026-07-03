"use client";

import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";
import { AgendaSessionBlock } from "@/components/workshop-schedule/agenda-session-block";
import { sessionDurationMinutes } from "@/lib/workshop-schedule/datetime";

const SLOT_MINUTES = 30;
const START_HOUR = 7;

function DraggableSession({
  session,
  top,
  height,
  selected,
  onSelect,
}: {
  session: WorkshopScheduleSessionView;
  top: number;
  height: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const disabled = session.eventType === "blocco_agenda";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: session.id,
    disabled,
  });
  const style = {
    top,
    height,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 20 : 10,
  };
  return (
    <div ref={setNodeRef} style={style} className="absolute left-12 right-1" {...listeners} {...attributes}>
      <AgendaSessionBlock session={session} compact selected={selected} onClick={onSelect} />
    </div>
  );
}

function DroppableSlot({ id, top, height }: { id: string; top: number; height: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 ${isOver ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,transparent)]" : ""}`}
      style={{ top, height }}
    />
  );
}

export function AgendaDndLayer({
  dayYmd,
  sessions,
  selectedId,
  onSelect,
  onReschedule,
}: {
  dayYmd: string;
  sessions: readonly WorkshopScheduleSessionView[];
  selectedId?: string | null;
  onSelect: (session: WorkshopScheduleSessionView) => void;
  onReschedule: (sessionId: string, startAt: string, endAt: string) => void;
}) {
  const slotIds = Array.from({ length: ((19 - START_HOUR) * 60) / SLOT_MINUTES }, (_, i) => `slot-${dayYmd}-${i}`);

  function handleDragEnd(ev: DragEndEvent) {
    const sessionId = String(ev.active.id);
    const overId = ev.over?.id ? String(ev.over.id) : null;
    if (!overId?.startsWith("slot-")) return;
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || session.eventType === "blocco_agenda") return;
    const slotIndex = Number(overId.split("-").pop());
    if (!Number.isFinite(slotIndex)) return;
    const duration = sessionDurationMinutes(session.startAt, session.endAt);
    const start = new Date(`${dayYmd}T${String(START_HOUR + Math.floor((slotIndex * SLOT_MINUTES) / 60)).padStart(2, "0")}:${String((slotIndex * SLOT_MINUTES) % 60).padStart(2, "0")}:00`);
    const end = new Date(start.getTime() + duration * 60_000);
    onReschedule(sessionId, start.toISOString(), end.toISOString());
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="relative min-h-[400px]">
        {slotIds.map((id, i) => (
          <DroppableSlot key={id} id={id} top={i * 28} height={28} />
        ))}
        {sessions.map((session, idx) => (
          <DraggableSession
            key={session.id}
            session={session}
            top={40 + idx * 36}
            height={32}
            selected={selectedId === session.id}
            onSelect={() => onSelect(session)}
          />
        ))}
      </div>
    </DndContext>
  );
}
