"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { gestionaleTextareaMaxHeightCompact } from "@/lib/ui/design-system";
import { runButtonSubmit, useSubmitLock } from "@/lib/forms/form-engine";
import { Tooltip } from "@/components/design-system/tooltip";
import { HubModalTab, HubModalTabBar } from "@/components/design-system/hub-modal-tab-bar";
import { SchedaIngressoPanoramicaAnagraficaContent } from "@/components/gestionale/lavorazioni/scheda-ingresso-panoramica-view";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import {
  HubModalPanoramicaNoteEditor,
  HubModalPanoramicaPanel,
} from "@/components/design-system/hub-modal-panoramica";
import { canOpenDocumento, formatDocumentoRigaSintetica, openDocumentoFile } from "@/components/gestionale/documenti/documenti-helpers";
import { HubIconOpen, HubIconTrash } from "@/components/design-system/hub-table-action-icons";
import {
  LavorazioniModalHeader,
  LavorazioniModalShell,
  type LavorazioniModalDialogSize,
} from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { SchedaIngressoEditModal } from "@/components/gestionale/lavorazioni/lavorazione-create-modal";
import { SchedaEliminaConfirmDialog } from "@/components/gestionale/lavorazioni/scheda-elimina-confirm-dialog";
import { normalizeSchedaIngressoFields } from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import { CopiaUltimaSchedaIngressoBanner } from "@/components/gestionale/lavorazioni/copia-ultima-scheda-ingresso-banner";
import { GlobalDatePicker, GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { LavorazioneCostoDiscreto } from "@/components/gestionale/lavorazioni/lavorazione-costo-discreto";
import { LavorazioneMediaPanel } from "@/components/gestionale/media/lavorazione-media-panel";
import { useLavorazioneCosto } from "@/src/hooks/gestionale/use-lavorazione-costo";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import { FileEsternoBadge, SchedaStatoBadge } from "@/components/lavorazioni/schede/schede-badges";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { applyMagazzinoScaricoDaScheda } from "@/lib/magazzino/apply-scarico-da-scheda";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { documentoRowToGestionale } from "@/lib/mezzi/mezzi-db-ui-adapter";
import {
  formatIdentificazioneMezzoLine,
  formatLavorazioneDetailHeaderSubtitle,
  identificazionePartsFromLavorazione,
  identificazionePartsFromSchedaIngresso,
} from "@/lib/mezzi/identificazione-mezzo";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  findLastSchedaIngressoForIdent,
} from "@/lib/schede/scheda-ingresso-reuse";
import {
  diffSchedaIngressoCampi,
  diffSchedaLavorazioniDoc,
  diffSchedaRicambiDoc,
  SCHEDA_INGRESSO_LABEL,
  SCHEDA_LAVORAZIONI_LABEL,
  SCHEDA_RICAMBI_LABEL,
} from "@/lib/schede/schede-log-helpers";
import {
  buildSchedaIngressoFieldsFromContext,
  buildSchedaLavorazioniFieldsFromContext,
  buildSchedaRicambiFieldsFromContext,
  findMezzoForLavorazione,
} from "@/lib/schede/schede-autofill";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import { openBlobInNewTab } from "@/lib/schede/schede-print-html";
import { openSchedaPdfInNewTab } from "@/lib/schede/schede-pdf";
import {
  countSchedePresenti,
  newRigaId,
  newSchedaMeta,
  statoUiSchedaIngresso,
  statoUiSchedaLavorazioni,
  statoUiSchedaRicambi,
} from "@/lib/schede/schede-ui";
import { parseItalianDayDisplayToIso } from "@/lib/ui/italian-date-input-mask";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioniLogChange, LavorazioniLogTipo } from "@/lib/lavorazioni/lavorazioni-change-log";
import { LavorazionePreventiviHubList, CreaPreventivoDaSchedeCta } from "@/components/lavorazioni/schede/lavorazione-preventivi-hub-list";
import {
  buildPreventiviArchivioFilterHref,
  buildPreventiviOpenHrefForRecord,
} from "@/lib/preventivi/preventivi-lavorazione-href";
import { mergePreventiviPerMacchina, mezzoPerFiltroPreventivi } from "@/lib/preventivi/preventivi-per-macchina";
import { preventivoRowToRecordStub } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { Q_PREVENTIVI_NUOVO } from "@/lib/preventivi/preventivi-query";
import { writePendingPreventivoPayload } from "@/lib/preventivi/preventivi-session-bridge";
import type { PreventivoLavorazioneOrigine, PreventivoRecord } from "@/lib/preventivi/types";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import {
  dsBadgeOk,
  dsBtnDanger,
  dsBtnNeutral,
  dsBtnPrimary,
  dsBtnSoftOrange,
  dsGestionaleInfoCardCompact,
  dsGestionaleInfoCardTitle,
  dsHubModalFieldLabel,
  dsInput,
  dsLabel,
  dsScrollbar,
  dsTable,
  dsTableActionTextBtn,
  dsTableActionTextBtnDanger,
  dsTableActionTextBtnPrimary,
  dsTableRow,
  dsTableWrap,
  GESTIONALE_SEARCH_PLACEHOLDER,
} from "@/lib/ui/design-system";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { LavorazioneAttivitaPanel } from "@/components/lavorazioni/lavorazione-attivita-panel";
import { buildLavorazioneAttivitaFeed } from "@/lib/lavorazioni/lavorazione-attivita-feed";
import { logAutoreLabel } from "@/lib/gestionale-log/log-modifiche-view-model";
import { useAuth } from "@/context/auth-context";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { useLavorazioneHub } from "@/src/hooks/gestionale/use-lavorazione-hub";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { reconcileGestionaleEntity } from "@/lib/sync/gestionale-reconcile";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/src/hooks/use-permissions";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import type {
  LavorazioneSchedeBundle,
  RigaAddettoOreScheda,
  RigaLavorazioneScheda,
  RigaRicambioScheda,
  SchedaIngressoDoc,
  SchedaIngressoFields,
  SchedaLavorazioniDoc,
  SchedaRicambiDoc,
  SchedaTipo,
} from "@/types/schede";

type LavRow = LavorazioneAttiva | LavorazioneArchiviata;

type Stage = { kind: "hub" } | { kind: "lavorazioni" } | { kind: "ricambi" };
type HubTab = "schede" | "panoramica" | "preventivi" | "documenti" | "attivita";
type HubTabInput = HubTab | "timeline" | "log";

function normalizeHubTab(tab: HubTabInput | undefined): HubTab {
  if (tab === "timeline" || tab === "log") return "attivita";
  return tab ?? "schede";
}

export type SchedeLavorazioneDialogSize = LavorazioniModalDialogSize;

function resolveSchedeDialogSize(
  dialogSize: SchedeLavorazioneDialogSize | undefined,
  initialTab: HubTab,
): SchedeLavorazioneDialogSize {
  if (dialogSize) return dialogSize;
  return initialTab === "panoramica" ? "compact" : "hub";
}

function IconCopiaIngressoPrecedente({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="8" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6 6h10a2 2 0 0 1 2 2v10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 12v5M9.5 14.5H14.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function fmtIt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtItShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function todayItDate(): string {
  return new Date().toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function assertItalianDay(label: string, value: string, notify: (message: string) => void): boolean {
  const t = value.trim();
  if (!t) {
    notify(`Data obbligatoria: ${label}`);
    return false;
  }
  if (!parseItalianDayDisplayToIso(t).ok) {
    notify(`${label}: usa il formato GG/MM/AAAA`);
    return false;
  }
  return true;
}

function normalizeOreText(raw: string): string {
  const t = raw.trim().replace(",", ".");
  if (!t) return "";
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return raw.trim();
  return String(Math.round(n * 1000) / 1000);
}

/** Ore decimali libere da tastiera; frecce native con step 1. */
function SchedaOreTextInput({
  label,
  value,
  onChange,
  readOnly = false,
  className = "",
}: {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const field = (
    <input
      type="number"
      step={1}
      min={0}
      inputMode="decimal"
      className={`${dsInput} mt-1 ${className}`.trim()}
      readOnly={readOnly}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onChange(normalizeOreText(e.target.value))}
    />
  );
  if (!label) return field;
  return (
    <label className="block text-xs">
      <span className={dsLabel}>{label}</span>
      {field}
    </label>
  );
}

function SchedaOreNumberInput({
  value,
  onChange,
  readOnly = false,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const [text, setText] = useState(() => (Number.isFinite(value) ? String(value) : "0"));
  useEffect(() => {
    setText(Number.isFinite(value) ? String(value) : "0");
  }, [value]);
  return (
    <input
      type="number"
      step={1}
      min={0}
      inputMode="decimal"
      readOnly={readOnly}
      className={className}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number.parseFloat(e.target.value.replace(",", "."));
        if (Number.isFinite(n) && n >= 0) onChange(Math.round(n * 1000) / 1000);
      }}
      onBlur={() => {
        const n = Number.parseFloat(text.replace(",", "."));
        const next = Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : 0;
        setText(String(next));
        onChange(next);
      }}
    />
  );
}

type SchedaLogEv = {
  tipo: LavorazioniLogTipo;
  schedaOggetto: string;
  riepilogo: string;
  changes: LavorazioniLogChange[];
};

export function SchedeLavorazioneModal({
  open,
  onClose,
  lav,
  origine,
  initialTab: initialTabProp = "schede",
  dialogSize: dialogSizeProp,
  bundle,
  onPersist,
  attive,
  storico,
  mezzi,
  addetti,
  currentUser,
  schedeStore,
  onSchedaLog,
  onIngressoCommitted,
  canDeleteLavorazione = false,
  onDeleteLavorazione,
  deleteLavorazionePending = false,
}: {
  open: boolean;
  onClose: () => void;
  lav: LavRow;
  origine?: PreventivoLavorazioneOrigine;
  initialTab?: HubTabInput;
  /** Fissato all'apertura: `compact` per Informazioni, `hub` per Schede. */
  dialogSize?: SchedeLavorazioneDialogSize;
  bundle: LavorazioneSchedeBundle;
  onPersist: (next: LavorazioneSchedeBundle) => void;
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
  mezzi: MezzoGestito[];
  addetti: string[];
  currentUser: string;
  schedeStore: Record<string, LavorazioneSchedeBundle>;
  onSchedaLog?: (ev: SchedaLogEv) => void;
  onIngressoCommitted?: (campi: SchedaIngressoFields) => void | Promise<void>;
  canDeleteLavorazione?: boolean;
  onDeleteLavorazione?: () => void;
  deleteLavorazionePending?: boolean;
}) {
  const router = useRouter();
  const { authorName, user } = useAuth();
  const gestToast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const { canEditWorkOrders } = usePermissions();
  const globalOpts = useGlobalOptions({ debugTag: "SchedeLavorazioneModal" });
  const statiOpts = useMemo(
    () => globalOpts.lavorazioni.stati.filter((s) => s.id !== "annullata"),
    [globalOpts.lavorazioni.stati],
  );
  const hubQuery = useLavorazioneHub(lav.id);
  const qc = useQueryClient();
  const hubData = hubQuery.data;
  const initialTab = normalizeHubTab(initialTabProp);
  const [frozenDialogSize] = useState(() => resolveSchedeDialogSize(dialogSizeProp, initialTab));
  const mezzo = useMemo(() => findMezzoForLavorazione(mezzi, lav), [mezzi, lav]);
  const [stage, setStage] = useState<Stage>({ kind: "hub" });
  const [hubTab, setHubTab] = useState<HubTab>(initialTab);
  const [unsavedPanel, setUnsavedPanel] = useState<null | "ingresso" | "lav" | "ric">(null);
  const [panoramicaNoteSaving, setPanoramicaNoteSaving] = useState(false);
  const [draft, setDraft] = useState<LavorazioneSchedeBundle>(bundle);
  const draftRef = useRef(draft);
  const syncedBundleJsonRef = useRef(JSON.stringify(bundle));
  useLayoutEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const submitLock = useSubmitLock();
  const ingressoDraftRef = useRef<SchedaIngressoFields | null>(null);
  const [ingressoFormOpen, setIngressoFormOpen] = useState(false);
  const [ingressoEditorInitial, setIngressoEditorInitial] = useState<SchedaIngressoFields | null>(null);
  const [lavDoc, setLavDoc] = useState<SchedaLavorazioniDoc | null>(null);
  const [ricDoc, setRicDoc] = useState<SchedaRicambiDoc | null>(null);
  const [eliminaConfirmTipo, setEliminaConfirmTipo] = useState<SchedaTipo | null>(null);
  const baselineIngressoJson = useRef<string | null>(null);
  const baselineLavorazioniJson = useRef<string | null>(null);
  const baselineRicambiJson = useRef<string | null>(null);
  const emitLog = useCallback(
    (ev: SchedaLogEv) => {
      onSchedaLog?.(ev);
    },
    [onSchedaLog],
  );

  const attivitaFeedInput = useMemo(() => {
    if (!hubData) return null;
    return {
      logRows: hubData.log,
      schedeRows: hubData.schede,
      movimentiRows: hubData.movimenti,
      preventiviRows: hubData.preventivi,
      documentiRows: hubData.documenti,
      lavorazione: hubData.lavorazione,
      statiOpts,
      resolveAutore: (row: (typeof hubData.log)[number]) =>
        logAutoreLabel(row, user?.id ?? null, authorName),
    };
  }, [hubData, statiOpts, user?.id, authorName]);

  const attivitaCount = useMemo(
    () => (attivitaFeedInput ? buildLavorazioneAttivitaFeed(attivitaFeedInput).length : 0),
    [attivitaFeedInput],
  );

  useEffect(() => {
    if (!open) {
      setEliminaConfirmTipo(null);
      return;
    }
    const t = window.setTimeout(() => {
      setStage({ kind: "hub" });
      setHubTab(initialTab);
      setIngressoFormOpen(false);
      setIngressoEditorInitial(null);
      ingressoDraftRef.current = null;
      const cloned = JSON.parse(JSON.stringify(bundle)) as LavorazioneSchedeBundle;
      if (!cloned.codice?.trim() && lav.codice?.trim()) {
        cloned.codice = lav.codice.trim();
      }
      setDraft(cloned);
      syncedBundleJsonRef.current = JSON.stringify(cloned);
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evita reset hub dopo persist (es. «Crea nuova»)
  }, [open, lav.id, initialTab]);

  useEffect(() => {
    if (!open) return;
    if (unsavedPanel != null) return;
    if (stage.kind !== "hub") return;

    const incoming = JSON.stringify(bundle);
    if (incoming === syncedBundleJsonRef.current) return;

    const currentDraft = JSON.stringify(draftRef.current);
    if (currentDraft !== syncedBundleJsonRef.current) return;

    const cloned = JSON.parse(incoming) as LavorazioneSchedeBundle;
    setDraft(cloned);
    syncedBundleJsonRef.current = incoming;
  }, [bundle, open, unsavedPanel, stage.kind]);

  useCabSyncListener(["scheda_lavorazione", "lavorazione_documents", "documenti"], (event) => {
    const r = reconcileGestionaleEntity(qc, event, "cab_sync", { skipInvalidation: true });
    if (r.needsRefetch) void hubQuery.refetch();
  });

  const persist = useCallback(
    (b: LavorazioneSchedeBundle) => {
      onPersist(b);
      setDraft(b);
      syncedBundleJsonRef.current = JSON.stringify(b);
    },
    [onPersist],
  );

  function openIngressoEditor(campi: SchedaIngressoFields) {
    const normalized = normalizeSchedaIngressoFields(campi, addetti[0] ?? "");
    baselineIngressoJson.current = JSON.stringify(normalized);
    ingressoDraftRef.current = normalized;
    setIngressoEditorInitial(normalized);
    setIngressoFormOpen(true);
  }

  function closeIngressoEditor() {
    setIngressoFormOpen(false);
    setIngressoEditorInitial(null);
    ingressoDraftRef.current = null;
  }

  function requestDeleteSchedaTipo(tipo: SchedaTipo) {
    if (!canEditWorkOrders) return;
    setEliminaConfirmTipo(tipo);
  }

  function confirmDeleteSchedaTipo() {
    const tipo = eliminaConfirmTipo;
    if (!tipo || !canEditWorkOrders) return;
    const base = draftRef.current;
    const label =
      tipo === "ingresso"
        ? SCHEDA_INGRESSO_LABEL
        : tipo === "lavorazioni"
          ? SCHEDA_LAVORAZIONI_LABEL
          : SCHEDA_RICAMBI_LABEL;
    const next: LavorazioneSchedeBundle = { ...base, [tipo]: null };
    persist(next);
    emitLog({ tipo: "eliminazione", schedaOggetto: label, riepilogo: "Scheda eliminata", changes: [] });
    setEliminaConfirmTipo(null);
    setStage({ kind: "hub" });
    if (tipo === "ingresso") closeIngressoEditor();
    if (tipo === "lavorazioni") setLavDoc(null);
    if (tipo === "ricambi") setRicDoc(null);
  }

  function startCreate(tipo: SchedaTipo) {
    if (!canEditWorkOrders) return;
    const u = currentUser.trim() || "Operatore";
    if (tipo === "ingresso") {
      const campi = buildSchedaIngressoFieldsFromContext(lav, mezzo, addetti[0] ?? "");
      baselineIngressoJson.current = JSON.stringify(campi);
      const doc: SchedaIngressoDoc = { ...newSchedaMeta("ingresso", u), tipo: "ingresso", campi };
      flushSync(() => {
        persist({ ...draftRef.current, ingresso: doc });
      });
      openIngressoEditor(campi);
      emitLog({
        tipo: "creazione",
        schedaOggetto: SCHEDA_INGRESSO_LABEL,
        riepilogo: "Scheda ingresso creata",
        changes: [],
      });
    } else if (tipo === "lavorazioni") {
      const campi = buildSchedaLavorazioniFieldsFromContext(lav, mezzo);
      const addInit: RigaAddettoOreScheda[] = [];
      if (lav.addetto.trim()) addInit.push({ addetto: lav.addetto, oreImpiegate: 0 });
      const doc: SchedaLavorazioniDoc = {
        ...newSchedaMeta("lavorazioni", u),
        tipo: "lavorazioni",
        campi: {
          ...campi,
          righe: [
            {
              id: newRigaId(),
              dataLavorazione: todayItDate(),
              lavorazioniEffettuate: "",
              addettiAssegnati: addInit,
            },
          ],
        },
      };
      baselineLavorazioniJson.current = JSON.stringify(doc);
      flushSync(() => {
        setLavDoc(doc);
        persist({ ...draftRef.current, lavorazioni: doc });
        setStage({ kind: "lavorazioni" });
      });
      emitLog({
        tipo: "creazione",
        schedaOggetto: SCHEDA_LAVORAZIONI_LABEL,
        riepilogo: "Scheda lavorazioni creata",
        changes: [],
      });
    } else {
      const campi = buildSchedaRicambiFieldsFromContext(lav, mezzo);
      const doc: SchedaRicambiDoc = {
        ...newSchedaMeta("ricambi", u),
        tipo: "ricambi",
        campi: {
          ...campi,
          righe: [
            {
              id: newRigaId(),
              ricambioId: null,
              ricambioNome: "",
              codice: "",
              quantita: 1,
              addetto: lav.addetto,
              dataUtilizzo: todayItDate(),
            },
          ],
        },
      };
      baselineRicambiJson.current = JSON.stringify(doc);
      flushSync(() => {
        setRicDoc(doc);
        persist({ ...draftRef.current, ricambi: doc });
        setStage({ kind: "ricambi" });
      });
      emitLog({
        tipo: "creazione",
        schedaOggetto: SCHEDA_RICAMBI_LABEL,
        riepilogo: "Scheda ricambi creata",
        changes: [],
      });
    }
  }

  function duplicateIngressoPrev() {
    const match = findLastSchedaIngressoForIdent(
      lav.targa,
      lav.matricola,
      mezzi,
      schedeStore,
      attive,
      storico,
      { excludeLavorazioneId: lav.id },
    );
    if (!match) {
      gestToast.warning("Nessuna scheda ingresso precedente trovata per questo mezzo (targa o matricola).");
      return;
    }
    const u = currentUser.trim() || "Operatore";
    const now = new Date().toISOString();
    const campi = { ...match.campi };
    baselineIngressoJson.current = JSON.stringify(campi);
    const doc: SchedaIngressoDoc = {
      ...newSchedaMeta("ingresso", u),
      tipo: "ingresso",
      createdAt: now,
      updatedAt: now,
      createdBy: u,
      updatedBy: u,
      sorgente: "generata",
      fileEsterno: null,
      campi,
    };
    persist({ ...draftRef.current, ingresso: doc });
    openIngressoEditor(campi);
    emitLog({
      tipo: "creazione",
      schedaOggetto: SCHEDA_INGRESSO_LABEL,
      riepilogo: "Scheda ingresso creata (copia da intervento precedente)",
      changes: [],
    });
  }

  const lavOrigine = origine ?? (lav.id.startsWith("lav-arch-") ? ("storico" as const) : ("attiva" as const));

  const preventiviCollegati = useMemo(() => {
    if (!open) return [];
    return (hubData?.preventivi ?? [])
      .filter((row) => row.lavorazione_id === lav.id)
      .map((row) => preventivoRowToRecordStub(row, null));
  }, [lav.id, open, hubData?.preventivi]);

  const mezzoFiltroPreventivi = useMemo(() => mezzoPerFiltroPreventivi(lav, mezzi), [lav, mezzi]);

  const preventiviPerMacchina = useMemo(() => {
    if (!open) return [];
    return mergePreventiviPerMacchina(hubData?.preventivi, mezzoFiltroPreventivi);
  }, [open, hubData?.preventivi, mezzoFiltroPreventivi]);

  function apriPreventivoNeiPreventivi(p: PreventivoRecord) {
    onClose();
    router.push(buildPreventiviOpenHrefForRecord(p));
  }

  const documentiHubUi = useMemo(() => {
    return (hubData?.documenti ?? []).map(documentoRowToGestionale);
  }, [hubData?.documenti]);

  function generaPreventivoDaHub() {
    const snap = draftRef.current;
    writePendingPreventivoPayload({
      lav,
      origine: lavOrigine,
      bundle: {
        ...snap,
        lavorazioneId: lav.id,
        ingresso: snap.ingresso ?? draft.ingresso ?? null,
        lavorazioni: lavDoc ?? snap.lavorazioni ?? draft.lavorazioni ?? null,
        ricambi: ricDoc ?? snap.ricambi ?? draft.ricambi ?? null,
      },
    });
    onClose();
    router.push(`/preventivi?${Q_PREVENTIVI_NUOVO}=1`);
  }

  const hub = draft;
  const panoramicaCampi = useMemo((): SchedaIngressoFields => {
    const ig = hub.ingresso;
    if (ig && ig.sorgente !== "file_esterno") return ig.campi;
    return buildSchedaIngressoFieldsFromContext(lav, mezzo, lav.addetto.trim() || addetti[0] || "");
  }, [hub.ingresso, lav, mezzo, addetti]);

  const panoramicaDisplayFields = useMemo(
    (): SchedaIngressoFields => ({
      ...panoramicaCampi,
      cliente: panoramicaCampi.cliente.trim() || lav.cliente.trim(),
      cantiere: panoramicaCampi.cantiere.trim() || lav.cantiere.trim(),
      utilizzatore: panoramicaCampi.utilizzatore.trim() || lav.utilizzatore.trim(),
      targa: panoramicaCampi.targa.trim() || lav.targa.trim(),
      matricola: panoramicaCampi.matricola.trim() || lav.matricola.trim(),
      nScuderia: panoramicaCampi.nScuderia.trim() || lav.nScuderia.trim(),
    }),
    [panoramicaCampi, lav],
  );

  const identSubtitle = useMemo(
    () =>
      formatLavorazioneDetailHeaderSubtitle(
        identificazionePartsFromSchedaIngresso(panoramicaCampi),
        lav,
      ),
    [panoramicaCampi, lav],
  );

  const panoramicaNoteValue = useMemo(
    () => panoramicaCampi.noteIntervento?.trim() || lav.noteInterne?.trim() || "",
    [panoramicaCampi.noteIntervento, lav.noteInterne],
  );

  const costoLavorazione = useLavorazioneCosto(lav.id, draft, {
    enabled: open,
    cliente: lav.cliente,
  });
  const nOk = countSchedePresenti(hub);

  const hubLastIngressoMatch = useMemo(
    () =>
      findLastSchedaIngressoForIdent(lav.targa, lav.matricola, mezzi, schedeStore, attive, storico, {
        excludeLavorazioneId: lav.id,
      }),
    [lav.targa, lav.matricola, lav.id, mezzi, schedeStore, attive, storico],
  );

  const commitPanoramicaNote = useCallback(
    async (noteIntervento: string) => {
      if (!canEditWorkOrders) return;
      const trimmed = noteIntervento.trim();
      if (trimmed === panoramicaNoteValue) return;

      setPanoramicaNoteSaving(true);
      try {
        const campi: SchedaIngressoFields = { ...panoramicaCampi, noteIntervento: trimmed };
        const now = new Date().toISOString();
        const u = currentUser.trim() || "Operatore";
        const base = draftRef.current.ingresso;

        if (base?.sorgente === "file_esterno") {
          await onIngressoCommitted?.(campi);
          return;
        }

        if (base) {
          const changes = diffSchedaIngressoCampi(base.campi, campi);
          if (changes.length) {
            emitLog({
              tipo: "aggiornamento",
              schedaOggetto: SCHEDA_INGRESSO_LABEL,
              riepilogo: "Note operative aggiornate",
              changes,
            });
          }
          const nextDoc: SchedaIngressoDoc = {
            ...base,
            campi,
            updatedAt: now,
            updatedBy: u,
          };
          persist({ ...draftRef.current, ingresso: nextDoc });
        } else {
          const nextDoc: SchedaIngressoDoc = {
            ...newSchedaMeta("ingresso", u),
            tipo: "ingresso",
            campi,
          };
          emitLog({
            tipo: "creazione",
            schedaOggetto: SCHEDA_INGRESSO_LABEL,
            riepilogo: "Scheda ingresso creata (note operative)",
            changes: [],
          });
          persist({ ...draftRef.current, ingresso: nextDoc });
        }

        await onIngressoCommitted?.(campi);
      } catch {
        gestToast.errorOnce("schede-note-save", "Salvataggio note non riuscito. Riprova.", { module: "lavorazioni" });
      } finally {
        setPanoramicaNoteSaving(false);
      }
    },
    [
      canEditWorkOrders,
      panoramicaNoteValue,
      panoramicaCampi,
      currentUser,
      persist,
      emitLog,
      onIngressoCommitted,
    ],
  );

  async function commitIngressoSave(): Promise<boolean> {
    const result = { ok: false };
    await runButtonSubmit(
      modalRootRef.current,
      submitLock,
      () => ({
        ig: ingressoDraftRef.current,
        base: draftRef.current.ingresso,
      }),
      (snap) => {
        const ig = snap.ig;
        const base = snap.base;
        if (!ig || !base) return;
        if (!assertItalianDay("Data ingresso", ig.dataIngresso, gestToast.validation)) return;
        const prevCampi: SchedaIngressoFields | null = baselineIngressoJson.current
          ? (JSON.parse(baselineIngressoJson.current) as SchedaIngressoFields)
          : null;
        const changes = prevCampi ? diffSchedaIngressoCampi(prevCampi, ig) : [];
        if (changes.length) {
          emitLog({
            tipo: "aggiornamento",
            schedaOggetto: SCHEDA_INGRESSO_LABEL,
            riepilogo: "Scheda ingresso aggiornata",
            changes,
          });
        }
        const now = new Date().toISOString();
        const u = currentUser.trim() || "Operatore";
        const nextDoc: SchedaIngressoDoc = {
          tipo: "ingresso",
          createdAt: base.createdAt,
          createdBy: base.createdBy,
          sorgente: base.sorgente,
          fileEsterno: base.fileEsterno,
          campi: ig,
          updatedAt: now,
          updatedBy: u,
        };
        persist({ ...draftRef.current, ingresso: nextDoc });
        void onIngressoCommitted?.(ig);
        result.ok = true;
      },
    );
    return result.ok;
  }

  function tryIngressoBack(draft: SchedaIngressoFields) {
    ingressoDraftRef.current = draft;
    if (baselineIngressoJson.current === JSON.stringify(draft)) {
      closeIngressoEditor();
      return;
    }
    setUnsavedPanel("ingresso");
  }

  async function commitLavorazioniSave(): Promise<boolean> {
    const result = { ok: false };
    await runButtonSubmit(
      modalRootRef.current,
      submitLock,
      () => ({ doc: lavDoc, draft: draftRef.current }),
      (snap) => {
        const doc = snap.doc;
        if (!doc || !snap.draft.lavorazioni) return;
        for (let i = 0; i < doc.campi.righe.length; i += 1) {
          const row = doc.campi.righe[i]!;
          if (!assertItalianDay(`Data riga ${i + 1}`, row.dataLavorazione, gestToast.validation)) return;
        }
        const prevDoc: SchedaLavorazioniDoc | null = baselineLavorazioniJson.current
          ? (JSON.parse(baselineLavorazioniJson.current) as SchedaLavorazioniDoc)
          : null;
        const now = new Date().toISOString();
        const u = currentUser.trim() || "Operatore";
        const nextDoc: SchedaLavorazioniDoc = {
          tipo: "lavorazioni",
          createdAt: doc.createdAt,
          createdBy: doc.createdBy,
          sorgente: doc.sorgente,
          fileEsterno: doc.fileEsterno,
          campi: { ...doc.campi, righe: doc.campi.righe.map((r) => ({ ...r })) },
          updatedAt: now,
          updatedBy: u,
        };
        const changes = diffSchedaLavorazioniDoc(prevDoc, nextDoc);
        if (changes.length) {
          emitLog({
            tipo: "aggiornamento",
            schedaOggetto: SCHEDA_LAVORAZIONI_LABEL,
            riepilogo: "Scheda lavorazioni aggiornata",
            changes,
          });
        }
        persist({ ...snap.draft, lavorazioni: nextDoc });
        result.ok = true;
      },
    );
    return result.ok;
  }

  function tryLavorazioniBack() {
    const doc = lavDoc;
    if (!doc) {
      setStage({ kind: "hub" });
      return;
    }
    if (baselineLavorazioniJson.current === JSON.stringify(doc)) {
      setStage({ kind: "hub" });
      setLavDoc(null);
      return;
    }
    setUnsavedPanel("lav");
  }

  async function commitRicambiSave(): Promise<boolean> {
    const result = { ok: false };
    await runButtonSubmit(
      modalRootRef.current,
      submitLock,
      () => ({ doc: ricDoc, draft: draftRef.current }),
      (snap) => {
        const doc = snap.doc;
        if (!doc || !snap.draft.ricambi) return;
        for (let i = 0; i < doc.campi.righe.length; i += 1) {
          const row = doc.campi.righe[i]!;
          if (!assertItalianDay(`Data utilizzo riga ${i + 1}`, row.dataUtilizzo, gestToast.validation)) return;
        }
        const prevDoc: SchedaRicambiDoc | null = baselineRicambiJson.current
          ? (JSON.parse(baselineRicambiJson.current) as SchedaRicambiDoc)
          : null;
        const now = new Date().toISOString();
        const u = currentUser.trim() || "Operatore";
        const nextDoc: SchedaRicambiDoc = {
          tipo: "ricambi",
          createdAt: doc.createdAt,
          createdBy: doc.createdBy,
          sorgente: doc.sorgente,
          fileEsterno: doc.fileEsterno,
          campi: { ...doc.campi, righe: doc.campi.righe.map((r) => ({ ...r })) },
          updatedAt: now,
          updatedBy: u,
        };
        const changes = diffSchedaRicambiDoc(prevDoc, nextDoc);
        if (changes.length) {
          emitLog({
            tipo: "aggiornamento",
            schedaOggetto: SCHEDA_RICAMBI_LABEL,
            riepilogo: "Scheda ricambi aggiornata",
            changes,
          });
        }
        persist({ ...snap.draft, ricambi: nextDoc });
        result.ok = true;
      },
    );
    return result.ok;
  }

  function tryRicambiBack() {
    const doc = ricDoc;
    if (!doc) {
      setStage({ kind: "hub" });
      return;
    }
    if (baselineRicambiJson.current === JSON.stringify(doc)) {
      setStage({ kind: "hub" });
      setRicDoc(null);
      return;
    }
    setUnsavedPanel("ric");
  }

  if (!open) return null;

  function apriSchedaIngresso() {
    if (!hub.ingresso) return;
    if (hub.ingresso.sorgente === "file_esterno" && hub.ingresso.fileEsterno) {
      openBlobInNewTab(hub.ingresso.fileEsterno.mime, hub.ingresso.fileEsterno.dataBase64, hub.ingresso.fileEsterno.fileName);
      return;
    }
    openIngressoEditor(hub.ingresso.campi);
  }
  function apriSchedaLavorazioni() {
    if (!hub.lavorazioni) return;
    if (hub.lavorazioni.sorgente === "file_esterno" && hub.lavorazioni.fileEsterno) {
      openBlobInNewTab(hub.lavorazioni.fileEsterno.mime, hub.lavorazioni.fileEsterno.dataBase64, hub.lavorazioni.fileEsterno.fileName);
      return;
    }
    baselineLavorazioniJson.current = JSON.stringify(hub.lavorazioni);
    setLavDoc(hub.lavorazioni);
    setStage({ kind: "lavorazioni" });
  }
  function apriSchedaRicambi() {
    if (!hub.ricambi) return;
    if (hub.ricambi.sorgente === "file_esterno" && hub.ricambi.fileEsterno) {
      openBlobInNewTab(hub.ricambi.fileEsterno.mime, hub.ricambi.fileEsterno.dataBase64, hub.ricambi.fileEsterno.fileName);
      return;
    }
    baselineRicambiJson.current = JSON.stringify(hub.ricambi);
    setRicDoc(hub.ricambi);
    setStage({ kind: "ricambi" });
  }

  const hubTabPanelId = `schede-lav-hub-panel-${hubTab}`;
  const hubTabLabel = (id: HubTab) => {
    switch (id) {
      case "panoramica":
        return "Panoramica";
      case "schede":
        return `Schede (${nOk}/3)`;
      case "preventivi":
        return `Preventivi (${preventiviPerMacchina.length})`;
      case "documenti":
        return `Documenti (${documentiHubUi.length})`;
      case "attivita":
        return `Attività (${attivitaCount})`;
    }
  };
  const selectHubTab = (id: HubTab) => {
    setStage({ kind: "hub" });
    setHubTab(id);
  };

  return (
    <>
      <LavorazioniModalShell
        modalSize="formLarge"
        modalHeight={frozenDialogSize === "compact" ? "compact" : "standard"}
        modalRootRef={modalRootRef}
        onRequestClose={onClose}
        titleId="schede-lav-detail-title"
        header={
          <LavorazioniModalHeader
            title="Dettaglio lavorazione"
            subtitle={identSubtitle || undefined}
            titleId="schede-lav-detail-title"
            onRequestClose={onClose}
          />
        }
      >
        <div className={`relative ${gestionaleModalBodyFlexClass}`}>
        <HubModalTabBar aria-label="Sezioni dettaglio lavorazione">
          {(["panoramica", "schede", "preventivi", "documenti", "attivita"] as const).map((id) => (
            <HubModalTab
              key={id}
              id={`schede-lav-tab-${id}`}
              panelId={hubTab === id ? hubTabPanelId : undefined}
              label={hubTabLabel(id)}
              active={stage.kind === "hub" && hubTab === id}
              onSelect={() => selectHubTab(id)}
            />
          ))}
        </HubModalTabBar>

        <GestionaleModalScrollBody
          className="p-4"
          role={stage.kind === "hub" ? "tabpanel" : undefined}
          aria-labelledby={stage.kind === "hub" ? `schede-lav-tab-${hubTab}` : undefined}
          id={stage.kind === "hub" ? hubTabPanelId : undefined}
        >
          {stage.kind === "hub" && hubTab === "schede" ? (
            <div className="flex flex-col gap-5">
              {hubLastIngressoMatch ? (
                <CopiaUltimaSchedaIngressoBanner
                  visible
                  highlight={false}
                  updatedAt={hubLastIngressoMatch.updatedAt}
                  disabled={!canEditWorkOrders}
                  disabledTitle={READONLY_PERMISSION_HINT}
                  onCopy={duplicateIngressoPrev}
                />
              ) : null}
              <SchedaSectionHub
                title="Scheda ingresso"
                stato={statoUiSchedaIngresso(hub)}
                doc={hub.ingresso}
                canEdit={canEditWorkOrders}
                onApri={apriSchedaIngresso}
                onCrea={() => startCreate("ingresso")}
                onPdf={() => {
                  if (!hub.ingresso) return;
                  openSchedaPdfInNewTab({
                    titoloScheda: "Scheda ingresso",
                    identificazioneLine: formatIdentificazioneMezzoLine(
                      identificazionePartsFromSchedaIngresso(hub.ingresso.campi),
                    ),
                    bundle: hub,
                    doc: hub.ingresso,
                    autore: currentUser,
                  });
                }}
              />
              <SchedaSectionHub
                title="Scheda lavorazioni"
                stato={statoUiSchedaLavorazioni(hub)}
                doc={hub.lavorazioni}
                canEdit={canEditWorkOrders}
                onApri={apriSchedaLavorazioni}
                onCrea={() => startCreate("lavorazioni")}
                onPdf={() => {
                  if (!hub.lavorazioni) return;
                  openSchedaPdfInNewTab({
                    titoloScheda: "Scheda lavorazioni",
                    identificazioneLine: identSubtitle,
                    bundle: hub,
                    doc: hub.lavorazioni,
                    autore: currentUser,
                  });
                }}
                onElimina={hub.lavorazioni ? () => requestDeleteSchedaTipo("lavorazioni") : undefined}
              />
              <SchedaSectionHub
                title="Scheda ricambi utilizzati"
                stato={statoUiSchedaRicambi(hub)}
                doc={hub.ricambi}
                canEdit={canEditWorkOrders}
                onApri={apriSchedaRicambi}
                onCrea={() => startCreate("ricambi")}
                onPdf={() => {
                  if (!hub.ricambi) return;
                  openSchedaPdfInNewTab({
                    titoloScheda: "Scheda ricambi utilizzati",
                    identificazioneLine: identSubtitle,
                    bundle: hub,
                    doc: hub.ricambi,
                    autore: currentUser,
                  });
                }}
                onElimina={hub.ricambi ? () => requestDeleteSchedaTipo("ricambi") : undefined}
              />
              <CreaPreventivoDaSchedeCta
                onClick={generaPreventivoDaHub}
                disabled={!canEditWorkOrders}
                disabledTitle={READONLY_PERMISSION_HINT}
              />
            </div>
          ) : null}

          {stage.kind === "hub" && hubTab === "panoramica" ? (
            <HubModalPanoramicaPanel>
              {hubQuery.isError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
                  {hubQuery.error?.message ?? "Errore caricamento dettaglio lavorazione."}
                </p>
              ) : null}
              {hubQuery.isLoading && !hubData ? (
                <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento dettaglio…</p>
              ) : null}
              <GestionaleInfoCard title="Note operative">
                <HubModalPanoramicaNoteEditor
                  value={panoramicaNoteValue}
                  canEdit={canEditWorkOrders}
                  saving={panoramicaNoteSaving}
                  onSave={async (note) => {
                    await commitPanoramicaNote(note);
                  }}
                />
              </GestionaleInfoCard>
              <GestionaleInfoCard
                title="Anagrafica intervento"
                actions={
                  hub.ingresso ? (
                    <button
                      type="button"
                      className={dsTableActionTextBtnPrimary}
                      disabled={!canEditWorkOrders}
                      title={!canEditWorkOrders ? READONLY_PERMISSION_HINT : "Modifica scheda ingresso"}
                      aria-label="Modifica scheda ingresso"
                      onClick={apriSchedaIngresso}
                    >
                      <IconBtnEdit />
                      Modifica
                    </button>
                  ) : null
                }
              >
                <SchedaIngressoPanoramicaAnagraficaContent fields={panoramicaDisplayFields} />
              </GestionaleInfoCard>
              <LavorazioneCostoDiscreto costo={costoLavorazione} variant="section" />
              {canDeleteLavorazione && onDeleteLavorazione ? (
                <GestionaleInfoCard
                  compact
                  title="Elimina lavorazione"
                  subtitle="Operazione irreversibile: rimuove la lavorazione e i dati collegati."
                  actions={
                    <button
                      type="button"
                      className={dsTableActionTextBtnDanger}
                      disabled={deleteLavorazionePending}
                      title="Elimina lavorazione"
                      onClick={onDeleteLavorazione}
                    >
                      <HubIconTrash />
                      Elimina
                    </button>
                  }
                />
              ) : null}
            </HubModalPanoramicaPanel>
          ) : null}

          {stage.kind === "hub" && hubTab === "preventivi" ? (
            <div className="flex flex-col gap-5">
              <section className={dsGestionaleInfoCardCompact}>
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="min-w-0 flex-1">
                    <h3 className={dsGestionaleInfoCardTitle}>Preventivi</h3>
                    <p className="mt-1 text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
                      {preventiviCollegati.length > 0
                        ? `${preventiviCollegati.length} collegati a questa lavorazione · `
                        : "Nessuno collegato a questa lavorazione · "}
                      {preventiviPerMacchina.length}{" "}
                      {preventiviPerMacchina.length === 1 ? "preventivo sul mezzo" : "preventivi sul mezzo"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    <button
                      type="button"
                      className={dsTableActionTextBtnPrimary}
                      disabled={!canEditWorkOrders}
                      title={!canEditWorkOrders ? READONLY_PERMISSION_HINT : "Crea preventivo da schede lavorazione"}
                      onClick={generaPreventivoDaHub}
                    >
                      <IconBtnPreventivo className="h-3.5 w-3.5 shrink-0" />
                      Crea
                    </button>
                    <Link
                      href={buildPreventiviArchivioFilterHref(lav.id, lavOrigine)}
                      className={dsTableActionTextBtn}
                      title="Apri archivio preventivi filtrato per questa lavorazione"
                    >
                      Archivio
                    </Link>
                  </div>
                </div>
              </section>
              <GestionaleInfoCard title="Storico mezzo">
                <p className="mb-3 text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
                  Preventivi con gli stessi identificativi del mezzo (targa, matricola o scuderia).
                </p>
                <LavorazionePreventiviHubList
                  rows={preventiviPerMacchina}
                  lavorazioneId={lav.id}
                  onApriNeiPreventivi={apriPreventivoNeiPreventivi}
                  onCreaPreventivo={canEditWorkOrders ? generaPreventivoDaHub : undefined}
                />
              </GestionaleInfoCard>
            </div>
          ) : null}

          {stage.kind === "hub" && hubTab === "attivita" ? (
            <LavorazioneAttivitaPanel feedInput={attivitaFeedInput} />
          ) : null}

          {stage.kind === "hub" && hubTab === "documenti" ? (
            <div className="flex flex-col gap-5">
              {canEditWorkOrders ? (
                <p className="text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
                  Trascina PDF o foto sulle rispettive card per caricarle.
                </p>
              ) : null}
              <LavorazioneMediaPanel
                variant="hub"
                lavorazioneId={lav.id}
                canEdit={canEditWorkOrders}
                onImageEvent={() => void hubQuery.refetch()}
                onDocumentEvent={() => void hubQuery.refetch()}
              />
              <GestionaleInfoCard title="Archivio mezzo">
                <p className="mb-3 text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
                  Documenti generici associati al mezzo in anagrafica.
                </p>
                {documentiHubUi.length === 0 ? (
                  <div className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-3 py-4 text-center">
                    <p className="text-sm font-medium text-[color:var(--cab-text)]">Nessun documento in archivio</p>
                    <p className="mt-1 text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
                      I documenti del mezzo collegato compariranno qui.
                    </p>
                  </div>
                ) : (
                  <ul className="min-w-0 divide-y divide-[color:var(--cab-border)]">
                    {documentiHubUi.map((d) => {
                      const canOpen = canOpenDocumento(d);
                      return (
                        <li
                          key={d.id}
                          className="flex min-w-0 items-start justify-between gap-2.5 py-2.5 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className={dsHubModalFieldLabel}>{formatDocumentoRigaSintetica(d)}</p>
                            <p className="mt-0.5 truncate text-sm font-medium text-[color:var(--cab-text)]">{d.nome}</p>
                          </div>
                          {canOpen ? (
                            <button
                              type="button"
                              className={dsTableActionTextBtn}
                              title="Apri documento"
                              onClick={() => void openDocumentoFile(d)}
                            >
                              <HubIconOpen />
                              Apri
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </GestionaleInfoCard>
            </div>
          ) : null}

          {stage.kind === "lavorazioni" && hub.lavorazioni && lavDoc ? (
            <LavorazioniPanel
              doc={lavDoc}
              setDoc={setLavDoc}
              addettiLista={addetti}
              onBack={tryLavorazioniBack}
              onDelete={() => requestDeleteSchedaTipo("lavorazioni")}
              onSave={() => {
                void commitLavorazioniSave().then((ok) => {
                  if (!ok) return;
                  setStage({ kind: "hub" });
                  setLavDoc(null);
                });
              }}
            />
          ) : null}

          {stage.kind === "ricambi" && hub.ricambi && ricDoc ? (
            <RicambiPanel
              doc={ricDoc}
              setDoc={setRicDoc}
              lav={lav}
              identLine={identSubtitle}
              currentUser={currentUser}
              addettiLista={addetti}
              onBack={tryRicambiBack}
              onDelete={() => requestDeleteSchedaTipo("ricambi")}
              onImmediatePersist={(d) => persist({ ...draftRef.current, ricambi: d })}
              onSave={() => {
                void commitRicambiSave().then((ok) => {
                  if (!ok) return;
                  setStage({ kind: "hub" });
                  setRicDoc(null);
                });
              }}
            />
          ) : null}
        </GestionaleModalScrollBody>

        <GestionaleUnsavedChangesDialog
          open={unsavedPanel != null}
          placement="nested"
          message="Hai modifiche non salvate. Vuoi uscire senza salvare?"
          onStay={() => setUnsavedPanel(null)}
          onDiscard={() => {
            const p = unsavedPanel;
            setUnsavedPanel(null);
            setStage({ kind: "hub" });
            if (p === "ingresso") closeIngressoEditor();
            if (p === "lav") setLavDoc(null);
            if (p === "ric") setRicDoc(null);
          }}
          onSaveAndExit={() => {
            const p = unsavedPanel;
            void (async () => {
              if (p === "ingresso") {
                if (!(await commitIngressoSave())) return;
                closeIngressoEditor();
              } else if (p === "lav") {
                if (!(await commitLavorazioniSave())) return;
                setLavDoc(null);
              } else if (p === "ric") {
                if (!(await commitRicambiSave())) return;
                setRicDoc(null);
              }
              setUnsavedPanel(null);
              setStage({ kind: "hub" });
            })();
          }}
        />
        </div>
      </LavorazioniModalShell>

      {ingressoFormOpen && ingressoEditorInitial && hub.ingresso ? (
        <SchedaIngressoEditModal
          open={ingressoFormOpen}
          initialFields={ingressoEditorInitial}
          onRequestClose={tryIngressoBack}
          onSave={(draft) => {
            ingressoDraftRef.current = draft;
            void commitIngressoSave().then((ok) => {
              if (!ok) return;
              closeIngressoEditor();
            });
          }}
          onDelete={
            hub.ingresso.sorgente !== "file_esterno" ? () => requestDeleteSchedaTipo("ingresso") : undefined
          }
          readOnly={hub.ingresso.sorgente === "file_esterno"}
          canEdit={canEditWorkOrders}
          updatedBy={hub.ingresso.updatedBy}
          mezzi={mezzi}
          schedeStore={schedeStore}
          attive={attive}
          storico={storico}
          excludeLavorazioneId={lav.id}
        />
      ) : null}

      <SchedaEliminaConfirmDialog
        open={eliminaConfirmTipo != null}
        tipo={eliminaConfirmTipo}
        onCancel={() => setEliminaConfirmTipo(null)}
        onConfirm={confirmDeleteSchedaTipo}
      />
      {confirmDialog}
    </>
  );
}

function IconBtnPlus({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IconBtnEdit({ className = "h-3.5 w-3.5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

/** Documento con righe — allineato alle icone PDF/Modifica del hub. */
function IconBtnPreventivo({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function SchedaSectionHub({
  title,
  stato,
  doc,
  canEdit = true,
  onApri,
  onCrea,
  onPdf,
  onElimina,
}: {
  title: string;
  stato: ReturnType<typeof statoUiSchedaIngresso>;
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc | null;
  canEdit?: boolean;
  onApri: () => void;
  onCrea: () => void;
  onPdf: () => void;
  onElimina?: () => void;
}) {
  return (
    <section className={dsGestionaleInfoCardCompact}>
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <h3 className={dsGestionaleInfoCardTitle}>{title}</h3>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <SchedaStatoBadge stato={stato} />
            {doc?.sorgente === "file_esterno" ? <FileEsternoBadge /> : null}
            {doc ? (
              <span className="text-[10px] leading-snug text-[color:var(--cab-text-muted)]">
                Agg. {fmtItShort(doc.updatedAt)} · {doc.updatedBy}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {!doc ? (
            <button
              type="button"
              className={dsTableActionTextBtnPrimary}
              disabled={!canEdit}
              title={!canEdit ? READONLY_PERMISSION_HINT : undefined}
              onClick={onCrea}
            >
              <IconBtnPlus className="h-3.5 w-3.5 shrink-0" />
              Crea nuova
            </button>
          ) : (
            <>
              {onElimina ? (
                <button
                  type="button"
                  className={dsTableActionTextBtnDanger}
                  disabled={!canEdit}
                  title={!canEdit ? READONLY_PERMISSION_HINT : "Elimina scheda"}
                  aria-label="Elimina scheda"
                  onClick={onElimina}
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span className="max-md:sr-only">Elimina</span>
                </button>
              ) : null}
              <button
                type="button"
                className={dsTableActionTextBtn}
                disabled={!doc}
                title="Esporta PDF"
                aria-label="Esporta PDF scheda"
                onClick={onPdf}
              >
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                PDF
              </button>
              <button
                type="button"
                className={dsTableActionTextBtnPrimary}
                disabled={!canEdit}
                title={!canEdit ? READONLY_PERMISSION_HINT : "Modifica scheda"}
                aria-label="Modifica scheda"
                onClick={onApri}
              >
                <IconBtnEdit />
                Modifica
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SchedaDayField({
  label,
  value,
  onChange,
  readOnly,
  showLabel = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  showLabel?: boolean;
}) {
  if (readOnly) {
    return (
      <label className="block text-xs">
        {showLabel ? <span className={dsLabel}>{label}</span> : null}
        <input className={`${dsInput} mt-1`} readOnly value={value} />
      </label>
    );
  }
  return (
    <div className="block text-xs">
      {showLabel ? <span className={dsLabel}>{label}</span> : null}
      <div className={`flex flex-nowrap items-stretch gap-2 sm:flex-wrap ${showLabel ? "mt-1" : ""}`}>
        <div className="min-w-0 flex-1">
          <GlobalDatePicker
            value={value}
            onChange={onChange}
            inputClassName={`${dsInput} !py-1.5 !text-xs`}
            placeholder="GG/MM/AAAA"
            aria-label={label}
          />
        </div>
        <button type="button" className={`${dsBtnNeutral} shrink-0 self-end`} onClick={() => onChange(todayItDate())}>
          Oggi
        </button>
      </div>
    </div>
  );
}

function SchedaEditorBottomSave({ readOnly, onSave }: { readOnly: boolean; onSave: () => void }) {
  if (readOnly) return null;
  return (
    <div className="flex justify-end border-t border-[color:var(--cab-border)] pt-3">
      <button type="button" className={dsBtnPrimary} onClick={onSave}>
        Salva scheda
      </button>
    </div>
  );
}

function LavorazioniPanel({
  doc,
  setDoc,
  addettiLista,
  onBack,
  onDelete,
  onSave,
}: {
  doc: SchedaLavorazioniDoc;
  setDoc: (d: SchedaLavorazioniDoc) => void;
  addettiLista: string[];
  onBack: () => void;
  onDelete: () => void;
  onSave: () => void;
}) {
  const { confirm: askConfirm, confirmDialog: lavorazioniConfirmDialog } = useGestionaleConfirm();
  const ro = doc.sorgente === "file_esterno";
  function patchRighe(righe: RigaLavorazioneScheda[]) {
    setDoc({ ...doc, campi: { ...doc.campi, righe } });
  }
  function patchRiga(rid: string, fn: (r: RigaLavorazioneScheda) => RigaLavorazioneScheda) {
    patchRighe(doc.campi.righe.map((x) => (x.id === rid ? fn(x) : x)));
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-nowrap justify-between gap-2 sm:flex-wrap">
        <button type="button" className={dsBtnNeutral} onClick={onBack}>
          ← Indietro
        </button>
        <div className="flex flex-nowrap items-center gap-2 sm:flex-wrap">
          {doc.sorgente !== "file_esterno" ? (
            <button type="button" className={dsBtnDanger} onClick={onDelete}>
              Elimina scheda
            </button>
          ) : null}
          {!ro ? (
            <button type="button" className={dsBtnPrimary} onClick={onSave}>
              Salva scheda
            </button>
          ) : null}
        </div>
      </div>
      <label className="block text-xs">
        <span className={dsLabel}>Identificazione macchina</span>
        <input
          className={`${dsInput} mt-1`}
          readOnly={ro}
          value={doc.campi.identificazioneMacchina}
          onChange={(e) => setDoc({ ...doc, campi: { ...doc.campi, identificazioneMacchina: e.target.value } })}
        />
      </label>
      <div className={`${dsTableWrap} ${dsScrollbar}`}>
        <table className={`${dsTable} text-xs`}>
          <GlobalTableHead>
              <GlobalTableHeadLabel label="Data" />
              <GlobalTableHeadLabel label="Lavorazioni effettuate" thClassName="min-w-[min(100%,28rem)] w-full" />
              <GlobalTableHeadLabel label="Addetti (ore)" thClassName="min-w-[12rem]" />
              {!ro ? <GlobalTableHeadLabel label="" thClassName="w-24" /> : null}
          </GlobalTableHead>
          <tbody>
            {doc.campi.righe.map((r) => (
              <tr key={r.id} className={dsTableRow}>
                <td className="px-2 py-2 align-top">
                  {ro ? (
                    <span className="text-[color:var(--cab-text)]">{r.dataLavorazione}</span>
                  ) : (
                    <SchedaDayField
                      label="Data"
                      showLabel={false}
                      value={r.dataLavorazione}
                      onChange={(v) => patchRiga(r.id, (row) => ({ ...row, dataLavorazione: v }))}
                    />
                  )}
                </td>
                <td className="px-2 py-2 align-top">
                  <GestionaleTextarea
                    className="!py-2 !text-sm w-full max-w-none leading-relaxed"
                    size="sm"
                    maxHeight={gestionaleTextareaMaxHeightCompact}
                    readOnly={ro}
                    value={r.lavorazioniEffettuate}
                    onChange={(v) => patchRiga(r.id, (row) => ({ ...row, lavorazioniEffettuate: v }))}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  {ro ? (
                    <div className="space-y-0.5 text-[color:var(--cab-text)]">
                      {(r.addettiAssegnati ?? []).length ? (
                        r.addettiAssegnati!.map((a, i) => (
                          <div key={i}>
                            {a.addetto || "—"} — {a.oreImpiegate}h
                          </div>
                        ))
                      ) : (
                        <span className="text-[color:var(--cab-text-muted)]">—</span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(r.addettiAssegnati ?? []).map((a, idx) => (
                        <div key={`${r.id}-a-${idx}`} className="flex flex-nowrap items-end gap-1 sm:flex-wrap">
                          <div className="min-w-0 flex-1">
                            <GlobalSettingsListSelect
                              listKey="lavorazioni:addetti"
                              className="w-full"
                              inputClassName={`${dsInput} !py-1.5 !text-xs`}
                              value={a.addetto}
                              onChange={(v) => {
                                const next = [...(r.addettiAssegnati ?? [])];
                                next[idx] = { ...next[idx]!, addetto: v };
                                patchRiga(r.id, (row) => ({ ...row, addettiAssegnati: next }));
                              }}
                              placeholder="Seleziona addetto…"
                              aria-label="Addetto riga lavorazione"
                            />
                          </div>
                          <SchedaOreNumberInput
                            className={`${dsInput} !py-1.5 !text-xs w-20`}
                            value={Number.isFinite(a.oreImpiegate) ? a.oreImpiegate : 0}
                            onChange={(v) => {
                              const next = [...(r.addettiAssegnati ?? [])];
                              next[idx] = { ...next[idx]!, oreImpiegate: v };
                              patchRiga(r.id, (row) => ({ ...row, addettiAssegnati: next }));
                            }}
                          />
                          <Tooltip content="Rimuovi">
                            <button
                              type="button"
                              className="shrink-0 rounded p-1 text-sm text-[color:var(--cab-text-muted)] transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                              aria-label="Rimuovi addetto"
                              onClick={() => {
                                void askConfirm({
                                  title: "Rimuovere addetto?",
                                  message: "L'addetto verrà rimosso dalla riga.",
                                  destructive: true,
                                  confirmLabel: "Rimuovi",
                                }).then((ok) => {
                                  if (!ok) return;
                                  const next = (r.addettiAssegnati ?? []).filter((_, j) => j !== idx);
                                  patchRiga(r.id, (row) => ({ ...row, addettiAssegnati: next }));
                                });
                              }}
                            >
                              ✕
                            </button>
                          </Tooltip>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={`${dsBtnNeutral} text-[10px] px-2 py-1`}
                        onClick={() =>
                          patchRiga(r.id, (row) => ({
                            ...row,
                            addettiAssegnati: [...(row.addettiAssegnati ?? []), { addetto: "", oreImpiegate: 0 }],
                          }))
                        }
                      >
                        + Aggiungi addetto
                      </button>
                    </div>
                  )}
                </td>
                {!ro ? (
                  <td className="px-2 py-2 align-top">
                    <Tooltip content="Rimuovi">
                      <button
                        type="button"
                        className="rounded p-1.5 text-sm text-[color:var(--cab-text-muted)] transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                        aria-label="Rimuovi riga lavorazione"
                        onClick={() => {
                          void askConfirm({
                            title: "Eliminare riga?",
                            message: "La riga verrà rimossa dalla scheda.",
                            destructive: true,
                            confirmLabel: "Elimina",
                          }).then((ok) => {
                            if (!ok) return;
                            patchRighe(doc.campi.righe.filter((x) => x.id !== r.id));
                          });
                        }}
                    >
                      ✕
                    </button>
                    </Tooltip>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!ro ? (
        <button
          type="button"
          className={dsBtnNeutral}
          onClick={() =>
            patchRighe([
              ...doc.campi.righe,
              {
                id: newRigaId(),
                dataLavorazione: todayItDate(),
                lavorazioniEffettuate: "",
                addettiAssegnati: [],
              },
            ])
          }
        >
          + Aggiungi riga lavorazione
        </button>
      ) : null}
      <SchedaEditorBottomSave readOnly={ro} onSave={onSave} />
      {lavorazioniConfirmDialog}
    </div>
  );
}

function RicambiPanel({
  doc,
  setDoc,
  lav,
  identLine,
  currentUser,
  addettiLista,
  onBack,
  onSave,
  onImmediatePersist,
  onDelete,
}: {
  doc: SchedaRicambiDoc;
  setDoc: (d: SchedaRicambiDoc) => void;
  lav: LavRow;
  identLine: string;
  currentUser: string;
  addettiLista: string[];
  onBack: () => void;
  onSave: () => void;
  onImmediatePersist: (d: SchedaRicambiDoc) => void;
  onDelete: () => void;
}) {
  const gestToast = useGestionaleToast();
  const { confirm: askConfirm, confirmDialog: ricambiConfirmDialog } = useGestionaleConfirm();
  const ro = doc.sorgente === "file_esterno";
  const qc = useQueryClient();
  const magazzinoQ = useMagazzinoRicambiUIQuery();
  const prodotti = magazzinoQ.data ?? [];
  const [acRowId, setAcRowId] = useState<string | null>(null);
  const [magSearch, setMagSearch] = useState("");
  const [magSearchOpen, setMagSearchOpen] = useState(false);

  const magSearchHits = useMemo(() => {
    const q = magSearch.trim().toLowerCase();
    if (q.length < 1) return [];
    return prodotti
      .filter((p) => {
        const d = (p.descrizione ?? "").toLowerCase();
        const c = [p.codiceFornitoreOriginale, p.codiceFornitoreOriginaleSecondario]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return d.includes(q) || c.includes(q) || q.split(/\s+/).every((w) => w && (d.includes(w) || c.includes(w)));
      })
      .slice(0, 16);
  }, [magSearch, prodotti]);

  useEffect(() => {
    if (!magSearchOpen) return;
    function onDoc(ev: MouseEvent) {
      const t = ev.target;
      if (t instanceof Element && t.closest("[data-ricambi-mag-search='1']")) return;
      setMagSearchOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [magSearchOpen]);

  function addRicambioFromMag(p: RicambioMagazzino) {
    if (doc.campi.righe.some((r) => r.ricambioId === p.id)) {
      gestToast.validation("Ricambio già presente in scheda.");
      return;
    }
    patchRighe([
      ...doc.campi.righe,
      {
        id: newRigaId(),
        ricambioId: p.id,
        ricambioNome: p.descrizione ?? "",
        codice: p.codiceFornitoreOriginale ?? "",
        quantita: 1,
        addetto: lav.addetto,
        dataUtilizzo: todayItDate(),
      },
    ]);
    setMagSearch("");
    setMagSearchOpen(false);
  }

  useEffect(() => {
    if (!acRowId) return;
    function onDoc(ev: MouseEvent) {
      const t = ev.target;
      if (t instanceof Element && t.closest("tr[data-ricambi-ac-open='1']")) return;
      setAcRowId(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [acRowId]);

  function patchRighe(righe: RigaRicambioScheda[]) {
    setDoc({ ...doc, campi: { ...doc.campi, righe } });
  }

  function suggestionsForRow(r: RigaRicambioScheda) {
    const q = `${r.ricambioNome} ${r.codice}`.trim().toLowerCase();
    if (q.length < 1) return [];
    return prodotti
      .filter((p) => {
        const d = (p.descrizione ?? "").toLowerCase();
        const c = [p.codiceFornitoreOriginale, p.codiceFornitoreOriginaleSecondario]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const m = (p.marca ?? "").toLowerCase();
        return d.includes(q) || c.includes(q) || m.includes(q) || q.split(/\s+/).every((w) => w && (d.includes(w) || c.includes(w) || m.includes(w)));
      })
      .slice(0, 12);
  }

  async function applyRowMagazzino(r: RigaRicambioScheda) {
    if (!r.ricambioId) {
      gestToast.validation("Seleziona un ricambio dall'anagrafica magazzino o dai suggerimenti.");
      return;
    }
    if (r.scaricoMagazzinoApplicato) {
      gestToast.validation("Scarico già effettuato per questa riga.");
      return;
    }
    const ok = await askConfirm({
      title: "Confermare scarico magazzino?",
      message: `Scarico di ${r.quantita} pz. per ${r.ricambioNome}.`,
      confirmLabel: "Conferma scarico",
    });
    if (!ok) return;
    try {
      const res = await applyMagazzinoScaricoDaScheda({
        ricambioId: r.ricambioId!,
        lavorazioneId: lav.id,
        quantita: r.quantita,
        autore: currentUser,
        riepilogo: `Scheda ricambi · ${identLine}`,
        qc,
      });
      if (!res.ok) {
        gestToast.error(res.error, { module: "magazzino" });
        return;
      }
      const righe = doc.campi.righe.map((x) => (x.id === r.id ? { ...x, scaricoMagazzinoApplicato: true } : x));
      const now = new Date().toISOString();
      const u = currentUser.trim() || "Operatore";
      const nextDoc: SchedaRicambiDoc = {
        ...doc,
        campi: { ...doc.campi, righe },
        updatedAt: now,
        updatedBy: u,
      };
      setDoc(nextDoc);
      onImmediatePersist(nextDoc);
      gestToast.successOnce("scheda-scarico", GESTIONALE_TOAST.successDone);
    } catch (e) {
      gestToast.errorOnce("scheda-scarico", e, { module: "magazzino" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-nowrap justify-between gap-2 sm:flex-wrap">
        <button type="button" className={dsBtnNeutral} onClick={onBack}>
          ← Indietro
        </button>
        <div className="flex flex-nowrap items-center gap-2 sm:flex-wrap">
          {doc.sorgente !== "file_esterno" ? (
            <button type="button" className={dsBtnDanger} onClick={onDelete}>
              Elimina scheda
            </button>
          ) : null}
          {!ro ? (
            <button type="button" className={dsBtnPrimary} onClick={onSave}>
              Salva scheda
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-[color:var(--cab-text-muted)]">
        Identificazione:{" "}
        <span className="font-medium text-[color:var(--cab-text)]">{identLine}</span>
      </p>
      {!ro ? (
        <div className="relative max-w-xl max-md:overflow-visible" data-ricambi-mag-search="1">
          <GestionaleSearchField
            wrapperClassName="w-full"
            placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
            value={magSearch}
            onChange={(e) => {
              setMagSearch(e.target.value);
              setMagSearchOpen(true);
            }}
            onFocus={() => setMagSearchOpen(true)}
            autoComplete="off"
            aria-label="Cerca ricambio in magazzino per nome o codice"
          />
          {magSearchOpen && magSearch.trim() && magSearchHits.length > 0 ? (
            <ul data-cab-ios-no-focus-scroll className="absolute left-0 right-0 top-full z-[90] mt-1 max-h-52 overflow-y-auto rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] py-1 text-[11px] shadow-lg">
              {magSearchHits.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col px-3 py-2 text-left hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] dark:hover:bg-orange-950/30"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addRicambioFromMag(p)}
                  >
                    <span className="font-medium text-[color:var(--cab-text)]">{p.descrizione || "—"}</span>
                    <span className="text-[color:var(--cab-text-muted)]">
                      {p.codiceFornitoreOriginale || "—"} · {p.marca || "—"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : magSearchOpen && magSearch.trim().length >= 1 && magSearchHits.length === 0 ? (
            <p className="absolute left-0 right-0 top-full z-[90] mt-1 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2 text-[11px] text-[color:var(--cab-text-muted)] shadow-lg">
              Nessun ricambio trovato.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className={`${dsTableWrap} ${dsScrollbar}`}>
        <table className={`${dsTable} text-xs`}>
          <GlobalTableHead>
              <GlobalTableHeadLabel label="Ricambio" thClassName="min-w-[10rem]" />
              <GlobalTableHeadLabel label="Codice" />
              <GlobalTableHeadLabel label="Qtà" />
              <GlobalTableHeadLabel label="Addetto" />
              <GlobalTableHeadLabel label="Data" />
              {!ro ? <GlobalTableHeadLabel label="Magazzino" /> : null}
              {!ro ? <GlobalTableHeadLabel label="" thClassName="w-24" /> : null}
          </GlobalTableHead>
          <tbody>
            {doc.campi.righe.map((r) => {
              const sug = !ro && acRowId === r.id ? suggestionsForRow(r) : [];
              return (
                <tr key={r.id} className={dsTableRow} data-ricambi-ac-open={acRowId === r.id ? "1" : undefined}>
                  <td className="px-2 py-2 align-top">
                    {ro ? (
                      <span>{r.ricambioNome || "—"}</span>
                    ) : (
                      <div className="relative max-md:overflow-visible">
                        <input
                          className={`${dsInput} !py-1.5 !text-xs`}
                          value={r.ricambioNome}
                          onChange={(e) => {
                            const v = e.target.value;
                            patchRighe(doc.campi.righe.map((x) => (x.id === r.id ? { ...x, ricambioNome: v } : x)));
                            setAcRowId(r.id);
                          }}
                          onFocus={() => setAcRowId(r.id)}
                          placeholder="Nome / descrizione"
                        />
                        {sug.length > 0 ? (
                          <ul data-cab-ios-no-focus-scroll className="absolute left-0 top-full z-[80] mt-0.5 max-h-48 min-w-full overflow-y-auto rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] py-1 text-[11px] shadow-lg">
                            {sug.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  className="flex w-full flex-col px-2 py-1.5 text-left hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    patchRighe(
                                      doc.campi.righe.map((x) =>
                                        x.id === r.id
                                          ? {
                                              ...x,
                                              ricambioId: p.id,
                                              ricambioNome: p.descrizione ?? "",
                                              codice: p.codiceFornitoreOriginale ?? "",
                                            }
                                          : x,
                                      ),
                                    );
                                    setAcRowId(null);
                                  }}
                                >
                                  <span className="font-medium text-[color:var(--cab-text)]">{p.descrizione}</span>
                                  <span className="text-[color:var(--cab-text-muted)]">
                                    {p.marca} · {p.codiceFornitoreOriginale}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      className={`${dsInput} !py-1.5 !text-xs`}
                      readOnly={ro}
                      value={r.codice}
                      onChange={(e) => {
                        const v = e.target.value;
                        patchRighe(doc.campi.righe.map((x) => (x.id === r.id ? { ...x, codice: v } : x)));
                        if (!ro) setAcRowId(r.id);
                      }}
                      onFocus={() => !ro && setAcRowId(r.id)}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="number"
                      min={1}
                      className={`${dsInput} !py-1.5 !text-xs w-20`}
                      readOnly={ro}
                      value={r.quantita}
                      onChange={(e) =>
                        patchRighe(
                          doc.campi.righe.map((x) =>
                            x.id === r.id ? { ...x, quantita: Math.max(1, Math.round(Number(e.target.value) || 1)) } : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    {ro ? (
                      <span>{r.addetto}</span>
                    ) : (
                      <GlobalSettingsListSelect
                        listKey="lavorazioni:addetti"
                        className="w-full min-w-[8rem]"
                        inputClassName={`${dsInput} !py-1.5 !text-xs`}
                        value={r.addetto}
                        onChange={(v) => patchRighe(doc.campi.righe.map((x) => (x.id === r.id ? { ...x, addetto: v } : x)))}
                        placeholder="Addetto…"
                        aria-label="Addetto riga ricambio"
                      />
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {ro ? (
                      <span>{r.dataUtilizzo}</span>
                    ) : (
                      <SchedaDayField
                        label="Data"
                        showLabel={false}
                        value={r.dataUtilizzo}
                        onChange={(v) => patchRighe(doc.campi.righe.map((x) => (x.id === r.id ? { ...x, dataUtilizzo: v } : x)))}
                      />
                    )}
                  </td>
                  {!ro ? (
                    <td className="px-2 py-2 align-top">
                      <div className="flex flex-col items-start gap-1.5">
                        <button
                          type="button"
                          className={dsBtnNeutral}
                          disabled={!r.ricambioId || Boolean(r.scaricoMagazzinoApplicato)}
                          onClick={() => applyRowMagazzino(r)}
                        >
                          Scarica
                        </button>
                        {r.scaricoMagazzinoApplicato ? <span className={dsBadgeOk}>Scaricato</span> : null}
                      </div>
                    </td>
                  ) : null}
                  {!ro ? (
                    <td className="px-2 py-2 align-top">
                      <Tooltip content="Rimuovi">
                        <button
                          type="button"
                          className="rounded p-1.5 text-sm text-[color:var(--cab-text-muted)] transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                          aria-label="Rimuovi riga ricambio"
                          onClick={() => {
                            void askConfirm({
                              title: "Eliminare riga?",
                              message: "La riga verrà rimossa dalla scheda.",
                              destructive: true,
                              confirmLabel: "Elimina",
                            }).then((ok) => {
                              if (!ok) return;
                              patchRighe(doc.campi.righe.filter((x) => x.id !== r.id));
                            });
                          }}
                        >
                          ✕
                        </button>
                      </Tooltip>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!ro ? (
        <button
          type="button"
          className={dsBtnNeutral}
          onClick={() =>
            patchRighe([
              ...doc.campi.righe,
              {
                id: newRigaId(),
                ricambioId: null,
                ricambioNome: "",
                codice: "",
                quantita: 1,
                addetto: lav.addetto,
                dataUtilizzo: todayItDate(),
              },
            ])
          }
        >
          + Aggiungi riga ricambio
        </button>
      ) : null}
      <SchedaEditorBottomSave readOnly={ro} onSave={onSave} />
      {ricambiConfirmDialog}
    </div>
  );
}
