"use client";

import { useCallback, useEffect, useState } from "react";
import { IconActionButton } from "@/components/design-system";
import type { SupportoNote } from "@/lib/supporto/supporto-note-types";
import { formatSupportoNoteDateTime } from "@/lib/supporto/supporto-notes-format";
import {
  dsBadgeOk,
  dsBtnNeutral,
  dsBtnPrimary,
  dsTableActionBtnDanger,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionGlyph,
  dsTableActionsGroupEnd,
  dsTextarea,
  dsTypoBody,
  dsTypoCaption,
} from "@/lib/ui/design-system";

function IconPencil({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 7.125L16.862 4.487"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheckResolved({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 12.5l2 2 4-4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconTrash({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 13h8l1-13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SupportoNoteActions({
  note,
  canEdit,
  canModerate,
  disabled,
  onToggleResolved,
  onDelete,
  onStartEdit,
}: {
  note: SupportoNote;
  canEdit: boolean;
  canModerate: boolean;
  disabled?: boolean;
  onToggleResolved: (id: string, resolved: boolean) => void;
  onDelete: () => void;
  onStartEdit: () => void;
}) {
  const resolvedLabel = note.resolved ? "Segna come aperta" : "Segna come risolta";

  return (
    <div className={dsTableActionsGroupEnd}>
      {canEdit ? (
        <IconActionButton
          label="Modifica nota"
          tooltipContent="Modifica"
          className={dsTableActionBtnSecondary}
          disabled={disabled}
          onClick={onStartEdit}
        >
          <IconPencil />
        </IconActionButton>
      ) : null}
      {canModerate ? (
        <IconActionButton
          label={resolvedLabel}
          tooltipContent={resolvedLabel}
          className={note.resolved ? dsTableActionBtnPrimary : dsTableActionBtnSecondary}
          disabled={disabled}
          aria-pressed={note.resolved}
          onClick={() => onToggleResolved(note.id, !note.resolved)}
        >
          <IconCheckResolved />
        </IconActionButton>
      ) : null}
      {canModerate ? (
        <IconActionButton
          label="Elimina nota"
          tooltipContent="Elimina"
          className={dsTableActionBtnDanger}
          disabled={disabled}
          onClick={onDelete}
        >
          <IconTrash />
        </IconActionButton>
      ) : null}
    </div>
  );
}

const supportoNoteCardShell =
  "rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2.5 shadow-[var(--cab-shadow-sm)] transition-[border-color,box-shadow] duration-150 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] hover:shadow-[var(--cab-shadow-md)]";

export function SupportoNoteCard({
  note,
  canEdit,
  canModerate,
  onUpdate,
  onDelete,
  onToggleResolved,
  disabled,
}: {
  note: SupportoNote;
  canEdit: boolean;
  canModerate: boolean;
  onUpdate: (id: string, content: string, expectedUpdatedAt: string) => void | Promise<void>;
  onDelete: (id: string) => void;
  onToggleResolved: (id: string, resolved: boolean) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const authorDisplay = note.autore.trim().toUpperCase();
  const showActions = !editing && (canEdit || canModerate);

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
      <article className={`${supportoNoteCardShell} ${note.resolved ? "opacity-90" : ""}`}>
        {editing ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="text-xs font-bold tracking-wide text-[color:var(--cab-primary)]">[{authorDisplay}]</p>
              {note.resolved ? (
                <span className={`${dsBadgeOk} py-0`} title="Nota risolta">
                  Risolta
                </span>
              ) : null}
              <p className={dsTypoCaption}>{formatSupportoNoteDateTime(note.at)}</p>
            </div>
            <textarea
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={disabled}
              className={`${dsTextarea} text-sm`}
              aria-label="Modifica testo nota"
            />
            <div className="flex flex-wrap justify-end gap-1.5">
              <button type="button" onClick={cancelEdit} disabled={disabled} className={dsBtnNeutral}>
                Annulla
              </button>
              <button type="button" onClick={handleSaveEdit} disabled={disabled || !draft.trim()} className={dsBtnPrimary}>
                Salva
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="text-xs font-bold tracking-wide text-[color:var(--cab-primary)]">[{authorDisplay}]</p>
                {note.resolved ? (
                  <span className={`${dsBadgeOk} py-0`} title="Nota risolta">
                    Risolta
                  </span>
                ) : null}
                <p className={dsTypoCaption}>{formatSupportoNoteDateTime(note.at)}</p>
              </div>
              <p className={`${dsTypoBody} whitespace-pre-wrap break-words leading-snug`}>{note.body}</p>
            </div>
            {showActions ? (
              <SupportoNoteActions
                note={note}
                canEdit={canEdit}
                canModerate={canModerate}
                disabled={disabled}
                onToggleResolved={onToggleResolved}
                onDelete={handleDelete}
                onStartEdit={startEdit}
              />
            ) : null}
          </div>
        )}
      </article>
    </li>
  );
}
