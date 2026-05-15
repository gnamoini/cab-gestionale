"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useCabAppSettingsPayloadQuery, type CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";
import { useLavorazioneCreateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsInput, dsLabel, gestionaleSelectNativePlainClass } from "@/lib/ui/design-system";

const PRIORITA_OPTS: PrioritaLavorazione[] = ["bassa", "media", "alta", "urgente"];

function ymdToIsoMidUtc(ymd: string): string {
  const p = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p)) return new Date().toISOString();
  const [y, m, d] = p.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date().toISOString();
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0)).toISOString();
}

function todayYmd(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Stati lavorazioni definiti esplicitamente in `app_settings` (modulo lavorazioni, key prefs).
 * Nessun fallback a liste statiche: array vuoto se mancante o `stati` vuoto.
 */
function statiLavorazioniDaImpostazioni(payload: CabAppSettingsQueryPayload | undefined): StatoLavorazioneConfig[] {
  if (!payload?.rows?.length) return [];
  const row = payload.rows.find((r) => r.module === CAB_SETTINGS_MODULE.lavorazioni && r.key === CAB_SETTINGS_KEY.prefs);
  if (!row?.value || typeof row.value !== "object") return [];
  const raw = row.value as Record<string, unknown>;
  const arr = raw.stati;
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const out: StatoLavorazioneConfig[] = [];
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    if (!id) continue;
    const label = typeof o.label === "string" && o.label.trim() ? o.label.trim() : id;
    const nh = typeof o.color === "string" ? normalizeHex(o.color) : null;
    out.push(nh ? { id, label, color: nh } : { id, label });
  }
  return out;
}

export function LavorazioneCreateModal({
  open,
  onClose,
  defaultMezzoId,
  createdBy,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultMezzoId?: string | null;
  createdBy: string | null;
  onCreated?: (id: string) => void;
}) {
  const mezziQ = useMezziListQuery(undefined, { enabled: open, staleTime: 30_000 });
  const settingsQ = useCabAppSettingsPayloadQuery({ enabled: open });
  const create = useLavorazioneCreateMutation();

  const [mezzoId, setMezzoId] = useState("");
  const [stato, setStato] = useState("");
  const [priorita, setPriorita] = useState<PrioritaLavorazione>("media");
  const [ingressoYmd, setIngressoYmd] = useState(todayYmd);
  const [note, setNote] = useState("");

  const stati = useMemo(() => statiLavorazioniDaImpostazioni(settingsQ.data), [settingsQ.data]);

  useEffect(() => {
    if (!open) return;
    setMezzoId((defaultMezzoId ?? "").trim());
    setStato("");
    setPriorita("media");
    setIngressoYmd(todayYmd());
    setNote("");
  }, [open, defaultMezzoId]);

  useEffect(() => {
    if (!open || !stato) return;
    if (!stati.some((s) => s.id === stato)) setStato("");
  }, [open, stati, stato]);

  const mezziOpts = useMemo(() => {
    const rows = mezziQ.data ?? [];
    return [...rows].sort((a, b) => `${a.marca} ${a.modello}`.localeCompare(`${b.marca} ${b.modello}`, "it"));
  }, [mezziQ.data]);

  const statoColore = stato ? readablePillStyleFromHex(statoDisplayColor(stato, stati)) : undefined;

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const mid = mezzoId.trim();
    if (!createdBy) {
      window.alert("Devi essere autenticato per creare una lavorazione.");
      return;
    }
    const sid = stato.trim();
    if (!sid) {
      window.alert("Seleziona uno stato tra quelli configurati in Impostazioni globali (modulo Lavorazioni).");
      return;
    }
    if (stati.length === 0) {
      window.alert("Nessuno stato configurato nelle impostazioni: non è possibile creare la lavorazione.");
      return;
    }
    try {
      const row = await create.mutateAsync({
        mezzo_id: mid,
        stato: sid as StatoLavorazione,
        priorita,
        data_ingresso: ymdToIsoMidUtc(ingressoYmd),
        data_uscita: null,
        note: note.trim() || null,
        created_by: createdBy,
      });
      onCreated?.(row.id);
      onClose();
    } catch {
      /* errore mostrato sotto */
    }
  }

  const settingsBlocking = settingsQ.isPending && !settingsQ.data;
  const statoSelectDisabled = create.isPending || settingsBlocking || stati.length === 0;

  return (
    <LavorazioniModalShell wide onRequestClose={onClose}>
      <form onSubmit={onSubmit} className="flex max-h-[min(88dvh,720px)] flex-col overflow-hidden">
        <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nuova lavorazione</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Dati salvati su database (nessun mock).</p>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {mezziQ.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{mezziQ.error?.message ?? "Errore caricamento mezzi."}</p>
          ) : null}
          {settingsQ.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{settingsQ.error?.message ?? "Errore caricamento impostazioni."}</p>
          ) : null}
          {create.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{create.error?.message ?? "Creazione fallita."}</p>
          ) : null}

          <label className="block">
            <span className={dsLabel}>Mezzo</span>
            <select
              className={`${dsInput} mt-1 w-full`}
              value={mezzoId}
              onChange={(e) => setMezzoId(e.target.value)}
              required
              disabled={mezziQ.isLoading || create.isPending}
            >
              <option value="">— Seleziona —</option>
              {mezziOpts.map((m) => (
                <option key={m.id} value={m.id}>
                  {`${m.marca} ${m.modello}`.trim()} · {m.matricola}
                  {m.targa?.trim() ? ` · ${m.targa}` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="block min-w-0">
              <span className={dsLabel}>Stato iniziale</span>
              {settingsBlocking ? (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Caricamento impostazioni…</p>
              ) : stati.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Nessuno stato configurato nelle impostazioni.</p>
              ) : null}
              <div className="mt-1 flex items-center gap-2">
                {stato && stati.length > 0 ? (
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-[color:var(--cab-border)] shadow-sm"
                    style={statoColore}
                    title="Colore stato (da impostazioni)"
                    aria-hidden
                  />
                ) : null}
                <select
                  className={`min-w-0 flex-1 ${gestionaleSelectNativePlainClass}`}
                  value={stato}
                  onChange={(e) => setStato(e.target.value)}
                  required
                  disabled={statoSelectDisabled}
                >
                  <option value="">— Seleziona stato —</option>
                  {stati.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="block">
              <span className={dsLabel}>Priorità</span>
              <select
                className={`${dsInput} mt-1 w-full capitalize`}
                value={priorita}
                onChange={(e) => setPriorita(e.target.value as PrioritaLavorazione)}
                disabled={create.isPending}
              >
                {PRIORITA_OPTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className={dsLabel}>Data ingresso</span>
            <input
              type="date"
              className={`${dsInput} mt-1 w-full`}
              value={ingressoYmd}
              onChange={(e) => setIngressoYmd(e.target.value)}
              disabled={create.isPending}
              required
            />
          </label>

          <label className="block">
            <span className={dsLabel}>Note</span>
            <textarea className={`${dsInput} mt-1 min-h-[88px] w-full resize-y`} value={note} onChange={(e) => setNote(e.target.value)} disabled={create.isPending} rows={3} />
          </label>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="button" className={erpBtnNeutral} onClick={onClose} disabled={create.isPending}>
            Annulla
          </button>
          <button
            type="submit"
            className={erpBtnAccent}
            disabled={create.isPending || mezziQ.isLoading || !createdBy || !stato.trim() || stati.length === 0 || settingsBlocking}
          >
            {create.isPending ? "Salvataggio…" : "Crea lavorazione"}
          </button>
        </footer>
      </form>
    </LavorazioniModalShell>
  );
}
