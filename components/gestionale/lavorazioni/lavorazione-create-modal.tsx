"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { useLavorazioneCreateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { useMezzoCreateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { loadLavorazioneSchedeStore, saveLavorazioneSchedeStore } from "@/lib/schede/lavorazioni-schede-storage";
import { newSchedaMeta } from "@/lib/schede/schede-ui";
import { isDbStatoLavorazione } from "@/src/shared/selectors";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleMezzoAutocomplete } from "@/components/gestionale/gestionale-mezzo-autocomplete";
import { GestionaleSettingsSelect } from "@/components/gestionale/gestionale-settings-select";
import { SettingsAutocompleteInput } from "@/components/gestionale/settings-autocomplete-input";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsInput, dsLabel } from "@/lib/ui/design-system";

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

  const [mezzoId, setMezzoId] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [cliente, setCliente] = useState("");
  const [utilizzatore, setUtilizzatore] = useState("");
  const [cantiere, setCantiere] = useState("");
  const [marca, setMarca] = useState("");
  const [modello, setModello] = useState("");
  const [targa, setTarga] = useState("");
  const [matricola, setMatricola] = useState("");
  const [nScuderia, setNScuderia] = useState("");
  const [addetto, setAddetto] = useState("");
  const [stato, setStato] = useState("");
  const [priorita, setPriorita] = useState<PrioritaLavorazione>("media");
  const [ingressoYmd, setIngressoYmd] = useState(todayYmd);
  const [note, setNote] = useState("");

  const stati = globalOpts.lavorazioni.stati.filter((s) => s.id !== "annullata");
  const statiSelectOpts = stati.map((s) => ({ value: s.id, label: s.label }));
  const defaultAccettazioneStato = stati.find((s) => {
    const hay = `${s.id} ${s.label}`.toLowerCase();
    return hay.includes("accettazione");
  });
  const prioritaOpts = globalOpts.lavorazioni.prioritaDb;
  const addettiOpts = globalOpts.lavorazioni.addetti;
  const utilizzatoriOpts = globalOpts.mezziListe.utilizzatori;
  const cantieriOpts = globalOpts.mezziListe.cantieri;
  const mezziUi = (mezziQ.data ?? []).map(toMezzoUI);
  const selectedMezzo = mezziUi.find((m) => m.id === mezzoId) ?? null;

  useEffect(() => {
    if (!open) return;
    setMezzoId((defaultMezzoId ?? "").trim());
    setManualMode(false);
    setCliente("");
    setUtilizzatore("");
    setCantiere("");
    setMarca("");
    setModello("");
    setTarga("");
    setMatricola("");
    setNScuderia("");
    setAddetto(addettiOpts[0] ?? "");
    setStato(defaultAccettazioneStato?.id ?? "");
    setPriorita(prioritaOpts[0] ?? "media");
    setIngressoYmd(todayYmd());
    setNote("");
  }, [open, defaultMezzoId, prioritaOpts, addettiOpts, defaultAccettazioneStato?.id]);

  useEffect(() => {
    if (!open || manualMode || !selectedMezzo) return;
    setCliente(selectedMezzo.cliente === "—" ? "" : selectedMezzo.cliente);
    setUtilizzatore(selectedMezzo.utilizzatore === "—" ? "" : selectedMezzo.utilizzatore);
    setMarca(selectedMezzo.marca === "—" ? "" : selectedMezzo.marca);
    setModello(selectedMezzo.modello === "—" ? "" : selectedMezzo.modello);
    setTarga(selectedMezzo.targa === "—" ? "" : selectedMezzo.targa);
    setMatricola(selectedMezzo.matricola === "—" ? "" : selectedMezzo.matricola);
    setNScuderia(selectedMezzo.numeroScuderia ?? "");
  }, [open, manualMode, selectedMezzo]);

  useEffect(() => {
    if (!open || prioritaOpts.length === 0) return;
    if (!prioritaOpts.includes(priorita)) setPriorita(prioritaOpts[0]);
  }, [open, priorita, prioritaOpts]);

  useEffect(() => {
    if (!open || !stato) return;
    if (!stati.some((s) => s.id === stato)) setStato("");
  }, [open, stati, stato]);

  const statoColore = stato ? readablePillStyleFromHex(statoDisplayColor(stato, stati)) : undefined;

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!createdBy) {
      window.alert("Devi essere autenticato per creare una lavorazione.");
      return;
    }
    const sid = stato.trim() || defaultAccettazioneStato?.id?.trim() || "";
    if (!sid || !isDbStatoLavorazione(sid)) {
      window.alert("Seleziona uno stato tra quelli configurati in Impostazioni globali (modulo Lavorazioni).");
      return;
    }
    if (stati.length === 0) {
      window.alert("Nessuno stato configurato nelle impostazioni: non è possibile creare la lavorazione.");
      return;
    }
    if (!prioritaOpts.includes(priorita)) {
      window.alert("Seleziona una priorità tra quelle configurate in Impostazioni globali.");
      return;
    }
    const hasSelected = Boolean(!manualMode && selectedMezzo);
    const selectedChanged =
      hasSelected &&
      selectedMezzo &&
      (cliente.trim() !== selectedMezzo.cliente.trim() ||
        utilizzatore.trim() !== (selectedMezzo.utilizzatore === "—" ? "" : selectedMezzo.utilizzatore).trim() ||
        marca.trim() !== selectedMezzo.marca.trim() ||
        modello.trim() !== selectedMezzo.modello.trim() ||
        targa.trim() !== (selectedMezzo.targa === "—" ? "" : selectedMezzo.targa).trim() ||
        matricola.trim() !== (selectedMezzo.matricola === "—" ? "" : selectedMezzo.matricola).trim() ||
        nScuderia.trim() !== (selectedMezzo.numeroScuderia ?? "").trim());
    if ((!hasSelected || selectedChanged) && (!cliente.trim() || !marca.trim() || !modello.trim() || !matricola.trim())) {
      window.alert("Compila cliente, marca, modello e matricola.");
      return;
    }
    try {
      let finalMezzoId = mezzoId.trim();
      if (!hasSelected || selectedChanged) {
        const mezzo = await createMezzo.mutateAsync({
          cliente: cliente.trim(),
          utilizzatore: utilizzatore.trim() || null,
          marca: marca.trim(),
          modello: modello.trim(),
          targa: targa.trim() || null,
          matricola: matricola.trim(),
          numero_scuderia: nScuderia.trim() || null,
          anno: new Date().getFullYear(),
        });
        finalMezzoId = mezzo.id;
      }
      const row = await create.mutateAsync({
        mezzo_id: finalMezzoId,
        stato: sid as StatoLavorazione,
        priorita,
        data_ingresso: ymdToIsoMidUtc(ingressoYmd),
        data_uscita: null,
        note: note.trim() || null,
        created_by: createdBy,
      });
      const store = loadLavorazioneSchedeStore();
      store[row.id] = {
        lavorazioneId: row.id,
        ingresso: {
          ...newSchedaMeta("ingresso", addetto || createdBy),
          tipo: "ingresso",
          campi: {
            dataIngresso: ingressoYmd.split("-").reverse().join("/"),
            cliente: cliente.trim(),
            cantiere: cantiere.trim(),
            utilizzatore: utilizzatore.trim(),
            tipoAttrezzatura: "",
            marcaAttrezzatura: marca.trim(),
            modelloAttrezzatura: modello.trim(),
            matricola: matricola.trim(),
            nScuderia: nScuderia.trim(),
            oreLavoro: "",
            tipoTelaio: "",
            marcaTelaio: "",
            modelloTelaio: "",
            targa: targa.trim(),
            km: "",
            descrizioneAnomalia: note.trim(),
            livelloCarburante: "",
            addettoAccettazione: addetto.trim(),
          },
        },
        lavorazioni: null,
        ricambi: null,
      };
      saveLavorazioneSchedeStore(store);
      onCreated?.(row.id);
      onClose();
    } catch {
      /* errore mostrato sotto */
    }
  }

  const settingsBlocking = globalOpts.isLoading;
  const pending = create.isPending || createMezzo.isPending;
  const statoSelectDisabled = pending || settingsBlocking || stati.length === 0;

  return (
    <LavorazioniModalShell wide onRequestClose={onClose}>
      <form onSubmit={onSubmit} className="flex max-h-[min(88dvh,720px)] flex-col overflow-hidden">
        <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nuova lavorazione</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">I dati vengono registrati nell&apos;archivio lavorazioni.</p>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {globalOpts.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{globalOpts.error?.message ?? "Errore caricamento impostazioni."}</p>
          ) : null}
          {create.isError || createMezzo.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{create.error?.message ?? createMezzo.error?.message ?? "Creazione fallita."}</p>
          ) : null}

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Origine macchina</p>
              <button
                type="button"
                className={erpBtnNeutral}
                onClick={() => {
                  setManualMode((v) => !v);
                  setMezzoId("");
                }}
                disabled={pending}
              >
                {manualMode ? "Seleziona mezzo esistente" : "Inserimento manuale"}
              </button>
            </div>
            {!manualMode ? (
              <GestionaleMezzoAutocomplete
                value={mezzoId}
                onChange={setMezzoId}
                disabled={pending}
                enabled={open}
                required={false}
              />
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={dsLabel}>Cliente</span>
              <input className={`${dsInput} mt-1 w-full`} value={cliente} onChange={(e) => setCliente(e.target.value)} disabled={pending} required />
            </label>
            <label className="block">
              <span className={dsLabel}>Utilizzatore</span>
              <SettingsAutocompleteInput className="mt-1" value={utilizzatore} onChange={setUtilizzatore} options={utilizzatoriOpts} disabled={pending} />
            </label>
            <label className="block">
              <span className={dsLabel}>Cantiere</span>
              <SettingsAutocompleteInput className="mt-1" value={cantiere} onChange={setCantiere} options={cantieriOpts} disabled={pending} />
            </label>
            <label className="block">
              <span className={dsLabel}>Addetto</span>
              <GestionaleSettingsSelect className="mt-1" ariaLabel="Addetto" value={addetto} onChange={setAddetto} options={addettiOpts} disabled={pending} />
            </label>
            <label className="block">
              <span className={dsLabel}>Marca attrezzatura</span>
              <input className={`${dsInput} mt-1 w-full`} value={marca} onChange={(e) => setMarca(e.target.value)} disabled={pending} required />
            </label>
            <label className="block">
              <span className={dsLabel}>Modello attrezzatura</span>
              <input className={`${dsInput} mt-1 w-full`} value={modello} onChange={(e) => setModello(e.target.value)} disabled={pending} required />
            </label>
            <label className="block">
              <span className={dsLabel}>Targa</span>
              <input className={`${dsInput} mt-1 w-full`} value={targa} onChange={(e) => setTarga(e.target.value)} disabled={pending} />
            </label>
            <label className="block">
              <span className={dsLabel}>Matricola</span>
              <input className={`${dsInput} mt-1 w-full`} value={matricola} onChange={(e) => setMatricola(e.target.value)} disabled={pending} required />
            </label>
            <label className="block sm:col-span-2">
              <span className={dsLabel}>N. scuderia</span>
              <input className={`${dsInput} mt-1 w-full`} value={nScuderia} onChange={(e) => setNScuderia(e.target.value)} disabled={pending} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="block min-w-0">
              <span className={dsLabel}>Stato iniziale</span>
              <div className="mt-1 flex items-center gap-2">
                {stato && stati.length > 0 ? (
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-[color:var(--cab-border)] shadow-sm"
                    style={statoColore}
                    title="Colore stato (da impostazioni)"
                    aria-hidden
                  />
                ) : null}
                <GestionaleSettingsSelect
                  className="min-w-0 flex-1"
                  ariaLabel="Stato iniziale lavorazione"
                  value={stato}
                  onChange={setStato}
                  options={statiSelectOpts}
                  placeholder={defaultAccettazioneStato ? `Default: ${defaultAccettazioneStato.label}` : "— Seleziona stato —"}
                  isLoading={settingsBlocking}
                  emptyMessage="Nessuno stato configurato nelle Impostazioni (modulo Lavorazioni)."
                  disabled={statoSelectDisabled}
                  required
                />
              </div>
            </div>
            <label className="block">
              <span className={dsLabel}>Priorità</span>
              <GestionaleSettingsSelect
                className="mt-1 capitalize"
                ariaLabel="Priorità lavorazione"
                value={priorita}
                onChange={(v) => setPriorita(v as PrioritaLavorazione)}
                options={prioritaOpts}
                disabled={pending}
                required
              />
            </label>
          </div>

          <label className="block">
            <span className={dsLabel}>Data ingresso</span>
            <input
              type="date"
              className={`${dsInput} mt-1 w-full`}
              value={ingressoYmd}
              onChange={(e) => setIngressoYmd(e.target.value)}
              disabled={pending}
              required
            />
          </label>

          <label className="block">
            <span className={dsLabel}>Note</span>
            <textarea className={`${dsInput} mt-1 min-h-[88px] w-full resize-y`} value={note} onChange={(e) => setNote(e.target.value)} disabled={pending} rows={3} />
          </label>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="button" className={erpBtnNeutral} onClick={onClose} disabled={pending}>
            Annulla
          </button>
          <button
            type="submit"
            className={erpBtnAccent}
            disabled={pending || !createdBy || !(stato.trim() || defaultAccettazioneStato) || (!selectedMezzo && !manualMode) || stati.length === 0 || settingsBlocking}
          >
            {pending ? "Salvataggio…" : "Crea lavorazione"}
          </button>
        </footer>
      </form>
    </LavorazioniModalShell>
  );
}
