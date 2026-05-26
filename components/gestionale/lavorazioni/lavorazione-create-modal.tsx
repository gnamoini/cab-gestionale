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
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { findMezzoByTargaOrMatricola } from "@/lib/mezzi/find-mezzo-by-ident";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { loadLavorazioneSchedeStore } from "@/lib/schede/lavorazioni-schede-storage";
import { persistSchedeStore } from "@/lib/schede/schede-sync-adapter";
import { newSchedaMeta } from "@/lib/schede/schede-ui";
import { isStatoInConfig, resolveDefaultLavorazioneStatoId } from "@/src/shared/selectors";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { LavorazioneArchiviata, LavorazioneAttiva, PrioritaLav } from "@/lib/lavorazioni/types";
import {
  findLastSchedaIngressoForIdent,
  hasSchedaIngressoIdentLookup,
  mergeSchedaIngressoFields,
} from "@/lib/schede/scheda-ingresso-reuse";
import { SCHEDA_INGRESSO_UTENTE_ACCETTAZIONE_LABEL } from "@/lib/schede/scheda-ingresso-ui-labels";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import type { MezzoInsert } from "@/src/services/mezzi.service";
import { MezzoRegistratoIngressoDialog } from "@/components/lavorazioni/schede/mezzo-registrato-ingresso-dialog";
import {
  MezzoDuplicatoAnagraficaDialog,
  type MezzoDuplicatoAnagraficaChoice,
} from "@/components/lavorazioni/schede/mezzo-duplicato-anagrafica-dialog";
import { useSchedaIngressoMezzoPrompt } from "@/src/hooks/use-scheda-ingresso-mezzo-prompt";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import {
  addettoPillShellClass,
  erpBtnAccent,
  erpBtnNeutral,
  prioritaPillShellClass,
  statoPillShellClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { GlobalDatePicker, GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { buildLavorazioniPillOptionsFromGlobal } from "@/lib/global-list/build-lavorazioni-pill-options";
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { SchedaIngressoAnagraficaFields } from "@/components/gestionale/schede/scheda-ingresso-anagrafica-fields";
import { dsCheckboxInput, dsCheckboxOptionLabel, dsInput, dsModalFormFooter, dsTypoCaption } from "@/lib/ui/design-system";

function todayItDate(): string {
  return new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

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

function emptyIngresso(addettoDefault: string): SchedaIngressoFields {
  return {
    dataIngresso: todayItDate(),
    cliente: "",
    cantiere: "",
    utilizzatore: "",
    tipoAttrezzatura: "",
    marcaAttrezzatura: "",
    modelloAttrezzatura: "",
    matricola: "",
    nScuderia: "",
    oreLavoro: "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    targa: "",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: addettoDefault,
    richiedente: "",
    noteIntervento: "",
  };
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

  const liste = globalOpts.mezziListe;
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

  const [fields, setFields] = useState<SchedaIngressoFields>(() => emptyIngresso(""));
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

  const lastIngressoMatch = useMemo(() => {
    if (!hasSchedaIngressoIdentLookup(fields.targa, fields.matricola)) return null;
    return findLastSchedaIngressoForIdent(
      fields.targa,
      fields.matricola,
      mezziCatalog,
      schedeStore,
      attive,
      storico,
    );
  }, [fields.targa, fields.matricola, mezziCatalog, schedeStore, attive, storico]);

  const mezzoPrompt = useSchedaIngressoMezzoPrompt({
    fields,
    setFields,
    mezzi: mezziCatalog,
    schedeStore,
    attive,
    storico,
  });

  const patch = useCallback((p: Partial<SchedaIngressoFields>) => {
    setFields((f) => ({ ...f, ...p }));
  }, []);

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

  const onMezzoPromptMatch = useCallback(
    (m: MezzoGestito) => {
      mezzoPrompt.requestPrompt(m);
    },
    [mezzoPrompt],
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

  const copyLastIngresso = useCallback(() => {
    if (!lastIngressoMatch) return;
    setFields((f) => mergeSchedaIngressoFields(f, lastIngressoMatch.campi));
  }, [lastIngressoMatch]);

  useEffect(() => {
    if (!open) return;
    const addetto0 = addettiOpts[0] ?? "";
    setFields(emptyIngresso(addetto0));
    setMezzoId((defaultMezzoId ?? "").trim());
    setCreaNuovoMezzo(false);
    setStato(defaultAccettazioneStato?.id ?? resolveDefaultLavorazioneStatoId(stati));
    setPriorita(prioritaOpts.includes("media") ? "media" : (prioritaOpts[0] ?? "media"));
    setMezzoHint(null);
  }, [open, defaultMezzoId, prioritaOpts, addettiOpts, defaultAccettazioneStato?.id]);

  useEffect(() => {
    if (!open || !defaultMezzoId) return;
    const m = mezziUi.find((x) => x.id === defaultMezzoId);
    if (m) applyMezzo(m);
  }, [open, defaultMezzoId, mezziUi, applyMezzo]);

  useEffect(() => {
    if (!open || prioritaOpts.length === 0) return;
    if (!prioritaOpts.includes(priorita)) setPriorita(prioritaOpts[0]!);
  }, [open, priorita, prioritaOpts]);

  const tablePillOptions = useMemo(
    () => buildLavorazioniPillOptionsFromGlobal(globalOpts),
    [globalOpts],
  );
  const statoPillOptions = useMemo(() => tablePillOptions.stati(stati), [tablePillOptions, stati]);
  const prioritaPillOptions = useMemo(
    () => tablePillOptions.priorita(prioritaOpts),
    [tablePillOptions, prioritaOpts],
  );
  const addettoPillOptions = useMemo(
    () => tablePillOptions.addetto(fields.addettoAccettazione),
    [tablePillOptions, fields.addettoAccettazione],
  );
  const statoPillStyle = useMemo(
    () => (stato ? readablePillStyleFromHex(statoDisplayColor(stato, stati)) : undefined),
    [stato, stati],
  );
  const prioritaPillStyle = useMemo(
    () =>
      readablePillStyleFromHex(
        priorita === "urgente" ? "#b91c1c" : prioritaDisplayColor(priorita as PrioritaLav, globalOpts.lavorazioni.prioritaColors),
      ),
    [priorita, globalOpts.lavorazioni.prioritaColors],
  );
  const addettoPillStyle = useMemo(
    () =>
      readablePillStyleFromHex(
        addettoDisplayColor(fields.addettoAccettazione, globalOpts.lavorazioni.addettoColors),
      ),
    [fields.addettoAccettazione, globalOpts.lavorazioni.addettoColors],
  );

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
  const inputFieldClass = `mt-1 block w-full ${dsInput}`;
  const listSelectWrapClass = "mt-1 w-full";

  return (
    <LavorazioniModalShell
      wide
      maxWidthClass="max-w-2xl"
      onRequestClose={onClose}
      title="Scheda di ingresso"
      subtitle="Nuova lavorazione — compila i dati di accettazione mezzo."
    >
      <MezzoRegistratoIngressoDialog
        open={mezzoPrompt.promptOpen}
        mezzo={mezzoPrompt.promptMezzo}
        onAccept={acceptMezzoPrompt}
        onDismiss={dismissMezzoPrompt}
      />
      <form {...gestionaleFormFocusScopeProps()} onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 gestionale-scrollbar">
          {globalOpts.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{globalOpts.error?.message ?? "Errore impostazioni."}</p>
          ) : null}
          {create.isError || createMezzo.isError || updateMezzo.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {create.error?.message ?? createMezzo.error?.message ?? updateMezzo.error?.message ?? "Salvataggio fallito."}
            </p>
          ) : null}
          {mezzoHint ? (
            <p className="rounded-lg border border-orange-200/80 bg-orange-50/80 px-3 py-2 text-xs text-orange-950 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-100">
              {mezzoHint}
            </p>
          ) : null}

          <FormSection title="Ingresso">
            <FormField label="Data ingresso *">
              <GlobalDatePicker
                value={fields.dataIngresso}
                onChange={(v) => patch({ dataIngresso: v })}
                inputClassName={dsInput}
                required
                disabled={pending}
              />
            </FormField>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Stato iniziale">
                <GlobalFixedListPillSelect
                  value={stato}
                  onChange={setStato}
                  options={statoPillOptions}
                  ariaLabel="Stato iniziale"
                  disabled={pending || globalOpts.isLoading || stati.length === 0}
                  shellClass={statoPillShellClass()}
                  fallbackPillStyle={statoPillStyle}
                />
              </FormField>
              <FormField label="Priorità">
                <GlobalFixedListPillSelect
                  value={priorita}
                  onChange={(v) => setPriorita(v as PrioritaLavorazione)}
                  options={prioritaPillOptions}
                  ariaLabel="Priorità"
                  disabled={pending || prioritaOpts.length === 0}
                  shellClass={prioritaPillShellClass()}
                  fallbackPillStyle={prioritaPillStyle}
                />
              </FormField>
              <FormField label="Utente" className="sm:col-span-2 lg:col-span-1">
                <GlobalFixedListPillSelect
                  value={fields.addettoAccettazione}
                  onChange={(v) => patch({ addettoAccettazione: v })}
                  options={addettoPillOptions}
                  ariaLabel={SCHEDA_INGRESSO_UTENTE_ACCETTAZIONE_LABEL}
                  disabled={pending || addettiOpts.length === 0}
                  shellClass={addettoPillShellClass()}
                  fallbackPillStyle={addettoPillStyle}
                />
              </FormField>
            </div>
          </FormSection>

          <SchedaIngressoAnagraficaFields
            value={fields}
            onPatch={patch}
            mezzi={mezziCatalog}
            disabled={pending}
            onExactMezzoMatch={onMezzoPromptMatch}
            lastIngressoMatch={lastIngressoMatch}
            onCopyLastIngresso={copyLastIngresso}
            clienteRequired
            marcaAttrezzaturaRequired
          />

          <FormSection title="Intervento">
            <FormField label="Descrizione anomalia">
              <textarea className={`${dsInput} min-h-[72px] w-full resize-y`} value={fields.descrizioneAnomalia} onChange={(e) => patch({ descrizioneAnomalia: e.target.value })} disabled={pending} rows={3} />
            </FormField>
            <FormField label="Note">
              <textarea className={`${dsInput} min-h-[56px] w-full resize-y`} value={fields.noteIntervento} onChange={(e) => patch({ noteIntervento: e.target.value })} disabled={pending} rows={2} />
            </FormField>
          </FormSection>
        </div>

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
            <button type="submit" className={erpBtnAccent} disabled={pending || !createdBy || stati.length === 0 || globalOpts.isLoading}>
              {pending ? "Salvataggio…" : "Salva lavorazione"}
            </button>
          </div>
        </footer>
      </form>
      <MezzoDuplicatoAnagraficaDialog
        open={duplicateMezzo != null}
        mezzo={duplicateMezzo}
        onKeepExisting={() => closeDuplicateMezzoDialog("keep")}
        onOverwrite={() => closeDuplicateMezzoDialog("overwrite")}
        onCancel={() => closeDuplicateMezzoDialog(null)}
      />
    </LavorazioniModalShell>
  );
}
