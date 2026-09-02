"use client";

import { OptionalTooltip, Tooltip } from "@/components/ui";
import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { flushSync } from "react-dom";
import { runButtonSubmit, useSubmitLock } from "@/lib/forms/form-engine";
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
  GestionaleModalFooterActions,
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterDeleteButton,
  GestionaleModalFooterSaveButton,
  LoadingFormSkeleton,
} from "@/components/design-system";
import {
  LavorazioniModalHeader,
  LavorazioniModalShell,
  type LavorazioniModalDialogSize,
} from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { SchedaIngressoEditModal } from "@/components/gestionale/lavorazioni/lavorazione-create-modal";
import { SchedaEliminaConfirmDialog } from "@/components/gestionale/lavorazioni/scheda-elimina-confirm-dialog";
import { normalizeSchedaIngressoFields } from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import { CaptureMultiSchedaNotice } from "@/components/document-capture/capture-multi-scheda-notice";
import { LavorazioneCostoDiscreto } from "@/components/gestionale/lavorazioni/lavorazione-costo-discreto";
import { LavorazioneMediaPanel } from "@/components/gestionale/media/lavorazione-media-panel";
import { useInterventoContext } from "@/src/hooks/gestionale/use-intervento-context";
import { useLavorazioneCosto } from "@/src/hooks/gestionale/use-lavorazione-costo";
import { useLavorazioneUpdateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import { FileEsternoBadge, SchedaStatoBadge } from "@/components/lavorazioni/schede/schede-badges";
import { SchedaLavorazioniFormBody } from "@/components/lavorazioni/schede/scheda-lavorazioni-form-body";
import { SchedaRicambiFormBody } from "@/components/lavorazioni/schede/scheda-ricambi-form-body";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import { registerPwaUpdateGuard } from "@/lib/pwa/pwa-update-guard";
import { applyMagazzinoScaricoDaScheda } from "@/lib/magazzino/apply-scarico-da-scheda";
import { useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { documentoRowToGestionale } from "@/lib/mezzi/mezzi-db-ui-adapter";
import {
  formatIdentificazioneMezzoLine,
  formatLavorazioneDetailHeaderSubtitle,

  identificazionePartsFromInterventoDisplay,
  identificazionePartsFromSchedaIngresso,
  type MezzoIdentificazioneParts,
} from "@/lib/mezzi/identificazione-mezzo";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  diffSchedaIngressoCampi,
  diffSchedaLavorazioniDoc,
  diffSchedaRicambiDoc,
  SCHEDA_INGRESSO_LABEL,
  SCHEDA_LAVORAZIONI_LABEL,
  SCHEDA_RICAMBI_LABEL,
} from "@/lib/schede/schede-log-helpers";
import { mergeSchedaIngressoWithMezzoPriority } from "@/lib/schede/merge-scheda-ingresso-with-mezzo-priority";
import {
  buildSchedaIngressoFieldsFromContext,
  buildSchedaLavorazioniFieldsFromContext,
  buildSchedaRicambiFieldsFromContext,
  resolveMezzoForLavorazioneEdit,
} from "@/lib/schede/schede-autofill";
import type {
  IngressoSaveCommitInput,
  IngressoSaveCommitResult,
  IngressoSaveResult,
} from "@/lib/schede/scheda-ingresso-save-pipeline";
import {
  logIngressoSavePipeline,
  logIngressoSaveStageEnd,
  logIngressoSaveStageStart,
  reportInvalidateFailure,
} from "@/lib/schede/scheda-ingresso-save-pipeline-log";
import { resolveDataIngressoWriteValue } from "@/lib/lavorazioni/data-ingresso-patch";
import { assertIngressoSaveGenerationCurrent } from "@/lib/schede/ingresso-save-generation";
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
import { LavorazionePreventiviHubList, CreaPreventivoButton } from "@/components/lavorazioni/schede/lavorazione-preventivi-hub-list";
import { PreventivoEsistenteConfirmDialog } from "@/components/lavorazioni/schede/preventivo-esistente-confirm-dialog";
import {
  buildPreventiviArchivioFilterHref,
  buildPreventiviOpenHrefForRecord,
} from "@/lib/preventivi/preventivi-lavorazione-href";
import { mergePreventiviPerMacchina, mezzoPerFiltroPreventivi } from "@/lib/preventivi/preventivi-per-macchina";
import { preventivoRowToRecordStub } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { removePreventivoRecord } from "@/lib/preventivi/preventivi-sync-adapter";
import { writePendingPreventivoPayload, navigateToPendingPreventivoCreate } from "@/lib/preventivi/preventivi-session-bridge";
import { resolveMezzoForPreventivoHandoff } from "@/lib/preventivi/resolve-mezzo-for-pending-preventivo";
import type { PreventivoLavorazioneOrigine, PreventivoRecord } from "@/lib/preventivi/types";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import {




  dsGestionaleInfoCardCompact,
  dsGestionaleInfoCardTitle,
  dsHubModalFieldLabel,


  dsTableActionTextBtn,
  dsTableActionTextBtnDanger,
  dsTableActionTextBtnNeutral,
  dsTableActionTextBtnPrimary,
} from "@/lib/ui/design-system";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { LavorazioneAttivitaPanel } from "@/components/lavorazioni/lavorazione-attivita-panel";
import { buildLavorazioneAttivitaFeed } from "@/lib/lavorazioni/lavorazione-attivita-feed";
import { logAutoreLabel } from "@/lib/gestionale-log/log-modifiche-view-model";
import {
  buildLavorazioneRowProfileResolver,
  buildLogAutoreByUserId,
  displayLavorazioneAutore,
} from "@/lib/lavorazioni/lavorazione-ultima-modifica";
import { useAuth } from "@/context/auth-context";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { useLavorazioneHub } from "@/src/hooks/gestionale/use-lavorazione-hub";
import { LavorazionePlanningPanel } from "@/components/lavorazioni/lavorazione-planning-panel";
import {
  lavorazioneRowToTagliandoFields,
  type TagliandoLavorazioneFields,
} from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import {
  useEffectivePresetForConfigQuery,
  useMezzoMaintenanceConfigsQuery,
} from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useLavorazioneTagliandoRicambiAutofill } from "@/src/hooks/use-lavorazione-tagliando-ricambi-autofill";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { reconcileGestionaleEntity } from "@/lib/sync/gestionale-reconcile";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/src/hooks/use-permissions";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import type {
  LavorazioneSchedeBundle,
  RigaAddettoOreScheda,

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
  listSurface = "table",
  origine,
  initialTab: initialTabProp = "schede",
  initialSchedaStage,
  captureHandoff,
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
  onInvalidateAfterIngressoSave,
  canDeleteLavorazione = false,
  onDeleteLavorazione,
  deleteLavorazionePending = false,
}: {
  open: boolean;
  onClose: () => void;
  lav: LavRow;
  listSurface?: import("@/lib/ui/resolve-list-surface").ListSurface;
  origine?: PreventivoLavorazioneOrigine;
  initialTab?: HubTabInput;
  /** @deprecated Ignorato — shell hub sempre `formLarge` + `standard` (allineato a mezzi hub). */
  dialogSize?: SchedeLavorazioneDialogSize;
  /** Apre direttamente l'editor scheda lavorazioni/ricambi (es. acquisizione AI). */
  initialSchedaStage?: "lavorazioni" | "ricambi";
  /** Handoff acquisizione multi-schede: sequenza lavorazioni ÔåÆ ricambi. */
  captureHandoff?: {
    sequentialStages: Array<"lavorazioni" | "ricambi">;
    identMismatchWarnings?: string[];
    multiSchedaLabels?: string;
  };
  bundle: LavorazioneSchedeBundle;
  onPersist: (
    next: LavorazioneSchedeBundle,
  ) => Promise<
    | { ok: true }
    | { ok: false; error: string; kind?: "error" | "concurrency" }
  >;
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
  mezzi: MezzoGestito[];
  addetti: string[];
  currentUser: string;
  schedeStore: Record<string, LavorazioneSchedeBundle>;
  onSchedaLog?: (ev: SchedaLogEv) => void;
  /** Backend sync — solo da pipeline SSOT, catalogo congelato. */
  onIngressoCommitted?: (
    campi: SchedaIngressoFields,
    options: {
      mezzoUpdatePlan?: import("@/lib/domain/mezzo/mezzo-update-from-scheda-plan").MezzoUpdateFromSchedaPlan;
      lavorazioneNote?: string;
      tagliandoFields?: import("@/lib/maintenance-plans/tagliando-lavorazione-fields").TagliandoLavorazioneFields;
      mezziCatalogFrozen: readonly import("@/lib/mezzi/types").MezzoGestito[];
      runId: number;
      correlationId: string;
      lavorazioneGestione?: import("@/lib/schede/scheda-ingresso-save-pipeline").IngressoLavorazioneGestionePatch;
    },
  ) => void | Promise<void | { attrezzaturaId?: string | null }>;
  /** Invalidazione batch unica post-commit. */
  onInvalidateAfterIngressoSave?: (
    lavorazioneId: string,
    mezzoId?: string | null,
  ) => void | Promise<void>;
  canDeleteLavorazione?: boolean;
  onDeleteLavorazione?: () => void;
  deleteLavorazionePending?: boolean;
}) {
  const { authorName, user } = useAuth();
  const gestToast = useGestionaleToast();
  const { confirmDialog } = useGestionaleConfirm();
  const { canEditWorkOrders } = usePermissions();
  const preventiviPerm = usePermissions("preventivi");
  const globalOpts = useGlobalOptions({ debugTag: "SchedeLavorazioneModal" });
  const statiOpts = useMemo(
    () => globalOpts.lavorazioni.stati.filter((s) => s.id !== "annullata"),
    [globalOpts.lavorazioni.stati],
  );
  const hubQuery = useLavorazioneHub(lav.id);
  const updateLavorazione = useLavorazioneUpdateMutation();
  const qc = useQueryClient();
  const hubData = hubQuery.data;
  const lavorazioneBaseRow = hubQuery.lavorazioneBase;
  const lavorazioneMezzoIdFk = lavorazioneBaseRow?.mezzo_id?.trim() || null;
  const initialTab = normalizeHubTab(initialTabProp);
  const [frozenCaptureHandoff] = useState(() => captureHandoff);
  const captureNextStageRef = useRef(captureHandoff?.sequentialStages[0] ?? null);
  const mezzo = useMemo(
    () => resolveMezzoForLavorazioneEdit(mezzi, lav, lavorazioneMezzoIdFk),
    [mezzi, lav, lavorazioneMezzoIdFk],
  );
  const interventoCtx = useInterventoContext(lav.id, {
    enabled: open,
    legacyLavorazione: lav,
    mezzoGestito: mezzo,
  });
  const [stage, setStage] = useState<Stage>({ kind: "hub" });
  const [hubTab, setHubTab] = useState<HubTab>(initialTab);
  const [unsavedPanel, setUnsavedPanel] = useState<null | "lav" | "ric">(null);
  const [panoramicaNoteSaving, setPanoramicaNoteSaving] = useState(false);
  const [schedaEditorSaving, setSchedaEditorSaving] = useState(false);
  const [draft, setDraft] = useState<LavorazioneSchedeBundle>(bundle);
  const draftRef = useRef(draft);
  const unsavedPanelRef = useRef(unsavedPanel);
  const syncedBundleJsonRef = useRef(JSON.stringify(bundle));
  useLayoutEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useLayoutEffect(() => {
    unsavedPanelRef.current = unsavedPanel;
  }, [unsavedPanel]);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const submitLock = useSubmitLock();
  const ingressoDraftRef = useRef<SchedaIngressoFields | null>(null);
  const ingressoSaveRunRef = useRef<(() => Promise<IngressoSaveResult>) | null>(null);
  const ingressoJustCommittedRef = useRef(false);
  const [preventivoEsistenteOpen, setPreventivoEsistenteOpen] = useState(false);
  const [generaPreventivoBusy, setGeneraPreventivoBusy] = useState(false);
  const [ingressoFormOpen, setIngressoFormOpen] = useState(false);
  const [ingressoEditorInitial, setIngressoEditorInitial] = useState<SchedaIngressoFields | null>(null);
  const [ingressoTagliandoInitial, setIngressoTagliandoInitial] =
    useState<TagliandoLavorazioneFields | null>(null);
  const [ingressoNoteInitial, setIngressoNoteInitial] = useState("");
  const [lavDoc, setLavDoc] = useState<SchedaLavorazioniDoc | null>(null);
  const [ricDoc, setRicDoc] = useState<SchedaRicambiDoc | null>(null);
  const isTagliando = Boolean(hubData?.lavorazione?.is_tagliando);
  const configsQ = useMezzoMaintenanceConfigsQuery({
    mezzoId: mezzo?.id,
    enabled: open && isTagliando,
  });
  const primaryConfig = configsQ.data?.[0];
  const presetQ = useEffectivePresetForConfigQuery(
    primaryConfig?.id,
    open && isTagliando && Boolean(primaryConfig?.id),
  );
  const tagliandoAutofill = useLavorazioneTagliandoRicambiAutofill({
    enabled: open && stage.kind === "ricambi",
    isTagliando,
    preset: presetQ.data ?? null,
    presetVersionRef:
      hubData?.lavorazione?.tagliando_preset_version_ref ?? primaryConfig?.presetVersionId ?? null,
    righe: ricDoc?.campi.righe ?? [],
    onApplyRighe: (next) => {
      setRicDoc((d) => (d ? { ...d, campi: { ...d.campi, righe: next } } : d));
    },
  });
  const [eliminaConfirmTipo, setEliminaConfirmTipo] = useState<SchedaTipo | null>(null);
  const baselineIngressoJson = useRef<string | null>(null);
  const baselineLavorazioniJson = useRef<string | null>(null);
  const baselineRicambiJson = useRef<string | null>(null);
  useEffect(() => {
    if (!open) return;
    return registerPwaUpdateGuard({
      id: `schede-lavorazione:${lav.id}`,
      isDirty: () =>
        unsavedPanelRef.current !== null ||
        JSON.stringify(draftRef.current) !== syncedBundleJsonRef.current ||
        (lavDoc !== null &&
          baselineLavorazioniJson.current !== JSON.stringify(lavDoc)) ||
        (ricDoc !== null &&
          baselineRicambiJson.current !== JSON.stringify(ricDoc)),
      message: "Salva o chiudi le modifiche della scheda prima di aggiornare l'app.",
    });
  }, [lav.id, open, lavDoc, ricDoc]);
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

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- lint phase2: preserve existing hook contract
  const resolveSchedaAutore = useMemo(() => {
    const row = hubData?.lavorazione;
    const resolveUserId = row
      ? buildLavorazioneRowProfileResolver(row, user?.id ?? null, authorName)
      : () => undefined;
    const logByUserId =
      hubData?.log != null
        ? buildLogAutoreByUserId(hubData.log, (r) => logAutoreLabel(r, user?.id ?? null, authorName))
        : new Map<string, string>();
    return (raw: string) =>
      displayLavorazioneAutore(raw, "", (id) => resolveUserId(id) ?? logByUserId.get(id));
  }, [hubData?.lavorazione, hubData?.log, user?.id, authorName]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
      setEliminaConfirmTipo(null);
      return;
    }
    const t = window.setTimeout(() => {
      setHubTab(initialTab);
      setIngressoFormOpen(false);
      setIngressoEditorInitial(null);
      setIngressoTagliandoInitial(null);
      setIngressoNoteInitial("");
      ingressoDraftRef.current = null;
      const cloned = JSON.parse(JSON.stringify(bundle)) as LavorazioneSchedeBundle;
      if (!cloned.codice?.trim() && lav.codice?.trim()) {
        cloned.codice = lav.codice.trim();
      }
      setDraft(cloned);
      syncedBundleJsonRef.current = JSON.stringify(cloned);
      if (initialSchedaStage === "lavorazioni" && cloned.lavorazioni) {
        setLavDoc(cloned.lavorazioni);
        baselineLavorazioniJson.current = JSON.stringify(cloned.lavorazioni);
        setStage({ kind: "lavorazioni" });
        captureNextStageRef.current = frozenCaptureHandoff?.sequentialStages[0] ?? null;
      } else if (initialSchedaStage === "ricambi" && cloned.ricambi) {
        setRicDoc(cloned.ricambi);
        baselineRicambiJson.current = JSON.stringify(cloned.ricambi);
        setStage({ kind: "ricambi" });
      } else {
        setLavDoc(null);
        setRicDoc(null);
        setStage({ kind: "hub" });
      }
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evita reset hub dopo persist (es. «Crea nuova»)
  }, [open, lav.id, initialTab, initialSchedaStage]);

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

  useCabSyncListener(["scheda_lavorazione", "pdf_artifacts", "document_access_tokens", "documenti"], (event) => {
    const r = reconcileGestionaleEntity(qc, event, "cab_sync", { skipInvalidation: true });
    if (r.needsRefetch) void hubQuery.refetch();
  });

  const applyDraftBundle = useCallback((b: LavorazioneSchedeBundle) => {
    setDraft(b);
    syncedBundleJsonRef.current = JSON.stringify(b);
  }, []);

  const persistBundle = useCallback(
    async (b: LavorazioneSchedeBundle): Promise<{ ok: true } | { ok: false; error: string }> => {
      applyDraftBundle(b);
      return onPersist(b);
    },
    [applyDraftBundle, onPersist],
  );

  const backgroundPersistDeferRef = useRef<LavorazioneSchedeBundle | null>(null);

  const flushDeferredBackgroundPersist = useCallback(() => {
    if (ingressoJustCommittedRef.current) {
      ingressoJustCommittedRef.current = false;
      backgroundPersistDeferRef.current = null;
      return;
    }
    const pending = backgroundPersistDeferRef.current;
    if (!pending || submitLock.isLocked()) return;
    backgroundPersistDeferRef.current = null;
    void persistBundle(pending);
  }, [persistBundle, submitLock]);

  const persistBundleInBackground = useCallback(
    (b: LavorazioneSchedeBundle) => {
      if (submitLock.isLocked()) {
        backgroundPersistDeferRef.current = b;
        return;
      }
      void persistBundle(b);
    },
    [persistBundle, submitLock],
  );

  useEffect(() => {
    if (!submitLock.isLocked()) flushDeferredBackgroundPersist();
  }, [submitLock, flushDeferredBackgroundPersist]);

  function openIngressoEditor(campi: SchedaIngressoFields) {
    const hydrated = mergeSchedaIngressoWithMezzoPriority(campi, {
      linkedMezzo: mezzo,
      prefillPolicy: "edit_hydrate",
    });
    const normalized = normalizeSchedaIngressoFields(hydrated, addetti[0] ?? "");
    baselineIngressoJson.current = JSON.stringify(normalized);
    ingressoDraftRef.current = normalized;
    setIngressoEditorInitial(normalized);
    // Hub può essere ancora in loading: seed dalla riga lista (`lav`) così non si forza Riparazione.
    setIngressoTagliandoInitial(
      lavorazioneRowToTagliandoFields(hubData?.lavorazione ?? lav),
    );
    setIngressoNoteInitial(hubData?.lavorazione?.note?.trim() || lav.note?.trim() || "");
    setIngressoFormOpen(true);
  }

  function closeIngressoEditor() {
    setIngressoFormOpen(false);
    setIngressoEditorInitial(null);
    setIngressoTagliandoInitial(null);
    setIngressoNoteInitial("");
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
    persistBundleInBackground(next);
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
    const actorUserId = user?.id ?? null;
    if (tipo === "ingresso") {
      const campi = buildSchedaIngressoFieldsFromContext(lav, mezzo, addetti[0] ?? "");
      baselineIngressoJson.current = JSON.stringify(campi);
      const doc: SchedaIngressoDoc = {
        ...newSchedaMeta("ingresso", u, "generata", actorUserId),
        tipo: "ingresso",
        campi,
      };
      flushSync(() => {
        persistBundleInBackground({ ...draftRef.current, ingresso: doc });
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
        ...newSchedaMeta("lavorazioni", u, "generata", actorUserId),
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
        persistBundleInBackground({ ...draftRef.current, lavorazioni: doc });
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
        ...newSchedaMeta("ricambi", u, "generata", actorUserId),
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
        persistBundleInBackground({ ...draftRef.current, ricambi: doc });
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
    openUrlInNewTab(buildPreventiviOpenHrefForRecord(p));
  }

  const documentiHubUi = useMemo(() => {
    return (hubData?.documenti ?? []).map(documentoRowToGestionale);
  }, [hubData?.documenti]);

  async function eseguiGeneraPreventivoDaHub(replaceExisting: boolean) {
    if (generaPreventivoBusy) return;
    setGeneraPreventivoBusy(true);
    setPreventivoEsistenteOpen(false);
    try {
      const snap = draftRef.current;
      const ctxMezzoId =
        interventoCtx.context?.mezzo?.present
          ? interventoCtx.context.mezzo.id?.trim() || null
          : null;
      const lavMezzoId = interventoCtx.context?.lavorazione?.mezzoId?.trim() || null;
      const ident =
        interventoCtx.display && !interventoCtx.isLoading
          ? {
              targa: interventoCtx.display.targa.value,
              matricola: interventoCtx.display.matricola.value,
              nScuderia: interventoCtx.display.nScuderia.value,
            }
          : !interventoCtx.isLoading && interventoCtx.ident
            ? interventoCtx.ident
            : { targa: lav.targa, matricola: lav.matricola, nScuderia: lav.nScuderia };
      const mezzoForPreventivo = resolveMezzoForPreventivoHandoff(mezzi, {
        lav,
        mezzoId: mezzo?.id ?? ctxMezzoId ?? lavMezzoId,
        ident,
      });
      if (!mezzoForPreventivo) {
        gestToast.warning(
          "Mezzo non trovato in anagrafica: verifica targa o matricola prima di creare il preventivo.",
        );
        return;
      }
      const identCanon = {
        targa: mezzoForPreventivo.targa?.trim() || ident.targa?.trim() || "",
        matricola: mezzoForPreventivo.matricola?.trim() || ident.matricola?.trim() || "",
        nScuderia: mezzoForPreventivo.numeroScuderia?.trim() || ident.nScuderia?.trim() || "",
      };
      const bundleToPersist: LavorazioneSchedeBundle = {
        ...snap,
        lavorazioneId: lav.id,
        ingresso: snap.ingresso ?? draft.ingresso ?? null,
        lavorazioni: lavDoc ?? snap.lavorazioni ?? draft.lavorazioni ?? null,
        ricambi: ricDoc ?? snap.ricambi ?? draft.ricambi ?? null,
      };
      if (replaceExisting) {
        for (const p of preventiviCollegati) {
          const id = p.id?.trim();
          if (!id) continue;
          const del = await removePreventivoRecord(id, { queryClient: qc });
          if (!del.ok) {
            gestToast.error(del.error ?? "Eliminazione preventivo non riuscita.");
            return;
          }
        }
      }
      const persistRes = await persistBundle(bundleToPersist);
      if (!persistRes.ok) {
        gestToast.error(persistRes.error ?? "Salvataggio schede non riuscito prima del preventivo.");
        return;
      }
      writePendingPreventivoPayload({
        lav,
        origine: lavOrigine,
        mezzoId: mezzoForPreventivo.id,
        mezzo: mezzoForPreventivo,
        ident: identCanon,
        bundle: bundleToPersist,
      });
      navigateToPendingPreventivoCreate();
    } finally {
      setGeneraPreventivoBusy(false);
    }
  }

  function generaPreventivoDaHub() {
    if (!canEditWorkOrders || !preventiviPerm.canWrite) {
      gestToast.warning(
        !preventiviPerm.canWrite
          ? "Non hai permesso di creare preventivi."
          : READONLY_PERMISSION_HINT,
      );
      return;
    }
    if (preventiviCollegati.length > 0) {
      setPreventivoEsistenteOpen(true);
      return;
    }
    void eseguiGeneraPreventivoDaHub(false);
  }

  const hub = draft;
  const panoramicaCampi = useMemo((): SchedaIngressoFields => {
    const ig = hub.ingresso;
    if (ig && ig.sorgente !== "file_esterno") return ig.campi;
    return buildSchedaIngressoFieldsFromContext(lav, mezzo, lav.addetto.trim() || addetti[0] || "");
  }, [hub.ingresso, lav, mezzo, addetti]);

  const panoramicaDisplayFields = useMemo((): SchedaIngressoFields => {
    const d = interventoCtx.display;
    if (!d) {
      return {
        ...panoramicaCampi,
        cliente: panoramicaCampi.cliente.trim() || lav.cliente.trim(),
        cantiere: panoramicaCampi.cantiere.trim() || lav.cantiere.trim(),
        utilizzatore: panoramicaCampi.utilizzatore.trim() || lav.utilizzatore.trim(),
        targa: panoramicaCampi.targa.trim() || lav.targa.trim(),
        matricola: panoramicaCampi.matricola.trim() || lav.matricola.trim(),
        nScuderia: panoramicaCampi.nScuderia.trim() || lav.nScuderia.trim(),
      };
    }
    return {
      ...panoramicaCampi,
      cliente: d.cliente.value,
      cantiere: d.cantiere.value,
      utilizzatore: d.utilizzatore.value,
      marcaAttrezzatura: d.marcaAttrezzatura.value,
      modelloAttrezzatura: d.modelloAttrezzatura.value,
      tipoAttrezzatura: d.tipoAttrezzatura.value,
      targa: d.targa.value,
      matricola: d.matricola.value,
      nScuderia: d.nScuderia.value,
      marcaTelaio: d.marcaTelaio.value,
      modelloTelaio: d.modelloTelaio.value,
      tipoTelaio: d.tipoTelaio.value,
      vin: d.vin.value,
    };
  }, [interventoCtx.display, panoramicaCampi, lav]);

  const hubIdentParts = useMemo(() => {
    if (interventoCtx.display) {
      return identificazionePartsFromInterventoDisplay(interventoCtx.display);
    }
    return identificazionePartsFromSchedaIngresso(panoramicaCampi);
  }, [interventoCtx.display, panoramicaCampi]);

  const identSubtitle = useMemo(
    () => formatLavorazioneDetailHeaderSubtitle(hubIdentParts, lav),
    [hubIdentParts, lav],
  );

  const panoramicaNoteValue = useMemo(() => {
    const fromHub = hubData?.lavorazione?.note?.trim();
    if (fromHub) return fromHub;
    const fromBase = lavorazioneBaseRow?.note?.trim();
    if (fromBase) return fromBase;
    return lav.note?.trim() || "";
  }, [hubData?.lavorazione?.note, lavorazioneBaseRow?.note, lav.note]);

  const commitPanoramicaNote = useCallback(
    async (note: string) => {
      if (!canEditWorkOrders) return;
      if (submitLock.isLocked()) return;
      const trimmed = note.trim();
      if (trimmed === panoramicaNoteValue) return;

      setPanoramicaNoteSaving(true);
      try {
        await updateLavorazione.mutateAsync({
          id: lav.id,
          data: { note: trimmed || null },
        });
      } catch {
        gestToast.errorOnce("schede-note-save", "Salvataggio note non riuscito. Riprova.", {
          module: "lavorazioni",
          action: "update",
        });
      } finally {
        setPanoramicaNoteSaving(false);
      }
    },
    [canEditWorkOrders, panoramicaNoteValue, submitLock, updateLavorazione, lav.id, gestToast],
  );

  const costoLavorazione = useLavorazioneCosto(lav.id, draft, {
    enabled: open,
    cliente: lav.cliente,
  });
  const nOk = countSchedePresenti(hub);

  /** Commit ingresso edit — solo invocato da savePipeline.run (SSOT). */
  const commitIngressoEdit = useCallback(
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- lint phase2: preserve existing hook contract
    async (input: IngressoSaveCommitInput): Promise<IngressoSaveCommitResult> => {
      const ig = input.fields;
      const base = draftRef.current.ingresso;
      if (!ig || !base) return { ok: false, error: "Scheda ingresso non disponibile." };
      if (!assertItalianDay("Data ingresso", ig.dataIngresso, gestToast.validation)) {
        return { ok: false, error: "validation" };
      }

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

      try {
        const syncRes = await onIngressoCommitted?.(ig, {
          mezzoUpdatePlan: input.mezzoUpdatePlan,
          lavorazioneNote: input.lavorazioneNote,
          tagliandoFields: input.tagliandoFields,
          mezziCatalogFrozen: input.mezziCatalogFrozen,
          runId: input.runId,
          correlationId: input.correlationId,
          lavorazioneGestione: input.lavorazioneGestione,
        });

        const rowDataIngresso =
          hubData?.lavorazione?.data_ingresso?.trim() || lav.dataIngresso?.trim() || null;
        const ingressoNorm = resolveDataIngressoWriteValue(rowDataIngresso, ig.dataIngresso);

        const committedCampi: SchedaIngressoFields = {
          ...(syncRes && typeof syncRes === "object" && syncRes.attrezzaturaId?.trim()
            ? { ...ig, attrezzaturaId: syncRes.attrezzaturaId.trim() }
            : ig),
          dataIngresso: ingressoNorm.displayCanonical ?? ig.dataIngresso,
        };

        const nextDoc: SchedaIngressoDoc = {
          tipo: "ingresso",
          createdAt: base.createdAt,
          createdBy: base.createdBy,
          sorgente: base.sorgente,
          fileEsterno: base.fileEsterno,
          campi: committedCampi,
          mezzoLink: input.mezzoLinkMeta ?? base.mezzoLink,
          updatedAt: now,
          updatedBy: u,
          updatedByUserId: user?.id ?? null,
          createdByUserId: base.createdByUserId ?? null,
        };

        if (!assertIngressoSaveGenerationCurrent(input.runId, "persist_bundle")) {
          return { ok: false, error: "SAVE_STALE" };
        }

        const persistCtx = {
          runId: input.runId,
          correlationId: input.correlationId,
          saveAttemptId: input.saveAttemptId,
          lavorazioneId: lav.id,
        };
        logIngressoSaveStageStart("persist_bundle", persistCtx);
        const persistRes = await persistBundle({ ...draftRef.current, ingresso: nextDoc });
        logIngressoSaveStageEnd("persist_bundle", { ...persistCtx, ok: persistRes.ok });
        if (!persistRes.ok) {
          gestToast.error(persistRes.error ?? "Salvataggio scheda ingresso non riuscito.", {
            module: "lavorazioni",
            action: "update",
          });
          return { ok: false, error: persistRes.error };
        }

        baselineIngressoJson.current = JSON.stringify(committedCampi);
        ingressoJustCommittedRef.current = true;
        logIngressoSavePipeline("save_invalidate", {
          runId: input.runId,
          correlationId: input.correlationId,
          lavorazioneId: lav.id,
        });
        void Promise.resolve(onInvalidateAfterIngressoSave?.(lav.id, mezzo?.id)).catch(
          reportInvalidateFailure,
        );
        return { ok: true };
      } catch (err) {
        gestToast.error(err, { module: "lavorazioni", action: "update" });
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
    [
      currentUser,
      emitLog,
      gestToast,
      hubData?.lavorazione?.data_ingresso,
      lav.dataIngresso,
      lav.id,
      mezzo?.id,
      onIngressoCommitted,
      onInvalidateAfterIngressoSave,
      persistBundle,
    ],
  );

  async function commitLavorazioniSave(): Promise<boolean> {
    const result = { ok: false };
    await runButtonSubmit(
      modalRootRef.current,
      submitLock,
      () => ({ doc: lavDoc, draft: draftRef.current }),
      async (snap) => {
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
          updatedByUserId: user?.id ?? null,
          createdByUserId: doc.createdByUserId ?? null,
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
        const persistRes = await persistBundle({ ...snap.draft, lavorazioni: nextDoc });
        result.ok = persistRes.ok;
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
      async (snap) => {
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
          updatedByUserId: user?.id ?? null,
          createdByUserId: doc.createdByUserId ?? null,
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
        const persistRes = await persistBundle({ ...snap.draft, ricambi: nextDoc });
        result.ok = persistRes.ok;
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

  function saveLavorazioniPanel() {
    void (async () => {
      setSchedaEditorSaving(true);
      try {
        const ok = await commitLavorazioniSave();
        if (!ok) return;
        const nextStage = captureNextStageRef.current;
        const current = draftRef.current;
        if (nextStage === "ricambi" && current.ricambi) {
          captureNextStageRef.current = null;
          setRicDoc(current.ricambi);
          baselineRicambiJson.current = JSON.stringify(current.ricambi);
          setStage({ kind: "ricambi" });
          setLavDoc(null);
          gestToast.info("Completa ora la scheda ricambi.");
          return;
        }
        setStage({ kind: "hub" });
        setLavDoc(null);
      } finally {
        setSchedaEditorSaving(false);
      }
    })();
  }

  function saveRicambiPanel() {
    void (async () => {
      setSchedaEditorSaving(true);
      try {
        const ok = await commitRicambiSave();
        if (!ok) return;
        setStage({ kind: "hub" });
        setRicDoc(null);
      } finally {
        setSchedaEditorSaving(false);
      }
    })();
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

  const lavorazioniEditorActive = stage.kind === "lavorazioni" && Boolean(hub.lavorazioni && lavDoc);
  const ricambiEditorActive = stage.kind === "ricambi" && Boolean(hub.ricambi && ricDoc);
  const editorOnBack = lavorazioniEditorActive
    ? tryLavorazioniBack
    : ricambiEditorActive
      ? tryRicambiBack
      : undefined;
  const editorFooter =
    lavorazioniEditorActive && lavDoc ? (
      <SchedaPanelEditorActions
        showDelete={lavDoc.sorgente !== "file_esterno"}
        onDelete={() => requestDeleteSchedaTipo("lavorazioni")}
        onCancel={tryLavorazioniBack}
        onSave={saveLavorazioniPanel}
        saving={schedaEditorSaving}
        readOnly={lavDoc.sorgente === "file_esterno"}
      />
    ) : ricambiEditorActive && ricDoc ? (
      <SchedaPanelEditorActions
        showDelete={ricDoc.sorgente !== "file_esterno"}
        onDelete={() => requestDeleteSchedaTipo("ricambi")}
        onCancel={tryRicambiBack}
        onSave={saveRicambiPanel}
        saving={schedaEditorSaving}
        readOnly={ricDoc.sorgente === "file_esterno"}
      />
    ) : undefined;

  const hubSchedeFooter =
    stage.kind === "hub" && hubTab === "schede" ? (
      <GestionaleModalFooterActions>
        <CreaPreventivoButton
          onClick={generaPreventivoDaHub}
          disabled={generaPreventivoBusy || !canEditWorkOrders || !preventiviPerm.canWrite}
          disabledTitle={
            !preventiviPerm.canWrite
              ? "Non hai permesso di creare preventivi"
              : READONLY_PERMISSION_HINT
          }
        />
      </GestionaleModalFooterActions>
    ) : undefined;
  const modalFooter = editorFooter ?? hubSchedeFooter;

  return (
    <>
      <LavorazioniModalShell
        modalSize={stage.kind === "hub" ? "formLarge" : "analytics"}
        modalHeight="standard"
        modalRootRef={modalRootRef}
        onRequestClose={onClose}
        onBack={editorOnBack}
        titleId="schede-lav-detail-title"
        footer={modalFooter}
        header={
          <LavorazioniModalHeader
            title="Dettaglio lavorazione"
            subtitle={identSubtitle || undefined}
            titleId="schede-lav-detail-title"
            onRequestClose={onClose}
            onBack={editorOnBack}
          />
        }
      >
        <div className={`relative ${gestionaleModalBodyFlexClass}`}>
        {stage.kind === "hub" ? (
        <HubModalTabBar aria-label="Sezioni dettaglio lavorazione">
          {(["panoramica", "schede", "preventivi", "documenti", "attivita"] as const).map((id) => (
            <HubModalTab
              key={id}
              id={`schede-lav-tab-${id}`}
              panelId={hubTab === id ? hubTabPanelId : undefined}
              label={hubTabLabel(id)}
              active={hubTab === id}
              onSelect={() => selectHubTab(id)}
            />
          ))}
        </HubModalTabBar>
        ) : null}

        <GestionaleModalScrollBody
          className="p-4"
          role={stage.kind === "hub" ? "tabpanel" : undefined}
          aria-labelledby={stage.kind === "hub" ? `schede-lav-tab-${hubTab}` : undefined}
          id={stage.kind === "hub" ? hubTabPanelId : undefined}
        >
          {frozenCaptureHandoff?.multiSchedaLabels ? (
            <div className="mb-4">
              <CaptureMultiSchedaNotice
                schedaLabels={frozenCaptureHandoff.multiSchedaLabels}
                identWarnings={frozenCaptureHandoff.identMismatchWarnings}
              />
              {stage.kind === "lavorazioni" && frozenCaptureHandoff.sequentialStages.includes("ricambi") ? (
                <p className="mt-2 text-xs text-[color:var(--cab-muted-fg)]">
                  Dopo il salvataggio passerai alla scheda ricambi.
                </p>
              ) : null}
            </div>
          ) : null}
          {stage.kind === "hub" && hubTab === "schede" ? (
            <div className="flex flex-col gap-5">
              <SchedaSectionHub
                title="Scheda ingresso"
                stato={statoUiSchedaIngresso(hub)}
                doc={hub.ingresso}
                canEdit={canEditWorkOrders}
                formatAutore={resolveSchedaAutore}
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
                formatAutore={resolveSchedaAutore}
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
                formatAutore={resolveSchedaAutore}
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
            </div>
          ) : null}

          {stage.kind === "hub" && hubTab === "panoramica" ? (
            <HubModalPanoramicaPanel>
              {hubQuery.isError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
                  {hubQuery.error?.message ?? "Errore caricamento dettaglio lavorazione."}
                </p>
              ) : null}
              {hubQuery.isLoading && !hubData && !hubQuery.panoramaReady ? (
                <LoadingFormSkeleton sections={3} />
              ) : null}
              {hubData || hubQuery.panoramaReady ? (
                <>
              <GestionaleInfoCard title="Note">
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
                    <OptionalTooltip content={!canEditWorkOrders ? READONLY_PERMISSION_HINT : undefined}>
                      <button type="button" className={dsTableActionTextBtnPrimary} disabled={!canEditWorkOrders} aria-label="Modifica scheda ingresso" onClick={apriSchedaIngresso}>
                        <IconBtnEdit />
                        Modifica
                      </button>
                    </OptionalTooltip>
                  ) : null
                }
              >
                <SchedaIngressoPanoramicaAnagraficaContent fields={panoramicaDisplayFields} />
              </GestionaleInfoCard>
              {!hubData && lavorazioneBaseRow ? (
                <>
                  <p className="text-xs text-[color:var(--cab-text-muted)]">Dettagli KPI in caricamento…</p>
                  <LavorazionePlanningPanel lavorazioneId={lav.id} />
                </>
              ) : null}
              <LavorazioneCostoDiscreto costo={costoLavorazione} variant="section" />
              {canDeleteLavorazione && onDeleteLavorazione ? (
                <GestionaleInfoCard
                  compact
                  title="Elimina lavorazione"
                  subtitle="Operazione irreversibile: rimuove la lavorazione e i dati collegati."
                  actions={
                    <button type="button" className={dsTableActionTextBtnDanger} disabled={deleteLavorazionePending} onClick={onDeleteLavorazione}>
                      <HubIconTrash />
                      Elimina
                    </button>
                  }
                />
              ) : null}
                </>
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
                  <div className="flex shrink-0 items-center justify-end gap-1.5 min-w-0 flex-nowrap sm:flex-wrap">
                    <Tooltip content={
                      !preventiviPerm.canWrite
                        ? "Non hai permesso di creare preventivi"
                        : !canEditWorkOrders
                          ? READONLY_PERMISSION_HINT
                          : "Crea preventivo da schede lavorazione"
                    }><button type="button" className={dsTableActionTextBtnPrimary} disabled={!canEditWorkOrders || !preventiviPerm.canWrite} onClick={generaPreventivoDaHub}>
                      <IconBtnPreventivo className="h-3.5 w-3.5 shrink-0"/>
                      Crea
                    </button></Tooltip>
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
              <GestionaleInfoCard title="Storico mezzo" collapsible defaultCollapsed>
                <p className="mb-3 text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
                  Preventivi con gli stessi identificativi del mezzo (targa, matricola o scuderia).
                </p>
                <LavorazionePreventiviHubList
                  listSurface={listSurface}
                  rows={preventiviPerMacchina}
                  lavorazioneId={lav.id}
                  onApriNeiPreventivi={apriPreventivoNeiPreventivi}
                  onCreaPreventivo={canEditWorkOrders && preventiviPerm.canWrite ? generaPreventivoDaHub : undefined}
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
              <GestionaleInfoCard title="Archivio mezzo" collapsible defaultCollapsed>
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
                  <ul className={`min-w-0 ${LIST_DIVIDER_UL}`}>
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
                            <button type="button" className={dsTableActionTextBtn} onClick={() => void openDocumentoFile(d)}>
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
              setDoc={setLavDoc as Dispatch<SetStateAction<SchedaLavorazioniDoc>>}
              addettiLista={addetti}
              identParts={hubIdentParts}
            />
          ) : null}

          {stage.kind === "ricambi" && hub.ricambi && ricDoc ? (
            <RicambiPanel
              doc={ricDoc}
              setDoc={setRicDoc as Dispatch<SetStateAction<SchedaRicambiDoc>>}
              lav={lav}
              identLine={identSubtitle}
              identParts={hubIdentParts}
              currentUser={currentUser}
              addettiLista={addetti}
              onImmediatePersist={(d) => persistBundleInBackground({ ...draftRef.current, ricambi: d })}
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
            if (p === "lav") setLavDoc(null);
            if (p === "ric") setRicDoc(null);
          }}
          onSaveAndExit={() => {
            const p = unsavedPanel;
            void (async () => {
              if (p === "lav") {
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
          initialLavorazioneNote={ingressoNoteInitial}
          initialTagliandoFields={ingressoTagliandoInitial ?? undefined}
          onClose={closeIngressoEditor}
          commitIngressoEdit={commitIngressoEdit}
          onSaveSuccess={closeIngressoEditor}
          ingressoSaveRunRef={ingressoSaveRunRef}
          submitLock={submitLock}
          onDelete={
            hub.ingresso.sorgente !== "file_esterno" ? () => requestDeleteSchedaTipo("ingresso") : undefined
          }
          readOnly={hub.ingresso.sorgente === "file_esterno"}
          canEdit={canEditWorkOrders}
          updatedBy={
            hub.ingresso.updatedBy
              ? resolveSchedaAutore(hub.ingresso.updatedBy)
              : hub.ingresso.updatedBy
          }
          mezzi={mezzi}
          schedeStore={schedeStore}
          attive={attive}
          storico={storico}
          excludeLavorazioneId={lav.id}
          bootstrapMezzoId={mezzo?.id}
          initialLavorazioneStato={"statoId" in lav ? lav.statoId : lav.statoFinaleId}
          initialLavorazionePriorita={"priorita" in lav ? lav.priorita : lav.prioritaFinale}
        />
      ) : null}

      <SchedaEliminaConfirmDialog
        open={eliminaConfirmTipo != null}
        tipo={eliminaConfirmTipo}
        onCancel={() => setEliminaConfirmTipo(null)}
        onConfirm={confirmDeleteSchedaTipo}
      />
      <PreventivoEsistenteConfirmDialog
        open={preventivoEsistenteOpen}
        existingCount={preventiviCollegati.length}
        busy={generaPreventivoBusy}
        onBack={() => setPreventivoEsistenteOpen(false)}
        onReplace={() => void eseguiGeneraPreventivoDaHub(true)}
        onCreateAnother={() => void eseguiGeneraPreventivoDaHub(false)}
      />
      {confirmDialog}

      {tagliandoAutofill.promptOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-md rounded-lg border border-[var(--erp-border)] bg-[var(--erp-surface)] p-4 text-sm shadow-lg">
            <p className="font-semibold">Il preset è cambiato dall&apos;ultimo caricamento.</p>
            <p className="mt-2 text-[var(--erp-text-muted)]">
              Aggiornare la scheda ricambi con le voci del preset corrente?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded border px-3 py-1.5" onClick={tagliandoAutofill.keepCurrent}>
                Mantieni attuale
              </button>
              <button type="button" className="rounded bg-[var(--cab-primary)] px-3 py-1.5 text-white" onClick={tagliandoAutofill.acceptResync}>
                Aggiorna automaticamente
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
  formatAutore,
  onApri,
  onCrea,
  onPdf,
  onElimina,
}: {
  title: string;
  stato: ReturnType<typeof statoUiSchedaIngresso>;
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc | null;
  canEdit?: boolean;
  formatAutore?: (raw: string) => string;
  onApri: () => void;
  onCrea: () => void;
  onPdf: () => void;
  onElimina?: () => void;
}) {
  const autoreLabel =
    doc?.updatedBy?.trim() && formatAutore
      ? formatAutore(doc.updatedBy).trim()
      : doc?.updatedBy?.trim() ?? "";
  const autoreDisplay = autoreLabel && autoreLabel !== "—" ? autoreLabel : "";

  return (
    <section className={dsGestionaleInfoCardCompact}>
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <h3 className={dsGestionaleInfoCardTitle}>{title}</h3>
          <div className="mt-1 flex min-w-0 items-center gap-x-2 gap-y-1 flex-nowrap sm:flex-wrap">
            <SchedaStatoBadge stato={stato} />
            {doc?.sorgente === "file_esterno" ? <FileEsternoBadge /> : null}
            {doc ? (
              <span className="text-[10px] leading-snug text-[color:var(--cab-text-muted)]">
                Agg. {fmtItShort(doc.updatedAt)}
                {autoreDisplay ? ` · ${autoreDisplay}` : null}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1.5 min-w-0 flex-nowrap sm:flex-wrap">
          {!doc ? (
            <OptionalTooltip content={!canEdit ? READONLY_PERMISSION_HINT : undefined}>
              <button type="button" className={dsTableActionTextBtnPrimary} disabled={!canEdit} onClick={onCrea}>
                <IconBtnPlus className="h-3.5 w-3.5 shrink-0"/>
                Crea nuova
              </button>
            </OptionalTooltip>
          ) : (
            <>
              {onElimina ? (
                <OptionalTooltip content={!canEdit ? READONLY_PERMISSION_HINT : undefined}>
                  <button type="button" className={dsTableActionTextBtnDanger} disabled={!canEdit} aria-label="Elimina scheda" onClick={onElimina}>
                    <HubIconTrash className="h-3.5 w-3.5 shrink-0" />
                    Elimina
                  </button>
                </OptionalTooltip>
              ) : null}
              <button type="button" className={dsTableActionTextBtnNeutral} disabled={!doc} aria-label="Esporta PDF scheda" onClick={onPdf}>
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                PDF
              </button>
              <OptionalTooltip content={!canEdit ? READONLY_PERMISSION_HINT : undefined}>
                <button type="button" className={dsTableActionTextBtnPrimary} disabled={!canEdit} aria-label="Modifica scheda" onClick={onApri}>
                  <IconBtnEdit />
                  Modifica
                </button>
              </OptionalTooltip>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SchedaPanelEditorActions({
  showDelete,
  onDelete,
  onCancel,
  onSave,
  saving,
  readOnly,
}: {
  showDelete: boolean;
  onDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  readOnly: boolean;
}) {
  return (
    <GestionaleModalFooterActions>
      {showDelete ? (
        <GestionaleModalFooterDeleteButton onClick={onDelete} disabled={saving}>
          Elimina scheda
        </GestionaleModalFooterDeleteButton>
      ) : null}
      <GestionaleModalFooterCancelButton onClick={onCancel} disabled={saving} />
      {!readOnly ? (
        <GestionaleModalFooterSaveButton type="button" loading={saving} onClick={onSave}>
          Salva scheda
        </GestionaleModalFooterSaveButton>
      ) : null}
    </GestionaleModalFooterActions>
  );
}

function LavorazioniPanel({
  doc,
  setDoc,
  addettiLista,
  identParts,
}: {
  doc: SchedaLavorazioniDoc;
  setDoc: Dispatch<SetStateAction<SchedaLavorazioniDoc>>;
  addettiLista: string[];
  identParts?: MezzoIdentificazioneParts | null;
}) {
  const { confirm: askConfirm, confirmDialog: lavorazioniConfirmDialog } = useGestionaleConfirm();
  const ro = doc.sorgente === "file_esterno";

  return (
    <div className="space-y-4">
      <SchedaLavorazioniFormBody
        value={doc.campi}
        onChange={(campi) => setDoc((d) => ({ ...d, campi }))}
        readonly={ro}
        globalOpts={{ addettiLista }}
        identParts={identParts}
        confirmDestructive={(opts) =>
          askConfirm({
            title: opts.title,
            message: opts.message,
            destructive: true,
            confirmLabel: opts.confirmLabel ?? "Conferma",
          })
        }
      />
      {lavorazioniConfirmDialog}
    </div>
  );
}

function RicambiPanel({
  doc,
  setDoc,
  lav,
  identLine,
  identParts,
  currentUser,
  addettiLista,
  onImmediatePersist,
}: {
  doc: SchedaRicambiDoc;
  setDoc: Dispatch<SetStateAction<SchedaRicambiDoc>>;
  lav: LavRow;
  identLine: string;
  identParts?: MezzoIdentificazioneParts | null;
  currentUser: string;
  addettiLista: string[];
  onImmediatePersist: (d: SchedaRicambiDoc) => void;
}) {
  const gestToast = useGestionaleToast();
  const { user } = useAuth();
  const { confirm: askConfirm, confirmDialog: ricambiConfirmDialog } = useGestionaleConfirm();
  const ro = doc.sorgente === "file_esterno";
  const qc = useQueryClient();
  const magazzinoQ = useMagazzinoRicambiUIQuery();
  const prodotti = magazzinoQ.data ?? [];

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
        updatedByUserId: user?.id ?? null,
        createdByUserId: doc.createdByUserId ?? null,
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
      <SchedaRicambiFormBody
        value={{
          ...doc.campi,
          identificazioneMacchina: doc.campi.identificazioneMacchina.trim() || identLine,
        }}
        onChange={(campi) => setDoc((d) => ({ ...d, campi }))}
        readonly={ro}
        variant="editor"
        identParts={identParts}
        hubAutocomplete
        globalOpts={{ addettiLista, magazzino: prodotti, defaultAddetto: lav.addetto }}
        onScaricaMagazzino={applyRowMagazzino}
        confirmDestructive={(opts) =>
          askConfirm({
            title: opts.title,
            message: opts.message,
            destructive: true,
            confirmLabel: opts.confirmLabel ?? "Conferma",
          })
        }
      />
      {ricambiConfirmDialog}
    </div>
  );
}
