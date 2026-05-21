"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { marcheFromHierarchyTree, modelliVisibiliPerMarcaHierarchy } from "@/lib/mezzi/hierarchy-list-prefs";
import { findMezzoByTargaOrMatricola } from "@/lib/mezzi/find-mezzo-by-ident";
import { mezzoFormToMeta } from "@/lib/mezzi/mezzi-meta";
import { useLavorazioneCreateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { useMezzoCreateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { loadLavorazioneSchedeStore, saveLavorazioneSchedeStore } from "@/lib/schede/lavorazioni-schede-storage";
import { newSchedaMeta } from "@/lib/schede/schede-ui";
import { isStatoInConfig, resolveDefaultLavorazioneStatoId } from "@/src/shared/selectors";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { SchedaIngressoFields } from "@/types/schede";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleSettingsSelect } from "@/components/gestionale/gestionale-settings-select";
import { GestionaleListSelect } from "@/components/gestionale/gestionale-list-select";
import { SettingsAutocompleteInput } from "@/components/gestionale/settings-autocomplete-input";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { GlobalDatePicker } from "@/components/gestionale/global-input";
import { dsInput, dsLabel } from "@/lib/ui/design-system";

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

function schedaFieldsFromMezzo(m: MezzoGestito): SchedaIngressoFields {
  const blank = (v: string | undefined, dash = "—") => {
    const t = v?.trim();
    return !t || t === dash || t === "Non assegnata" ? "" : t;
  };
  return {
    dataIngresso: todayItDate(),
    cliente: blank(m.cliente),
    cantiere: blank(m.cantiere),
    utilizzatore: blank(m.utilizzatore),
    tipoAttrezzatura: blank(m.tipoAttrezzatura),
    marcaAttrezzatura: blank(m.marca),
    modelloAttrezzatura: blank(m.modello),
    matricola: blank(m.matricola, "Non assegnata"),
    nScuderia: m.numeroScuderia?.trim() ?? "",
    oreLavoro: m.oreKm ? String(m.oreKm) : "",
    tipoTelaio: blank(m.tipoTelaio),
    marcaTelaio: blank(m.marcaTelaio),
    modelloTelaio: blank(m.modelloTelaio),
    targa: blank(m.targa),
    km: m.km != null ? String(m.km) : "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: "",
    richiedente: "",
    noteIntervento: "",
  };
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-b border-[color:var(--cab-border)] pb-4 last:border-b-0">
      <h3 className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FormField({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`.trim()}>
      <span className={dsLabel}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
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
  const globalOpts = useGlobalOptions({ enabled: open, debugTag: "LavorazioneCreateModal" });
  const create = useLavorazioneCreateMutation();
  const createMezzo = useMezzoCreateMutation();
  const mezziQ = useMezziListQuery(undefined, { enabled: open, staleTime: 30_000 });

  const liste = globalOpts.mezziListe;
  const stati = globalOpts.lavorazioni.stati.filter((s) => s.id !== "annullata");
  const statiSelectOpts = stati.map((s) => ({ value: s.id, label: s.label }));
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

  const [fields, setFields] = useState<SchedaIngressoFields>(() => emptyIngresso(""));
  const [mezzoId, setMezzoId] = useState("");
  const [creaNuovoMezzo, setCreaNuovoMezzo] = useState(false);
  const [stato, setStato] = useState("");
  const [priorita, setPriorita] = useState<PrioritaLavorazione>("media");
  const [mezzoHint, setMezzoHint] = useState<string | null>(null);

  const marcheAtt = useMemo(() => marcheFromHierarchyTree(liste, "attrezzature"), [liste]);
  const marcheTel = useMemo(() => marcheFromHierarchyTree(liste, "telai"), [liste]);
  const modelliAtt = useMemo(
    () => modelliVisibiliPerMarcaHierarchy(liste, "attrezzature", fields.marcaAttrezzatura),
    [liste, fields.marcaAttrezzatura],
  );
  const modelliTel = useMemo(
    () => modelliVisibiliPerMarcaHierarchy(liste, "telai", fields.marcaTelaio),
    [liste, fields.marcaTelaio],
  );

  const patch = useCallback((p: Partial<SchedaIngressoFields>) => {
    setFields((f) => ({ ...f, ...p }));
  }, []);

  const applyMezzo = useCallback(
    (m: MezzoGestito) => {
      const next = schedaFieldsFromMezzo(m);
      next.addettoAccettazione = fields.addettoAccettazione || addettiOpts[0] || "";
      setFields((f) => ({ ...f, ...next, addettoAccettazione: f.addettoAccettazione || next.addettoAccettazione }));
      setMezzoId(m.id);
      setCreaNuovoMezzo(false);
      setMezzoHint(`Mezzo riconosciuto: ${m.marca} ${m.modello !== "—" ? m.modello : ""}`.trim());
    },
    [addettiOpts, fields.addettoAccettazione],
  );

  const lookupIdent = useCallback(() => {
    const hit = findMezzoByTargaOrMatricola(mezziUi, fields.targa, fields.matricola);
    if (hit) {
      applyMezzo(hit);
      return;
    }
    setMezzoId("");
    setMezzoHint(null);
    if (fields.targa.trim() || fields.matricola.trim()) {
      setCreaNuovoMezzo(true);
      setMezzoHint("Nessun mezzo corrispondente: puoi crearne uno nuovo dai dati inseriti.");
    }
  }, [applyMezzo, fields.matricola, fields.targa, mezziUi]);

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

  const statoColore = stato ? readablePillStyleFromHex(statoDisplayColor(stato, stati)) : undefined;

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
    const noteBlob = [fields.descrizioneAnomalia.trim(), fields.noteIntervento.trim()].filter(Boolean).join("\n\n");

    try {
      let finalMezzoId = mezzoId.trim();
      const needNewMezzo = creaNuovoMezzo || !finalMezzoId;
      if (needNewMezzo) {
        const mezzo = await createMezzo.mutateAsync({
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
        });
        finalMezzoId = mezzo.id;
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
        ingresso: {
          ...newSchedaMeta("ingresso", fields.addettoAccettazione || createdBy),
          tipo: "ingresso",
          campi: { ...fields },
        },
        lavorazioni: null,
        ricambi: null,
      };
      saveLavorazioneSchedeStore(store);
      onCreated?.(row.id);
      onClose();
    } catch {
      /* errore sotto */
    }
  }

  const pending = create.isPending || createMezzo.isPending;
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
      <form {...gestionaleFormFocusScopeProps()} onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 gestionale-scrollbar">
          {globalOpts.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{globalOpts.error?.message ?? "Errore impostazioni."}</p>
          ) : null}
          {create.isError || createMezzo.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{create.error?.message ?? createMezzo.error?.message ?? "Salvataggio fallito."}</p>
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
                <div className="flex min-h-10 items-center gap-2">
                  {stato && stati.length > 0 ? (
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-[color:var(--cab-border)]" style={statoColore} aria-hidden />
                  ) : null}
                  <GestionaleSettingsSelect
                    className="min-w-0 flex-1"
                    ariaLabel="Stato iniziale"
                    value={stato}
                    onChange={setStato}
                    options={statiSelectOpts}
                    disabled={pending || globalOpts.isLoading}
                    required
                  />
                </div>
              </FormField>
              <FormField label="Priorità">
                <GestionaleSettingsSelect
                  className="capitalize"
                  ariaLabel="Priorità"
                  value={priorita}
                  onChange={(v) => setPriorita(v as PrioritaLavorazione)}
                  options={prioritaOpts}
                  disabled={pending}
                  required
                />
              </FormField>
              <FormField label="Addetto" className="sm:col-span-2 lg:col-span-1">
                <GestionaleSettingsSelect
                  ariaLabel="Addetto accettazione"
                  value={fields.addettoAccettazione}
                  onChange={(v) => patch({ addettoAccettazione: v })}
                  options={addettiOpts}
                  disabled={pending}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Cliente">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Cliente *
              <GestionaleListSelect className={listSelectWrapClass} value={fields.cliente} onChange={(v) => patch({ cliente: v })} options={liste.clienti} disabled={pending} required />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Cantiere
              <SettingsAutocompleteInput className="mt-1" value={fields.cantiere} onChange={(v) => patch({ cantiere: v })} options={liste.cantieri} disabled={pending} />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Utilizzatore
              <SettingsAutocompleteInput className="mt-1" value={fields.utilizzatore} onChange={(v) => patch({ utilizzatore: v })} options={liste.utilizzatori} disabled={pending} />
            </label>
          </FormSection>

          <FormSection title="Attrezzatura">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Tipo attrezzatura
              <SettingsAutocompleteInput className="mt-1" value={fields.tipoAttrezzatura} onChange={(v) => patch({ tipoAttrezzatura: v })} options={liste.tipiAttrezzatura} disabled={pending} />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Marca *
                <GestionaleListSelect
                  className={listSelectWrapClass}
                  value={fields.marcaAttrezzatura}
                  onChange={(v) => patch({ marcaAttrezzatura: v, modelloAttrezzatura: "" })}
                  options={marcheAtt}
                  disabled={pending}
                  required
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Modello
                <GestionaleListSelect className={listSelectWrapClass} value={fields.modelloAttrezzatura} onChange={(v) => patch({ modelloAttrezzatura: v })} options={modelliAtt} disabled={pending || !fields.marcaAttrezzatura.trim()} />
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Matricola
                <input className={`${dsInput} mt-1 font-mono`} value={fields.matricola} onChange={(e) => patch({ matricola: e.target.value })} onBlur={lookupIdent} disabled={pending} placeholder="Cerca mezzo…" />
              </label>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                N. scuderia
                <input className={`${dsInput} mt-1 font-mono`} value={fields.nScuderia} onChange={(e) => patch({ nScuderia: e.target.value })} disabled={pending} />
              </label>
            </div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Ore lavoro
              <input type="number" min={0} className={inputFieldClass} value={fields.oreLavoro} onChange={(e) => patch({ oreLavoro: e.target.value })} disabled={pending} />
            </label>
          </FormSection>

          <FormSection title="Telaio">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Tipo telaio
              <SettingsAutocompleteInput className="mt-1" value={fields.tipoTelaio} onChange={(v) => patch({ tipoTelaio: v })} options={liste.tipiTelaio ?? []} disabled={pending} />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Marca
                <GestionaleListSelect className={listSelectWrapClass} value={fields.marcaTelaio} onChange={(v) => patch({ marcaTelaio: v, modelloTelaio: "" })} options={marcheTel} disabled={pending} />
              </label>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Modello
                <GestionaleListSelect className={listSelectWrapClass} value={fields.modelloTelaio} onChange={(v) => patch({ modelloTelaio: v })} options={modelliTel} disabled={pending || !fields.marcaTelaio.trim()} />
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Targa
                <input className={`${dsInput} mt-1 font-mono`} value={fields.targa} onChange={(e) => patch({ targa: e.target.value })} onBlur={lookupIdent} disabled={pending} placeholder="Cerca mezzo…" />
              </label>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                KM
                <input type="number" min={0} className={inputFieldClass} value={fields.km} onChange={(e) => patch({ km: e.target.value })} disabled={pending} />
              </label>
            </div>
          </FormSection>

          <FormSection title="Intervento">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Carburante
              <SettingsAutocompleteInput
                className="mt-1"
                value={fields.livelloCarburante}
                onChange={(v) => patch({ livelloCarburante: v })}
                options={["Vuoto", "1/4", "1/2", "3/4", "Pieno"]}
                disabled={pending}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Descrizione anomalia
              <textarea className={`${dsInput} mt-1 min-h-[72px] w-full resize-y`} value={fields.descrizioneAnomalia} onChange={(e) => patch({ descrizioneAnomalia: e.target.value })} disabled={pending} rows={3} />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Note
              <textarea className={`${dsInput} mt-1 min-h-[56px] w-full resize-y`} value={fields.noteIntervento} onChange={(e) => patch({ noteIntervento: e.target.value })} disabled={pending} rows={2} />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Richiedente
              <input className={inputFieldClass} value={fields.richiedente} onChange={(e) => patch({ richiedente: e.target.value })} disabled={pending} placeholder="Nome libero" />
            </label>
          </FormSection>

          {!mezzoId ? (
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900/40">
              <input type="checkbox" className="mt-0.5" checked={creaNuovoMezzo} onChange={(e) => setCreaNuovoMezzo(e.target.checked)} disabled={pending} />
              <span>Crea nuovo mezzo in anagrafica da questi dati e collegalo alla lavorazione</span>
            </label>
          ) : null}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="button" className={erpBtnNeutral} onClick={onClose} disabled={pending}>
            Annulla
          </button>
          <button type="submit" className={erpBtnAccent} disabled={pending || !createdBy || stati.length === 0 || globalOpts.isLoading}>
            {pending ? "Salvataggio…" : "Salva lavorazione"}
          </button>
        </footer>
      </form>
    </LavorazioniModalShell>
  );
}
