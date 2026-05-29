"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import { useLavorazioneCreateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { useMezzoCreateMutation, useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useQueryClient } from "@tanstack/react-query";
import { dispatchGestionaleLocalMutation } from "@/lib/sync/gestionale-sync-dispatch";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { upsertMezzoFromSchedaIngresso } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { loadLavorazioneSchedeStore } from "@/lib/schede/lavorazioni-schede-storage";
import { persistSchedeStore } from "@/lib/schede/schede-sync-adapter";
import { newSchedaMeta } from "@/lib/schede/schede-ui";
import { isStatoInConfig, resolveDefaultLavorazioneStatoId } from "@/src/shared/selectors";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { mergeSchedaIngressoFields } from "@/lib/schede/scheda-ingresso-reuse";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import { useSchedaIngressoMezzoPrompt } from "@/src/hooks/use-scheda-ingresso-mezzo-prompt";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  emptySchedaIngressoFields,
  SchedaIngressoFormBody,
  SchedaIngressoFormModalShell,
  todayItDate,
} from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { dsModalFormFooter } from "@/lib/ui/design-system";

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
  const gestToast = useGestionaleToast();
  const create = useLavorazioneCreateMutation();
  const createMezzo = useMezzoCreateMutation();
  const updateMezzo = useMezzoUpdateMutation();
  const mezziQ = useMezziListQuery(undefined, { enabled: open, staleTime: 30_000 });

  const stati = useMemo(
    () => globalOpts.lavorazioni.stati.filter((s) => s.id !== "annullata"),
    [globalOpts.lavorazioni.stati],
  );
  const defaultAccettazioneStatoId = useMemo(() => {
    const hit = stati.find((s) => {
      const hay = `${s.id} ${s.label}`.toLowerCase();
      return hay.includes("accettazione");
    });
    return hit?.id ?? resolveDefaultLavorazioneStatoId(stati);
  }, [stati]);
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
  const [stato, setStato] = useState("");
  const [priorita, setPriorita] = useState<PrioritaLavorazione>("media");
  const [mezzoHint, setMezzoHint] = useState<string | null>(null);
  const formInitRef = useRef(false);
  const defaultMezzoAppliedRef = useRef<string | null>(null);

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

  const applyMezzo = useCallback((m: MezzoGestito) => {
    const fromMezzo = buildSchedaIngressoFieldsFromMezzo(m);
    setFields((f) => {
      const merged = mergeSchedaIngressoFields(
        { ...f, dataIngresso: f.dataIngresso || todayItDate() },
        fromMezzo,
      );
      return {
        ...merged,
        addettoAccettazione: f.addettoAccettazione || merged.addettoAccettazione || addettiOpts[0] || "",
      };
    });
    setMezzoId(m.id);
    setMezzoHint(`Mezzo riconosciuto: ${m.marca} ${m.modello !== "—" ? m.modello : ""}`.trim());
  }, [addettiOpts]);

  const acceptMezzoPrompt = useCallback(() => {
    const m = mezzoPrompt.promptMezzo;
    mezzoPrompt.acceptAutofill();
    if (!m) return;
    setMezzoId(m.id);
    setMezzoHint(`Mezzo collegato: ${m.marca} ${m.modello !== "—" ? m.modello : ""}`.trim());
  }, [mezzoPrompt]);

  const dismissMezzoPrompt = useCallback(() => {
    mezzoPrompt.dismissPrompt();
    setMezzoId("");
    if (fields.targa.trim() || fields.matricola.trim()) {
      setMezzoHint("Continua manualmente: i dati restano editabili.");
    } else {
      setMezzoHint(null);
    }
  }, [fields.matricola, fields.targa, mezzoPrompt]);

  const resolveFreshCatalog = useCallback(async (): Promise<MezzoGestito[]> => {
    await qc.refetchQueries({ queryKey: QK.mezzi });
    const freshRows =
      qc.getQueryData<MezzoRow[]>([...QK.mezzi, null]) ??
      qc.getQueriesData<MezzoRow[]>({ queryKey: QK.mezzi }).find(([, data]) => data?.length)?.[1];
    if (freshRows?.length) return freshRows.map(toMezzoUI);
    return mezziCatalog;
  }, [qc, mezziCatalog]);

  useEffect(() => {
    if (!open) {
      formInitRef.current = false;
      defaultMezzoAppliedRef.current = null;
      return;
    }
    if (formInitRef.current) return;
    formInitRef.current = true;
    const addetto0 = addettiOpts[0] ?? "";
    setFields(emptySchedaIngressoFields(addetto0));
    setMezzoId((defaultMezzoId ?? "").trim());
    setStato(defaultAccettazioneStatoId);
    setPriorita(prioritaOpts.includes("media") ? "media" : (prioritaOpts[0] ?? "media"));
    setMezzoHint(null);
  }, [open, defaultMezzoId, prioritaOpts, addettiOpts, defaultAccettazioneStatoId]);

  useEffect(() => {
    if (!open || !defaultMezzoId) return;
    if (defaultMezzoAppliedRef.current === defaultMezzoId) return;
    const m = mezziUi.find((x) => x.id === defaultMezzoId);
    if (!m) return;
    defaultMezzoAppliedRef.current = defaultMezzoId;
    applyMezzo(m);
  }, [open, defaultMezzoId, mezziUi, applyMezzo]);

  useEffect(() => {
    if (!open || prioritaOpts.length === 0) return;
    if (!prioritaOpts.includes(priorita)) setPriorita(prioritaOpts[0]!);
  }, [open, priorita, prioritaOpts]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!createdBy) {
      gestToast.validation("Devi essere autenticato per creare una lavorazione.");
      return;
    }
    const sid = stato.trim() || defaultAccettazioneStatoId;
    if (!sid || !isStatoInConfig(sid, stati)) {
      gestToast.validation("Seleziona uno stato tra quelli configurati in Configurazione globale.");
      return;
    }
    if (!fields.cliente.trim() || !fields.marcaAttrezzatura.trim()) {
      gestToast.validation("Cliente e marca attrezzatura sono obbligatori.");
      return;
    }
    if (!prioritaOpts.includes(priorita)) {
      gestToast.validation("Seleziona una priorità dalla configurazione globale.");
      return;
    }

    const ymd = itDateToYmd(fields.dataIngresso) || new Date().toISOString().slice(0, 10);
    const noteBlob = fields.noteIntervento.trim() || null;

    try {
      const catalog = await resolveFreshCatalog();
      const { mezzoId: finalMezzoId } = await upsertMezzoFromSchedaIngresso({
        fields,
        mezziCatalog: catalog,
        preferredMezzoId: mezzoId.trim() || null,
        create: (data) => createMezzo.mutateAsync(data),
        update: (id, data) => updateMezzo.mutateAsync({ id, data }),
      });

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
        gestToast.errorOnce("lav-create-scheda", res.error ?? "Scheda ingresso non sincronizzata con il database.", {
          module: "lavorazioni",
        });
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
    <SchedaIngressoFormModalShell
      open={open}
      onRequestClose={onClose}
      variant="create-lavorazione"
      subtitle="Scheda di ingresso — compila l'accettazione mezzo e salva la lavorazione."
      footer={null}
    >
      <form {...gestionaleFormFocusScopeProps()} onSubmit={onSubmit} className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
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
        <footer className={`${dsModalFormFooter} flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end`}>
          <button
            type="button"
            className={`${erpBtnNeutral} min-h-11 w-full sm:min-w-[7rem] sm:w-auto`}
            onClick={onClose}
            disabled={pending}
          >
            Annulla
          </button>
          <button
            type="submit"
            className={`${erpBtnAccent} min-h-11 w-full sm:min-w-[10rem] sm:w-auto`}
            disabled={pending || !createdBy || stati.length === 0 || globalOpts.isLoading}
          >
            {pending ? "Salvataggio…" : "Salva lavorazione"}
          </button>
        </footer>
      </form>
    </SchedaIngressoFormModalShell>
  );
}
