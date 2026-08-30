"use client";

import { useState } from "react";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";
import {
  WORKSHOP_BLOCK_TYPES,
  WORKSHOP_EVENT_TYPES,
  WORKSHOP_PLANNING_STATUSES,
  WORKSHOP_PRIORITIES,
  PLANNING_STATUS_LABELS,
} from "@/lib/workshop-schedule/types";
import {
  BLOCK_TYPE_LABELS,
  EVENT_TYPE_LABELS,
  PRIORITY_LABELS,
} from "@/lib/workshop-schedule/agenda-ui-labels";
import {
  dsBtnDanger,
  dsBtnNeutral,
  dsBtnPrimary,
  dsInput,
  dsTypoCaption,
  lavorazioniModalSelectClass,
} from "@/lib/ui/design-system";

export type AgendaSessionFormValues = {
  id?: string;
  title: string;
  description: string;
  eventType: (typeof WORKSHOP_EVENT_TYPES)[number];
  blockType: (typeof WORKSHOP_BLOCK_TYPES)[number] | "";
  startAt: string;
  endAt: string;
  planningStatus: (typeof WORKSHOP_PLANNING_STATUSES)[number];
  priority: (typeof WORKSHOP_PRIORITIES)[number] | "";
  workOrderId: string;
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

const fieldLabel = `${dsTypoCaption} mb-1 block font-semibold uppercase tracking-wide`;

export function AgendaSessionFormModal({
  open,
  initial,
  workOrderIdPrefill,
  canWrite,
  saving,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  initial?: WorkshopScheduleSessionView | null;
  workOrderIdPrefill?: string | null;
  canWrite: boolean;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (values: AgendaSessionFormValues) => void;
  onDelete?: (id: string) => void;
}) {
  if (!open) return null;

  const formKey = `${initial?.id ?? "new"}:${initial?.startAt ?? ""}:${initial?.endAt ?? ""}:${workOrderIdPrefill ?? ""}`;

  return (
    <GestionaleModalShell
      modalSize="formMedium"
      onRequestClose={onClose}
      title={initial?.id ? "Modifica sessione" : "Nuova sessione"}
      titleId="agenda-session-form-title"
    >
      <AgendaSessionFormBody
        key={formKey}
        initial={initial}
        workOrderIdPrefill={workOrderIdPrefill}
        canWrite={canWrite}
        saving={saving}
        onClose={onClose}
        onSubmit={onSubmit}
        onDelete={onDelete}
      />
    </GestionaleModalShell>
  );
}

function AgendaSessionFormBody({
  initial,
  workOrderIdPrefill,
  canWrite,
  saving,
  onClose,
  onSubmit,
  onDelete,
}: {
  initial?: WorkshopScheduleSessionView | null;
  workOrderIdPrefill?: string | null;
  canWrite: boolean;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (values: AgendaSessionFormValues) => void;
  onDelete?: (id: string) => void;
}) {
  const [form, setForm] = useState<AgendaSessionFormValues>(() => defaultForm(initial, workOrderIdPrefill));

  const isBlock = form.eventType === "blocco_agenda";
  const readOnly = !canWrite;

  return (
    <>
      <GestionaleModalScrollBody className="space-y-4 p-4 text-sm">
        <label className="block">
          <span className={fieldLabel}>Titolo</span>
          <input
            className={dsInput}
            value={form.title}
            disabled={readOnly}
            placeholder="Es. Revisione freni"
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </label>

        <label className="block">
          <span className={fieldLabel}>Tipo evento</span>
          <select
            className={lavorazioniModalSelectClass}
            value={form.eventType}
            disabled={readOnly}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                eventType: e.target.value as AgendaSessionFormValues["eventType"],
                workOrderId: e.target.value === "blocco_agenda" ? "" : f.workOrderId,
              }))
            }
          >
            {WORKSHOP_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        {isBlock ? (
          <label className="block">
            <span className={fieldLabel}>Tipo blocco</span>
            <select
              className={lavorazioniModalSelectClass}
              value={form.blockType}
              disabled={readOnly}
              onChange={(e) => setForm((f) => ({ ...f, blockType: e.target.value as AgendaSessionFormValues["blockType"] }))}
            >
              <option value="">Seleziona…</option>
              {WORKSHOP_BLOCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BLOCK_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="block">
              <span className={fieldLabel}>ID lavorazione (opzionale)</span>
              <input
                className={`${dsInput} font-mono text-xs`}
                value={form.workOrderId}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, workOrderId: e.target.value.trim() }))}
                placeholder="UUID lavorazione"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={fieldLabel}>Stato pianificazione</span>
                <select
                  className={lavorazioniModalSelectClass}
                  value={form.planningStatus}
                  disabled={readOnly}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      planningStatus: e.target.value as AgendaSessionFormValues["planningStatus"],
                    }))
                  }
                >
                  {WORKSHOP_PLANNING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PLANNING_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={fieldLabel}>Priorità</span>
                <select
                  className={lavorazioniModalSelectClass}
                  value={form.priority}
                  disabled={readOnly}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      priority: e.target.value as AgendaSessionFormValues["priority"],
                    }))
                  }
                >
                  <option value="">Nessuna</option>
                  {WORKSHOP_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={fieldLabel}>Inizio</span>
            <input
              type="datetime-local"
              className={dsInput}
              value={toLocalInput(form.startAt)}
              disabled={readOnly}
              onChange={(e) => setForm((f) => ({ ...f, startAt: fromLocalInput(e.target.value) }))}
            />
          </label>
          <label className="block">
            <span className={fieldLabel}>Fine</span>
            <input
              type="datetime-local"
              className={dsInput}
              value={toLocalInput(form.endAt)}
              disabled={readOnly}
              onChange={(e) => setForm((f) => ({ ...f, endAt: fromLocalInput(e.target.value) }))}
            />
          </label>
        </div>

        <label className="block">
          <span className={fieldLabel}>Descrizione</span>
          <GestionaleTextarea
            value={form.description}
            disabled={readOnly}
            placeholder="Note interne, dettagli operativi…"
            onChange={(description) => setForm((f) => ({ ...f, description }))}
          />
        </label>
      </GestionaleModalScrollBody>

      <div className="flex min-w-0 shrink-0 justify-between gap-2 border-t border-[color:var(--cab-border)] p-3 flex-nowrap sm:flex-wrap">
        <div>
          {initial?.id && onDelete && canWrite ? (
            <button type="button" className={dsBtnDanger} disabled={saving} onClick={() => onDelete(initial.id)}>
              Elimina
            </button>
          ) : null}
        </div>
        <div className="flex min-w-0 gap-2 flex-nowrap sm:flex-wrap">
          <button type="button" className={dsBtnNeutral} onClick={onClose}>
            Chiudi
          </button>
          {canWrite ? (
            <button type="button" className={dsBtnPrimary} disabled={saving} onClick={() => onSubmit(form)}>
              {saving ? "Salvataggio…" : "Salva"}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

function defaultForm(initial?: WorkshopScheduleSessionView | null, workOrderIdPrefill?: string | null): AgendaSessionFormValues {
  const now = new Date();
  const start = initial?.startAt ?? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0).toISOString();
  const end = initial?.endAt ?? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0).toISOString();
  return {
    id: initial?.id,
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    eventType: initial?.eventType ?? "intervento_programmato",
    blockType: initial?.blockType ?? "",
    startAt: start,
    endAt: end,
    planningStatus: initial?.planningStatus ?? "scheduled",
    priority: initial?.priority ?? "media",
    workOrderId: initial?.workOrderId ?? workOrderIdPrefill ?? "",
  };
}
