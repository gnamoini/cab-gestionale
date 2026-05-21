"use client";

import { useCallback, useEffect, useState } from "react";
import { CardMobileActions } from "@/components/design-system";
import type { SupportoNote } from "@/lib/supporto/supporto-note-types";
import { formatSupportoNoteDateTime } from "@/lib/supporto/supporto-notes-format";
import { dsBadgeOk, dsBtnIcon, dsTextarea } from "@/lib/ui/design-system";

function SupportoNoteActions({
  note,
  canEdit,
  editing,
  disabled,
  onToggleResolved,
  onDelete,
  onStartEdit,
}: {
  note: SupportoNote;
  canEdit: boolean;
  editing: boolean;
  disabled?: boolean;
  onToggleResolved: (id: string, resolved: boolean) => void;
  onDelete: () => void;
  onStartEdit: () => void;
}) {
  return (
    <>
      {canEdit && !editing ? (
        <button
          type="button"
          onClick={onStartEdit}
          disabled={disabled}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50 dark:border-zinc-700 dark:text-orange-400 dark:hover:bg-zinc-900"
        >
          Modifica
        </button>
      ) : null}
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 dark:border-zinc-600 dark:bg-zinc-900"
          checked={note.resolved}
          onChange={(e) => onToggleResolved(note.id, e.target.checked)}
          disabled={disabled || !canEdit || editing}
          aria-label="Segna come risolta"
        />
        <span>Risolta</span>
      </label>
      {canEdit ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled || editing}
          className={`${dsBtnIcon} text-zinc-500 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-red-400`}
          title="Elimina nota"
          aria-label="Elimina nota"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      ) : null}
    </>
  );
}

export function SupportoNoteCard({
  note,
  canEdit,
  onUpdate,
  onDelete,
  onToggleResolved,
  disabled,
}: {
  note: SupportoNote;
  canEdit: boolean;
  onUpdate: (id: string, content: string, expectedUpdatedAt: string) => void | Promise<void>;
  onDelete: (id: string) => void;
  onToggleResolved: (id: string, resolved: boolean) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const authorDisplay = note.autore.trim().toUpperCase();

  useEffect(() => {
    if (!editing) setDraft(note.body);
  }, [note.body, editing]);

  const handleDelete = useCallback(() => {
    if (!window.confirm("Eliminare questa nota?")) return;
    onDelete(note.id);
  }, [note.id, onDelete]);

  const handleSaveEdit = useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    if (t === note.body.trim()) {
      setEditing(false);
      return;
    }
    void Promise.resolve(onUpdate(note.id, t, note.updatedAt)).then(() => setEditing(false));
  }, [draft, note.body, note.id, note.updatedAt, onUpdate]);

  const cancelEdit = useCallback(() => {
    setDraft(note.body);
    setEditing(false);
  }, [note.body]);

  const startEdit = useCallback(() => {
    setDraft(note.body);
    setEditing(true);
  }, [note.body]);

  return (
    <li>
      <article
        className={`flex flex-col rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm transition-[border-color,box-shadow,background-color] duration-150 hover:border-zinc-300/90 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-zinc-600 ${
          note.resolved ? "opacity-90" : ""
        }`}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-sm font-bold tracking-wide text-orange-700">[{authorDisplay}]</p>
            {note.resolved ? (
              <span className={dsBadgeOk} title="Nota risolta">
                Risolta
              </span>
            ) : null}
          </div>
          <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{formatSupportoNoteDateTime(note.at)}</p>
          {editing ? (
            <div className="space-y-2">
              <textarea
                rows={4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={disabled}
                className={dsTextarea}
                aria-label="Modifica testo nota"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={disabled || !draft.trim()}
                  className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  Salva modifica
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={disabled}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-100">
              {note.body}
            </p>
          )}
        </div>
        {!editing ? (
          <>
            <CardMobileActions className="md:hidden">
              <SupportoNoteActions
                note={note}
                canEdit={canEdit}
                editing={editing}
                disabled={disabled}
                onToggleResolved={onToggleResolved}
                onDelete={handleDelete}
                onStartEdit={startEdit}
              />
            </CardMobileActions>
            <div className="mt-3 hidden flex-col items-end gap-2 md:flex">
              <SupportoNoteActions
                note={note}
                canEdit={canEdit}
                editing={editing}
                disabled={disabled}
                onToggleResolved={onToggleResolved}
                onDelete={handleDelete}
                onStartEdit={startEdit}
              />
            </div>
          </>
        ) : null}
      </article>
    </li>
  );
}
