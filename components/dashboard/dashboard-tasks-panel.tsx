"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/design-system";
import { useAuth } from "@/context/auth-context";
import { appendDashboardSistemaLog } from "@/lib/dashboard/dashboard-sistema-log-storage";
import {
  createDashboardTask,
  DASHBOARD_TASKS_MAX,
  loadDashboardTasks,
  saveDashboardTasks,
  sortDashboardTasks,
  type DashboardTask,
} from "@/lib/dashboard/dashboard-tasks-storage";
import type { GestionaleLogEventTone } from "@/lib/gestionale-log/view-model";
import {
  handleSettingsAddRowEnter,
  handleSettingsInlineEditKeyDown,
} from "@/lib/settings/settings-inline-edit-keyboard";
import { dsFocus, dsInput, dsTypoCaption } from "@/lib/ui/design-system";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useRbac } from "@/src/hooks/use-rbac";

const noteActionGlyph = "h-3.5 w-3.5 shrink-0";

const noteRowBaseClass =
  "group flex min-h-[2.75rem] min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 shadow-sm shadow-black/5 transition-[border-color,background-color,box-shadow,opacity] duration-200 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_20%,var(--cab-border))] hover:shadow-[var(--cab-shadow-sm)] dark:shadow-black/20";

const noteRowActiveClass =
  "border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_42%,var(--cab-card))]";

const noteRowDoneClass =
  "border-[color:color-mix(in_srgb,var(--cab-border)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_22%,var(--cab-surface))] opacity-80";

const noteListInputClass = `${dsInput} min-w-0 flex-1 border-transparent bg-transparent py-1.5 text-sm shadow-none hover:border-transparent focus:bg-[var(--cab-surface)] focus:shadow-[var(--cab-shadow-sm)]`;

const noteCheckboxClass = `h-4 w-4 shrink-0 cursor-pointer rounded border-[color:var(--cab-border-strong)] text-[color:var(--cab-primary)] focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)] ${dsFocus}`;

const noteActionBtnClass = `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] text-[color:var(--cab-text-muted)] opacity-80 transition-[opacity,color,background-color] duration-150 hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)] group-hover:opacity-100 ${dsFocus}`;

function IconPencil({ className = noteActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.862 4.487" />
    </svg>
  );
}

function IconTrash({ className = noteActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 13h8l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NotesEmptyState({ readOnly }: { readOnly?: boolean }) {
  return (
    <div
      className="flex min-h-[5.5rem] min-w-0 flex-1 flex-col items-center justify-center rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_30%,var(--cab-surface))] px-4 py-5 text-center"
      role="status"
    >
      <p className="text-sm font-medium text-[color:var(--cab-text)]">Nessuna nota</p>
      <p className={`mt-1 max-w-[16rem] ${dsTypoCaption}`}>
        {readOnly ? "Nessuna nota locale salvata." : "Aggiungi il primo promemoria nel campo sopra."}
      </p>
    </div>
  );
}

function DashboardNoteRow({
  task,
  readOnly,
  onToggleDone,
  onRename,
  onRemove,
}: {
  task: DashboardTask;
  readOnly?: boolean;
  onToggleDone: (task: DashboardTask) => void;
  onRename: (task: DashboardTask, next: string) => void;
  onRemove: (task: DashboardTask) => void;
}) {
  const [editing, setEditing] = useState(false);
  const initialTextRef = useRef(task.text);

  function startEdit() {
    initialTextRef.current = task.text;
    setEditing(true);
  }

  function commitEdit(nextRaw: string) {
    setEditing(false);
    const next = nextRaw.trim().slice(0, 500);
    if (!next || next === task.text) return;
    onRename(task, next);
  }

  return (
    <li className={`${noteRowBaseClass} ${task.done ? noteRowDoneClass : noteRowActiveClass}`}>
      {readOnly ? null : (
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => onToggleDone(task)}
          className={noteCheckboxClass}
          aria-label={task.done ? "Segna come da fare" : "Segna come completata"}
        />
      )}

      {editing && !readOnly ? (
        <input
          className={noteListInputClass}
          defaultValue={task.text}
          autoFocus
          maxLength={500}
          aria-label="Modifica testo nota"
          onBlur={(e) => commitEdit(e.target.value)}
          onKeyDown={(e) => handleSettingsInlineEditKeyDown(e, initialTextRef.current, () => setEditing(false))}
        />
      ) : (
        <span
          className={`min-w-0 flex-1 break-words px-0.5 text-sm leading-snug ${task.done ? "text-[color:var(--cab-text-muted)] line-through" : "text-[color:var(--cab-text)]"}`}
          title={task.text}
        >
          {task.text}
        </span>
      )}

      {!readOnly ? (
        <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Azioni nota">
          {!editing ? (
            <button type="button" className={noteActionBtnClass} title="Modifica" aria-label={`Modifica ${task.text}`} onClick={startEdit}>
              <IconPencil />
            </button>
          ) : null}
          <button
            type="button"
            className={`${noteActionBtnClass} hover:text-[color:var(--cab-danger)]`}
            title="Elimina"
            aria-label={`Elimina ${task.text}`}
            onClick={() => onRemove(task)}
          >
            <IconTrash />
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function DashboardTasksPanel() {
  const { authorName } = useAuth();
  const rbac = useRbac();
  const readOnly = rbac.isGuest;
  const { confirm: askConfirm, confirmDialog } = useGestionaleConfirm();
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");

  const autore = authorName.trim() || "Operatore";
  const sortedTasks = useMemo(() => sortDashboardTasks(tasks), [tasks]);
  const pendingCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.length - pendingCount;

  function logTask(tone: GestionaleLogEventTone, tipoRiga: string, dettaglio: string) {
    appendDashboardSistemaLog({
      tone,
      tipoRiga: tipoRiga.toUpperCase(),
      oggettoRiga: "Cose da fare",
      modificaRiga: dettaglio,
      autore,
      atIso: new Date().toISOString(),
    });
  }

  useEffect(() => {
    setTasks(loadDashboardTasks());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveDashboardTasks(tasks);
  }, [tasks, ready]);

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const t = createDashboardTask(trimmed);
    setTasks((prev) => [t, ...prev].slice(0, DASHBOARD_TASKS_MAX));
    setDraft("");
    logTask("create", "CREAZIONE", `Nuova nota: ${t.text.slice(0, 200)}`);
  }

  function toggleDone(task: DashboardTask) {
    setTasks((prev) =>
      prev.map((x) => {
        if (x.id !== task.id) return x;
        const nextDone = !x.done;
        if (nextDone) {
          logTask("complete", "COMPLETATA", `Spuntata: ${x.text.slice(0, 200)}`);
        } else {
          logTask("update", "AGGIORNAMENTO", `Attività rimessa in corso: ${x.text.slice(0, 200)}`);
        }
        return { ...x, done: nextDone };
      }),
    );
  }

  function renameTask(task: DashboardTask, next: string) {
    const a = task.text.length > 100 ? `${task.text.slice(0, 100)}…` : task.text;
    const b = next.length > 100 ? `${next.slice(0, 100)}…` : next;
    logTask("update", "AGGIORNAMENTO", `Modifica testo attività: da «${a}» a «${b}»`);
    setTasks((prev) => prev.map((x) => (x.id === task.id ? { ...x, text: next } : x)));
  }

  function removeTask(task: DashboardTask) {
    const preview = task.text.length > 72 ? `${task.text.slice(0, 72)}…` : task.text;
    void askConfirm({
      title: "Eliminare nota?",
      message: preview ? `«${preview}» verrà rimossa dall'elenco.` : "La nota verrà rimossa dall'elenco.",
      destructive: true,
      confirmLabel: "Elimina",
    }).then((ok) => {
      if (!ok) return;
      logTask("delete", "ELIMINAZIONE", `Eliminata attività: ${task.text.slice(0, 200)}`);
      setTasks((prev) => prev.filter((x) => x.id !== task.id));
    });
  }

  function clearCompleted() {
    if (doneCount === 0) return;
    void askConfirm({
      title: "Rimuovere note completate?",
      message: `${doneCount} ${doneCount === 1 ? "nota completata verrà eliminata" : "note completate verranno eliminate"}.`,
      destructive: true,
      confirmLabel: "Rimuovi",
    }).then((ok) => {
      if (!ok) return;
      logTask("delete", "ELIMINAZIONE", `Rimosse ${doneCount} note completate`);
      setTasks((prev) => prev.filter((x) => !x.done));
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {readOnly ? null : (
        <div className="flex shrink-0 items-stretch gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => handleSettingsAddRowEnter(e, add)}
            placeholder="Aggiungi nota…"
            className={`${dsInput} min-h-9 min-w-0 flex-1 py-2 ${dsFocus}`}
            maxLength={500}
            aria-label="Testo nuova nota"
          />
          <Button size="sm" className="shrink-0 px-3" disabled={!draft.trim()} onClick={add}>
            Aggiungi
          </Button>
        </div>
      )}

      {tasks.length === 0 ? (
        <NotesEmptyState readOnly={readOnly} />
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <p className={dsTypoCaption}>
              {pendingCount} {pendingCount === 1 ? "attiva" : "attive"}
              {doneCount > 0 ? ` · ${doneCount} completat${doneCount === 1 ? "a" : "e"}` : ""}
              {tasks.length >= DASHBOARD_TASKS_MAX ? ` · limite ${DASHBOARD_TASKS_MAX}` : ""}
            </p>
            {!readOnly && doneCount > 0 ? (
              <button
                type="button"
                className={`shrink-0 ${dsTypoCaption} font-medium text-[color:var(--cab-danger)] underline-offset-2 hover:underline ${dsFocus}`}
                onClick={clearCompleted}
              >
                Pulisci completate
              </button>
            ) : null}
          </div>
          <ul className="gestionale-scrollbar min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pr-0.5">
            {sortedTasks.map((t) => (
              <DashboardNoteRow
                key={t.id}
                task={t}
                readOnly={readOnly}
                onToggleDone={toggleDone}
                onRename={renameTask}
                onRemove={removeTask}
              />
            ))}
          </ul>
        </>
      )}
      {confirmDialog}
    </div>
  );
}
