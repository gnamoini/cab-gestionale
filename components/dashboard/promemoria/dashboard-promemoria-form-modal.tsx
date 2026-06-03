"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, LoadingButton } from "@/components/design-system";
import { GlobalDatePickerYmd } from "@/components/gestionale/global-input";
import {
  GestionaleModalScrollBody,
  GestionaleModalShell,
} from "@/components/gestionale/gestionale-modal";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import type { DashboardPromemoriaRow } from "@/lib/dashboard/dashboard-promemoria-types";
import { promemoriaEventTimeInputValue } from "@/lib/dashboard/dashboard-promemoria-reminder";
import { useBeforeUnloadWhenDirty } from "@/lib/forms/use-before-unload-when-dirty";
import { dsInput, dsModalFormFooter, dsTypoSmall } from "@/lib/ui/design-system";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";

function promemoriaFormSnapshot(payload: {
  eventDate: string;
  eventTime: string;
  title: string;
  description: string;
}): string {
  return JSON.stringify({
    eventDate: payload.eventDate,
    eventTime: payload.eventTime.trim(),
    title: payload.title.trim(),
    description: payload.description.trim(),
  });
}

export function DashboardPromemoriaFormModal({
  onClose,
  initialDate,
  editing,
  saving,
  onSubmit,
}: {
  onClose: () => void;
  initialDate: string;
  editing: DashboardPromemoriaRow | null;
  saving: boolean;
  onSubmit: (payload: { eventDate: string; eventTime: string | null; title: string; description: string | null }) => void;
}) {
  const [eventDate, setEventDate] = useState(initialDate);
  const [eventTime, setEventTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [baselineSnapshot, setBaselineSnapshot] = useState("");
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const dataFieldId = useId();
  const timeFieldId = useId();
  const titleFieldId = useId();
  const descriptionFieldId = useId();

  useEffect(() => {
    const nextDate = editing?.event_date ?? initialDate;
    const nextTime = promemoriaEventTimeInputValue(editing?.event_time);
    const nextTitle = editing?.title ?? "";
    const nextDescription = editing?.description ?? "";
    setEventDate(nextDate);
    setEventTime(nextTime);
    setTitle(nextTitle);
    setDescription(nextDescription);
    setBaselineSnapshot(
      promemoriaFormSnapshot({
        eventDate: nextDate,
        eventTime: nextTime,
        title: nextTitle,
        description: nextDescription,
      }),
    );
    setUnsavedExitOpen(false);
  }, [editing, initialDate]);

  const isDirty = useMemo(() => {
    if (!baselineSnapshot) return false;
    return (
      promemoriaFormSnapshot({ eventDate, eventTime, title, description }) !== baselineSnapshot
    );
  }, [baselineSnapshot, eventDate, eventTime, title, description]);

  useBeforeUnloadWhenDirty(isDirty, "Hai modifiche non salvate nel promemoria.");

  const submitPayload = useCallback(() => {
    onSubmit({
      eventDate,
      eventTime: eventTime.trim() || null,
      title,
      description: description.trim() || null,
    });
  }, [description, eventDate, eventTime, onSubmit, title]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitPayload();
  }

  const requestClose = useCallback(() => {
    if (saving) return;
    if (isDirty) {
      setUnsavedExitOpen(true);
      return;
    }
    onClose();
  }, [isDirty, onClose, saving]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <GestionaleModalShell
        onRequestClose={requestClose}
        title={editing ? "Modifica promemoria" : "Nuovo promemoria"}
        titleId="dashboard-promemoria-modal-title"
        dialogSize="compact"
        maxWidthClass="max-w-md"
        layerClassName="cursor-pointer"
      >
        <form
          ref={formRef}
          id="dashboard-promemoria-form"
          {...gestionaleFormFocusScopeProps()}
          className={`${gestionaleModalBodyFlexClass} min-w-0 overflow-hidden`}
          onSubmit={handleSubmit}
        >
          <GestionaleModalScrollBody className="space-y-4 p-4">
            <label className="flex flex-col gap-1" htmlFor={dataFieldId}>
              <span
                className={`${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}
              >
                Data
              </span>
              <GlobalDatePickerYmd
                id={dataFieldId}
                valueYmd={eventDate}
                onChangeYmd={setEventDate}
                aria-label="Data promemoria"
                variant="default"
              />
            </label>
            <label className="flex flex-col gap-1" htmlFor={timeFieldId}>
              <span
                className={`${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}
              >
                Orario (facoltativo)
              </span>
              <input
                id={timeFieldId}
                type="time"
                className={dsInput}
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                aria-label="Orario promemoria"
              />
              <span className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
                Se impostato, la notifica arriva 30 minuti prima; altrimenti alle 09:00.
              </span>
            </label>
            <label className="flex flex-col gap-1" htmlFor={titleFieldId}>
              <span
                className={`${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}
              >
                Titolo
              </span>
              <input
                id={titleFieldId}
                className={dsInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                placeholder="Es. Revisione mezzo ABC"
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1" htmlFor={descriptionFieldId}>
              <span
                className={`${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}
              >
                Descrizione (facoltativa)
              </span>
              <textarea
                id={descriptionFieldId}
                className={`${dsInput} min-h-[5rem] resize-y`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                placeholder="Dettagli aggiuntivi…"
              />
            </label>
          </GestionaleModalScrollBody>
          <footer className={dsModalFormFooter}>
            <div className="ml-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button type="button" variant="secondary" onClick={requestClose} disabled={saving}>
                Annulla
              </Button>
              <LoadingButton type="submit" loading={saving} disabled={saving}>
                {editing ? "Salva" : "Crea"}
              </LoadingButton>
            </div>
          </footer>
        </form>
      </GestionaleModalShell>
      <GestionaleUnsavedChangesDialog
        open={unsavedExitOpen}
        placement="stacked"
        title="Modifiche non salvate"
        message="Hai modifiche non salvate nel promemoria. Come vuoi procedere?"
        pending={saving}
        onStay={() => setUnsavedExitOpen(false)}
        onDiscard={() => {
          setUnsavedExitOpen(false);
          onClose();
        }}
        onSaveAndExit={() => {
          setUnsavedExitOpen(false);
          submitPayload();
        }}
      />
    </>,
    document.body,
  );
}
