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
          className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50 dark:border-zinc-700 dark:text-orange-400 dark:hover:bg-zinc-900"
        >
          Modifica
        </button>
      ) : null}
      <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 dark:border-zinc-600 dark:bg-zinc-900"
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
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
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
        className={`flex flex-col rounded-lg border border-zinc-200/90 bg-white px-3 py-2 shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-zinc-300/90 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-zinc-600 ${
          note.resolved ? "opacity-90" : ""
        }`}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-xs font-bold tracking-wide text-orange-700">[{authorDisplay}]</p>
            {note.resolved ? (
              <span className={`${dsBadgeOk} text-[10px] py-0`} title="Nota risolta">
                Risolta
              </span>
            ) : null}
            <p className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">{formatSupportoNoteDateTime(note.at)}</p>
          </div>
          {editing ? (
            <div className="space-y-1.5 pt-0.5">
              <textarea
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={disabled}
                className={`${dsTextarea} text-sm`}
                aria-label="Modifica testo nota"
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={disabled || !draft.trim()}
                  className="rounded-md bg-orange-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  Salva
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={disabled}
                  className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-snug text-zinc-800 dark:text-zinc-100">
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
            <div className="mt-1.5 hidden flex-col items-end gap-1 md:flex">
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
