"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import { mezzoFormToMeta } from "@/lib/mezzi/mezzi-meta";
import { useLavorazioneCreateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { useMezzoCreateMutation, useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useQueryClient } from "@tanstack/react-query";
import { dispatchGestionaleLocalMutation } from "@/lib/sync/gestionale-sync-dispatch";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { findMezzoByTargaOrMatricola } from "@/lib/mezzi/find-mezzo-by-ident";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { loadLavorazioneSchedeStore } from "@/lib/schede/lavorazioni-schede-storage";
import { persistSchedeStore } from "@/lib/schede/schede-sync-adapter";
import { newSchedaMeta } from "@/lib/schede/schede-ui";
import { isStatoInConfig, resolveDefaultLavorazioneStatoId } from "@/src/shared/selectors";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { mergeSchedaIngressoFields } from "@/lib/schede/scheda-ingresso-reuse";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import type { MezzoInsert } from "@/src/services/mezzi.service";
import {
  MezzoDuplicatoAnagraficaDialog,
  type MezzoDuplicatoAnagraficaChoice,
} from "@/components/lavorazioni/schede/mezzo-duplicato-anagrafica-dialog";
import { useSchedaIngressoMezzoPrompt } from "@/src/hooks/use-scheda-ingresso-mezzo-prompt";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  emptySchedaIngressoFields,
  SchedaIngressoFormBody,
  SchedaIngressoFormModalShell,
  todayItDate,
} from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import { dsCheckboxInput, dsCheckboxOptionLabel, dsModalFormFooter, dsTypoCaption } from "@/lib/ui/design-system";

export { SchedaIngressoEditModal } from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";

function itDateToYmd(it: string): string {
  const p = it.trim().split(/[/.-]/);
  if (p.length !== 3) return "";
  const [d, m, y] = p;
  if (!d || !m || !y) return "";
  const yy = y.length === 2 ? `20${y}` : y;
  return `${yy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function ymdToIsoMidUtc(ymd: string): string {
  const p = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p)) return new Date().toISOString();
  const [y, m, d] = p.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date().toISOString();
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0)).toISOString();
}

function schedaFieldsToMezzoPayload(fields: SchedaIngressoFields): MezzoInsert {
  return {
    cliente: fields.cliente.trim(),
    utilizzatore: fields.utilizzatore.trim() || null,
    marca: fields.marcaAttrezzatura.trim(),
    modello: fields.modelloAttrezzatura.trim() || "—",
    targa: fields.targa.trim() || null,
    matricola: fields.matricola.trim() || null,
    numero_scuderia: fields.nScuderia.trim() || null,
    tipo_attrezzatura: fields.tipoAttrezzatura.trim() || null,
    anno: new Date().getFullYear(),
    meta: mezzoFormToMeta({
      cantiere: fields.cantiere,
      tipoTelaio: fields.tipoTelaio,
      marcaTelaio: fields.marcaTelaio,
      modelloTelaio: fields.modelloTelaio,
      oreLavoro: fields.oreLavoro,
      km: fields.km,
    }) as Record<string, unknown>,
  };
}

export function LavorazioneCreateModal({
  open,
  onClose,
  defaultMezzoId,
  createdBy,
  onCreated,
  mezzi = [],
  schedeStore = {},
  attive = [],
  storico = [],
}: {
  open: boolean;
  onClose: () => void;
  defaultMezzoId?: string | null;
  createdBy: string | null;
  onCreated?: (id: string) => void;
  mezzi?: readonly MezzoGestito[];
  schedeStore?: LavorazioneSchedeStore;
  attive?: readonly LavorazioneAttiva[];
  storico?: readonly LavorazioneArchiviata[];
}) {
  const globalOpts = useGlobalOptions({ enabled: open, debugTag: "LavorazioneCreateModal" });
  const qc = useQueryClient();
  const create = useLavorazioneCreateMutation();
  const createMezzo = useMezzoCreateMutation();
  const updateMezzo = useMezzoUpdateMutation();
  const mezziQ = useMezziListQuery(undefined, { enabled: open, staleTime: 30_000 });

  const stati = globalOpts.lavorazioni.stati.filter((s) => s.id !== "annullata");
  const defaultAccettazioneStato = stati.find((s) => {
    const hay = `${s.id} ${s.label}`.toLowerCase();
    return hay.includes("accettazione");
  });
  const prioritaOpts = useMemo(
    () => orderPrioritaList(globalOpts.lavorazioni.prioritaDb),
    [globalOpts.lavorazioni.prioritaDb],
  );
  const addettiOpts = globalOpts.lavorazioni.addetti;
  const mezziUi = useMemo(() => (mezziQ.data ?? []).map(toMezzoUI), [mezziQ.data]);
  const mezziCatalog = useMemo(
    () => (mezziUi.length > 0 ? mezziUi : [...mezzi]),
    [mezziUi, mezzi],
  );

  const [fields, setFields] = useState<SchedaIngressoFields>(() => emptySchedaIngressoFields(""));
  const [mezzoId, setMezzoId] = useState("");
  const [creaNuovoMezzo, setCreaNuovoMezzo] = useState(false);
  const [stato, setStato] = useState("");
  const [priorita, setPriorita] = useState<PrioritaLavorazione>("media");
  const [mezzoHint, setMezzoHint] = useState<string | null>(null);
  const [duplicateMezzo, setDuplicateMezzo] = useState<MezzoGestito | null>(null);
  const duplicateChoiceRef = useRef<((choice: MezzoDuplicatoAnagraficaChoice | null) => void) | null>(null);

  const askDuplicateMezzoChoice = useCallback((mezzo: MezzoGestito) => {
    return new Promise<MezzoDuplicatoAnagraficaChoice | null>((resolve) => {
      duplicateChoiceRef.current = resolve;
      setDuplicateMezzo(mezzo);
    });
  }, []);

  const closeDuplicateMezzoDialog = useCallback((choice: MezzoDuplicatoAnagraficaChoice | null) => {
    duplicateChoiceRef.current?.(choice);
    duplicateChoiceRef.current = null;
    setDuplicateMezzo(null);
  }, []);

  const patch = useCallback((p: Partial<SchedaIngressoFields>) => {
    setFields((f) => ({ ...f, ...p }));
  }, []);

  const mezzoPrompt = useSchedaIngressoMezzoPrompt({
    fields,
    setFields,
    mezzi: mezziCatalog,
    schedeStore,
    attive,
    storico,
  });

  const applyMezzo = useCallback(
    (m: MezzoGestito) => {
      const fromMezzo = buildSchedaIngressoFieldsFromMezzo(m);
      fromMezzo.addettoAccettazione = fields.addettoAccettazione || addettiOpts[0] || "";
      setFields((f) => {
        const merged = mergeSchedaIngressoFields(
          { ...f, dataIngresso: f.dataIngresso || todayItDate() },
          fromMezzo,
        );
        return {
          ...merged,
          addettoAccettazione: f.addettoAccettazione || merged.addettoAccettazione,
        };
      });
      setMezzoId(m.id);
      setCreaNuovoMezzo(false);
      setMezzoHint(`Mezzo riconosciuto: ${m.marca} ${m.modello !== "—" ? m.modello : ""}`.trim());
    },
    [addettiOpts, fields.addettoAccettazione],
  );

  const acceptMezzoPrompt = useCallback(() => {
    const m = mezzoPrompt.promptMezzo;
    mezzoPrompt.acceptAutofill();
    if (!m) return;
    setMezzoId(m.id);
    setCreaNuovoMezzo(false);
    setMezzoHint(`Mezzo collegato: ${m.marca} ${m.modello !== "—" ? m.modello : ""}`.trim());
  }, [mezzoPrompt]);

  const dismissMezzoPrompt = useCallback(() => {
    mezzoPrompt.dismissPrompt();
    setMezzoId("");
    if (fields.targa.trim() || fields.matricola.trim()) {
      setCreaNuovoMezzo(true);
      setMezzoHint("Continua manualmente: i dati restano editabili.");
    } else {
      setMezzoHint(null);
    }
  }, [fields.matricola, fields.targa, mezzoPrompt]);

  useEffect(() => {
    if (!open) return;
    const addetto0 = addettiOpts[0] ?? "";
    setFields(emptySchedaIngressoFields(addetto0));
    setMezzoId((defaultMezzoId ?? "").trim());
    setCreaNuovoMezzo(false);
    setStato(defaultAccettazioneStato?.id ?? resolveDefaultLavorazioneStatoId(stati));
    setPriorita(prioritaOpts.includes("media") ? "media" : (prioritaOpts[0] ?? "media"));
    setMezzoHint(null);
  }, [open, defaultMezzoId, prioritaOpts, addettiOpts, defaultAccettazioneStato?.id, stati]);

  useEffect(() => {
    if (!open || !defaultMezzoId) return;
    const m = mezziUi.find((x) => x.id === defaultMezzoId);
    if (m) applyMezzo(m);
  }, [open, defaultMezzoId, mezziUi, applyMezzo]);

  useEffect(() => {
    if (!open || prioritaOpts.length === 0) return;
    if (!prioritaOpts.includes(priorita)) setPriorita(prioritaOpts[0]!);
  }, [open, priorita, prioritaOpts]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!createdBy) {
      window.alert("Devi essere autenticato per creare una lavorazione.");
      return;
    }
    const sid = stato.trim() || defaultAccettazioneStato?.id?.trim() || resolveDefaultLavorazioneStatoId(stati);
    if (!sid || !isStatoInConfig(sid, stati)) {
      window.alert("Seleziona uno stato tra quelli configurati in Impostazioni globali.");
      return;
    }
    if (!fields.cliente.trim() || !fields.marcaAttrezzatura.trim()) {
      window.alert("Cliente e marca attrezzatura sono obbligatori.");
      return;
    }
    if (!prioritaOpts.includes(priorita)) {
      window.alert("Seleziona una priorità dalle impostazioni globali.");
      return;
    }

    const ymd = itDateToYmd(fields.dataIngresso) || new Date().toISOString().slice(0, 10);
    const noteBlob = fields.noteIntervento.trim() || null;

    try {
      let finalMezzoId = mezzoId.trim();
      const needNewMezzo = creaNuovoMezzo || !finalMezzoId;
      if (needNewMezzo) {
        const payload = schedaFieldsToMezzoPayload(fields);
        const existing = findMezzoByTargaOrMatricola(mezziCatalog, fields.targa, fields.matricola);
        if (existing) {
          const choice = await askDuplicateMezzoChoice(existing);
          if (!choice) return;
          if (choice === "keep") {
            finalMezzoId = existing.id;
          } else {
            await updateMezzo.mutateAsync({ id: existing.id, data: payload });
            finalMezzoId = existing.id;
          }
        } else {
          const mezzo = await createMezzo.mutateAsync(payload);
          finalMezzoId = mezzo.id;
        }
      }

      const row = await create.mutateAsync({
        mezzo_id: finalMezzoId,
        stato: sid,
        priorita,
        data_ingresso: ymdToIsoMidUtc(ymd),
        data_uscita: null,
        note: noteBlob || null,
        created_by: createdBy,
      });

      const store = loadLavorazioneSchedeStore();
      store[row.id] = {
        lavorazioneId: row.id,
        codice: row.codice ?? null,
        ingresso: {
          ...newSchedaMeta("ingresso", createdBy),
          tipo: "ingresso",
          campi: { ...fields },
        },
        lavorazioni: null,
        ricambi: null,
      };
      const res = await persistSchedeStore(store, row.id);
      if (!res.ok) {
        window.alert(res.error ?? "Scheda ingresso non sincronizzata con il database.");
      } else {
        dispatchGestionaleLocalMutation(qc, ["scheda_lavorazione"]);
      }
      onCreated?.(row.id);
      onClose();
    } catch {
      /* errore sotto */
    }
  }

  const pending = create.isPending || createMezzo.isPending || updateMezzo.isPending;
  const saveError =
    create.isError || createMezzo.isError || updateMezzo.isError
      ? (create.error?.message ?? createMezzo.error?.message ?? updateMezzo.error?.message ?? "Salvataggio fallito.")
      : null;

  return (
    <>
      <SchedaIngressoFormModalShell
        open={open}
        onRequestClose={onClose}
        variant="create-lavorazione"
        subtitle="Nuova lavorazione — compila i dati di accettazione mezzo."
        footer={null}
      >
        <form {...gestionaleFormFocusScopeProps()} onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SchedaIngressoFormBody
            variant="create-lavorazione"
            fields={fields}
            setFields={setFields}
            onPatch={patch}
            pending={pending}
            mezzi={mezzi}
            schedeStore={schedeStore}
            attive={attive}
            storico={storico}
            stato={stato}
            onStatoChange={setStato}
            priorita={priorita}
            onPrioritaChange={setPriorita}
            mezzoHint={mezzoHint}
            errorMessage={saveError}
            mezzoPrompt={mezzoPrompt}
            onMezzoDialogAccept={acceptMezzoPrompt}
            onMezzoDialogDismiss={dismissMezzoPrompt}
          />
          <footer className={dsModalFormFooter}>
            {!mezzoId ? (
              <label className={`${dsCheckboxOptionLabel} min-w-0 flex-1 sm:max-w-[min(100%,28rem)]`}>
                <input
                  type="checkbox"
                  className={dsCheckboxInput}
                  checked={creaNuovoMezzo}
                  onChange={(e) => setCreaNuovoMezzo(e.target.checked)}
                  disabled={pending}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[color:var(--cab-text)]">
                    Crea nuovo mezzo in anagrafica
                  </span>
                  <span className={`mt-0.5 block ${dsTypoCaption}`}>
                    Collegalo alla lavorazione con i dati compilati sopra.
                  </span>
                </span>
              </label>
            ) : (
              <span className="min-w-0 flex-1" aria-hidden />
            )}
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <button type="button" className={erpBtnNeutral} onClick={onClose} disabled={pending}>
                Annulla
              </button>
              <button
                type="submit"
                className={erpBtnAccent}
                disabled={pending || !createdBy || stati.length === 0 || globalOpts.isLoading}
              >
                {pending ? "Salvataggio…" : "Salva lavorazione"}
              </button>
            </div>
          </footer>
        </form>
      </SchedaIngressoFormModalShell>
      <MezzoDuplicatoAnagraficaDialog
        open={duplicateMezzo != null}
        mezzo={duplicateMezzo}
        onKeepExisting={() => closeDuplicateMezzoDialog("keep")}
        onOverwrite={() => closeDuplicateMezzoDialog("overwrite")}
        onCancel={() => closeDuplicateMezzoDialog(null)}
      />
    </>
  );
}
