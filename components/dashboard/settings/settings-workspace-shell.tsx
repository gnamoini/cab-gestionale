"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ImportEntity } from "@/lib/data-import/core/types";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { buildMezziTagliandiPresetsHref } from "@/lib/navigation/mezzi-tagliandi-links";
import { useAuth } from "@/context/auth-context";
import { useBranding } from "@/context/branding-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { Drawer } from "@/components/design-system";
import { PageHeaderPageActionMenu } from "@/components/gestionale/page-header-actions-portal";
import {
  pageActionLogItem,
  pageActionUndoItem,
  type PageActionItem,
} from "@/components/ui";
import { GestionaleDirtySaveActions, gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";
import { LavorazioniModalHeader, LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import {
  ConfigurazioneLogListEmbeddedLazy,
  HierarchyTreeSettingsSectionLazy,
  SettingsBrandingSectionLazy,
  SettingsEconomiciSectionLazy,
  SettingsEliminaConfirmDialogLazy,
  SettingsLavorazioniModalLazy,
  SettingsMaintenancePlansSectionLazy,
  SettingsRinominaPropagaDialogLazy,
  SettingsTkbAdminSectionLazy,
} from "@/components/dashboard/settings/settings-section-loaders";
import { SettingsClientiCommercialiList } from "@/components/dashboard/settings/settings-clienti-list";
import { SettingsImportEntry } from "@/components/dashboard/settings/settings-import-entry";
import { SettingsMagazzinoFornitoriList } from "@/components/dashboard/settings/settings-magazzino-fornitori-list";
import { SettingsMagazzinoMarcheList } from "@/components/dashboard/settings/settings-magazzino-marche-list";
import { SettingsMainPanel, SettingsMobileSectionPicker, SettingsNavSidebar } from "@/components/dashboard/settings/settings-nav-shell";
import { SettingsOverviewSection } from "@/components/dashboard/settings/settings-overview-section";
import { SettingsUnifiedStringList } from "@/components/dashboard/settings/settings-unified-string-list";
import {
  SETTINGS_NAV_OVERVIEW_ID,
  SETTINGS_NAV_STRUCTURE,
  SETTINGS_SECTION_QUERY_KEY,
  impostazioniPathForSection,
  parseSettingsSectionFromSearchParam,
  settingsDefaultSectionId,
  settingsNavGroupForSection,
  type SistemaSectionId,
} from "@/components/dashboard/settings/settings-workspace-types";
import { SettingsDipendentiAssenzeSection } from "@/components/dashboard/settings-dipendenti-assenze-section";
import { SettingsOfficinaProfiloSection } from "@/components/dashboard/settings/settings-officina-profilo-section";
import { SettingsComunicazioniSection } from "@/components/dashboard/settings/settings-comunicazioni-section";
import { gestionaleLogDrawerPanelClass } from "@/components/gestionale/gestionale-log-ui";
import { useSettingsSidebarScrollportHeight } from "@/components/dashboard/settings/use-settings-sidebar-scrollport-height";
import {
  SettingsSectionHeader,
  SETTINGS_MAIN_PANEL,
  SETTINGS_PAGE_GRID_MODAL,
  SETTINGS_PAGE_HEADER_WRAP,
  SETTINGS_PAGE_MASTER_ROW,
  SETTINGS_PAGE_SHELL_PAGE,
  SETTINGS_PAGE_STACK,
  SETTINGS_SIDEBAR_SHELL,
} from "@/components/dashboard/settings-list-ui";
import { useSettingsSimilarGate } from "@/components/dashboard/use-settings-similar-gate";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import { CloseButton } from "@/components/design-system";
import {
  DEFAULT_CAB_BRANDING_SETTINGS,
  type CabBrandingSettings,
} from "@/lib/branding/branding-settings-model";
import { resolveBrandingForSave, type BrandingLogoUploadDraft } from "@/lib/branding/branding-logo-upload";
import { prefetchImpostazioniInUsoQueries } from "@/lib/app-settings/prefetch-impostazioni-in-uso-queries";
import { appendConfigurazioneLog, appendConfigurazioneLogs } from "@/lib/configurazione/configurazione-log-storage";
import { markConfigurazioneUndoReverted, pushConfigurazioneUndo } from "@/lib/configurazione/configurazione-undo-storage";
import { areConfigurazioneSnapshotsEqual } from "@/lib/configurazione/settings-snapshot-compare";
import { buildConfigurazioneLogEntriesFromSnapshotDiff } from "@/lib/configurazione/settings-snapshot-log";
import {
  buildResolvedFromModalSnapshot,
  snapshotFromResolved,
  type SettingsWorkspaceSnapshot,
} from "@/lib/configurazione/settings-workspace-snapshot";
import { defaultTipiAssenza, type TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import { DEFAULT_ADDETTI_LAVORAZIONI } from "@/lib/lavorazioni/constants";
import {
  addettiLegacyNomi,
  addettoStoredNameAliases,
  createAddettoId,
  defaultAddettiRecords,
  findAddettoById,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import {
  assignColorForNewAddettoById,
  removeAddettoFromColorMapById,
  syncAddettoColorMapById,
} from "@/lib/lavorazioni/addetto-colors-assign";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { registerClienteInListe, removeScontoRicambiCliente } from "@/lib/mezzi/cliente-commerciale";
import { createMezziListePrefsDefault, type MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { addUniqueToStringList, renameInStringList } from "@/lib/settings/settings-list-mutations";
import type { SettingsRenameEntry } from "@/lib/settings/settings-rename-types";
import { dispatchAddettoDisplayRename } from "@/lib/sistema/cab-events";
import { suppressSettingsRemoteNotify } from "@/lib/sistema/settings-remote-notify-guard";
import type { SistemaPreventiviDefaults } from "@/lib/sistema/sistema-preventivi-defaults-storage";
import { useBeforeUnloadWhenDirty } from "@/lib/forms/use-before-unload-when-dirty";
import { cancelRouteTransition } from "@/src/lib/navigation/route-transition";
import { dsGestionaleScrollEndPad } from "@/lib/ui/scroll-system";
import { buildBulkRowsFromResolved, resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";
import { DEFAULT_PRIORITA_LAVORAZIONI_DB } from "@/src/lib/app-settings/resolve-from-rows";
import { invalidateAfterSettingsRenamePropagation } from "@/src/lib/react-query/invalidate-related";
import { useSettingsModalOpen } from "@/src/context/settings-modal-open-context";
import { useLavorazioniAddettiInUsoQuery } from "@/src/hooks/gestionale/use-lavorazioni-addetti-in-uso";
import { useLavorazioniStatiInUsoQuery } from "@/src/hooks/gestionale/use-lavorazioni-stati-in-uso";
import { useImpostazioniSettingsQuery } from "@/src/hooks/gestionale/use-impostazioni-settings-query";
import { useSettingsBulkMutation } from "@/src/hooks/gestionale/use-settings-queries";
import { useUndoableConfigurazioneSave } from "@/src/hooks/gestionale/use-undoable-configurazione-save";
import { mergeAppSettingsUpsertWithVersions } from "@/lib/domain/settings-entry";
import { settingsRenameEngineEntry } from "@/lib/domain/settings-rename-engine-entry";
import { withRenamePropagationTimeout } from "@/lib/settings/rename-engine/propagation-timeout";
import { runWithCorrelationIdAsync } from "@/lib/observability/runtime-correlation-context";
import { flattenHierarchyRenameLabels } from "@/lib/settings/settings-rename-labels";
import type { PropagaImpactSummary } from "@/components/dashboard/settings-rinomina-propaga-dialog";
import {
  addStatoFromLabel,
  DEFAULT_STATI_LAVORAZIONI_DB,
  reorderStatiList,
  STATO_LAVORAZIONE_COMPLETATA_DB,
} from "@/src/shared/selectors";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

function SettingsImportBar({ entity }: { entity: ImportEntity }) {
  return (
    <div className="mb-3 flex w-full justify-end">
      <SettingsImportEntry entity={entity} />
    </div>
  );
}

export function SistemaImpostazioniWorkspace({
  open = true,
  onClose,
  /** @deprecated Surface canonica: `page` (`/impostazioni`). Il modal resta solo per compatibilità export. */
  surface = "modal",
}: {
  open?: boolean;
  onClose?: () => void;
  surface?: "modal" | "page";
}) {
  const { authorName, user } = useAuth();
  const gestToast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { setOpen: setSettingsModalOpen } = useSettingsModalOpen();
  const { syncBranding } = useBranding();
  const settingsPayload = useImpostazioniSettingsQuery(open);
  const resolvedSettings = settingsPayload.data?.resolved;
  const settingsRows = settingsPayload.data?.rows ?? [];
  const pageMode = surface === "page";
  const listLayout = pageMode ? "flat" : "card";
  const bulkSave = useSettingsBulkMutation();
  const { undoable: undoableConfigSave, sessionId: undoSessionId } = useUndoableConfigurazioneSave({
    enabled: open && surface === "page",
  });

  const savedSnapshotRef = useRef<SettingsWorkspaceSnapshot | null>(null);
  /** Evita reset sezione/stato locale su refetch React Query mentre il modal resta aperto. */
  const hydratedSessionRef = useRef(false);
  const [savedRevision, setSavedRevision] = useState(0);

  const commitSavedBaseline = useCallback((s: SettingsWorkspaceSnapshot) => {
    savedSnapshotRef.current = s;
    setSavedRevision((n) => n + 1);
  }, []);

  const [modalSection, setModalSection] = useState<SistemaSectionId>(() => settingsDefaultSectionId(false));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopNavOpen, setDesktopNavOpen] = useState(true);
  const [configLogOpen, setConfigLogOpen] = useState(false);
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);
  const settingsSidebarRef = useRef<HTMLElement>(null);
  useSettingsSidebarScrollportHeight(settingsSidebarRef, pageMode && open);

  type PendingSettingsExit = { kind: "close" } | { kind: "navigate"; href: string };
  const pendingExitRef = useRef<PendingSettingsExit | null>(null);
  const exitAfterSaveRef = useRef(false);

  const urlSection = useMemo(
    () =>
      parseSettingsSectionFromSearchParam(searchParams.get(SETTINGS_SECTION_QUERY_KEY)) ??
      SETTINGS_NAV_OVERVIEW_ID,
    [searchParams],
  );

  const section = pageMode ? urlSection : modalSection;

  useEffect(() => {
    if (!pageMode || section !== "att-piani-tagliando") return;
    router.replace(buildMezziTagliandiPresetsHref());
  }, [pageMode, section, router]);

  const needsStatiInUso = open && section === "op-stati";
  const needsAddettiInUso = open && section === "op-addetti";
  const statiInUsoQ = useLavorazioniStatiInUsoQuery({ enabled: needsStatiInUso });
  const addettiInUsoQ = useLavorazioniAddettiInUsoQuery({ enabled: needsAddettiInUso });

  const currentImpostazioniPath = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const pickSection = useCallback(
    (id: SistemaSectionId) => {
      setMobileNavOpen(false);
      prefetchImpostazioniInUsoQueries(queryClient, id);
      if (pageMode) {
        const target = impostazioniPathForSection(id);
        if (target !== currentImpostazioniPath) {
          router.replace(target, { scroll: false });
        }
        return;
      }
      setModalSection(id);
    },
    [currentImpostazioniPath, pageMode, queryClient, router],
  );

  const attiveStatoIds = useMemo(() => {
    const d = statiInUsoQ.data;
    if (!d) return new Set<string>();
    return new Set(d.attivi);
  }, [statiInUsoQ.data]);
  const storicoStatoIds = useMemo(() => {
    const d = statiInUsoQ.data;
    if (!d) return new Set<string>();
    return new Set(d.storico);
  }, [statiInUsoQ.data]);
  const attiviAddetti = useMemo(() => {
    const d = addettiInUsoQ.data;
    if (!d) return new Set<string>();
    return new Set(d.attivi);
  }, [addettiInUsoQ.data]);
  const storicoAddetti = useMemo(() => {
    const d = addettiInUsoQ.data;
    if (!d) return new Set<string>();
    return new Set(d.storico);
  }, [addettiInUsoQ.data]);

  const [stati, setStati] = useState<StatoLavorazioneConfig[]>(() => [...DEFAULT_STATI_LAVORAZIONI_DB]);
  const [addettiRecords, setAddettiRecords] = useState<AddettoRecord[]>(() => defaultAddettiRecords());
  const [addettoColors, setAddettoColors] = useState<Record<string, string>>(() =>
    syncAddettoColorMapById(defaultAddettiRecords(), undefined),
  );
  const [prioritaColors, setPrioritaColors] = useState<Partial<Record<PrioritaLav, string>>>({});
  const [prioritaDb, setPrioritaDb] = useState<PrioritaLavorazione[]>(() => [...DEFAULT_PRIORITA_LAVORAZIONI_DB]);
  const [lavPrefsHydrated, setLavPrefsHydrated] = useState(false);

  const [mag, setMag] = useState<MagazzinoMasterPrefs>(() => ({
    marche: [],
    categorie: [],
    mezziCompatibili: [],
    fornitori: [],
    produttori: [],
  }));
  const [magHydrated, setMagHydrated] = useState(false);

  const [liste, setListe] = useState<MezziListePrefs>(() => createMezziListePrefsDefault());
  const [mezziHydrated, setMezziHydrated] = useState(false);

  const [eco, setEco] = useState<SistemaPreventiviDefaults>(() => ({ costoOrarioDefault: 48 }));
  const [ecoHydrated, setEcoHydrated] = useState(false);
  const [tipiAssenza, setTipiAssenza] = useState<TipoAssenzaConfig[]>(() => defaultTipiAssenza());
  const [dipHydrated, setDipHydrated] = useState(false);
  const [branding, setBranding] = useState<CabBrandingSettings>(() => ({ ...DEFAULT_CAB_BRANDING_SETTINGS }));
  const [brandHydrated, setBrandHydrated] = useState(false);
  const [logoDraft, setLogoDraft] = useState<BrandingLogoUploadDraft>({ pendingFile: null, removeCustomLogo: false });
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const currentSnapshot = useMemo(
    (): SettingsWorkspaceSnapshot => ({
      stati,
      addettiRecords,
      addettoColors,
      prioritaColors,
      prioritaDb,
      mag,
      liste,
      eco,
      tipiAssenza,
      branding,
    }),
    [stati, addettiRecords, addettoColors, prioritaColors, prioritaDb, mag, liste, eco, tipiAssenza, branding],
  );
  const allHydrated = lavPrefsHydrated && magHydrated && mezziHydrated && ecoHydrated && dipHydrated && brandHydrated;
  const hasLogoDraftChanges = Boolean(logoDraft.pendingFile || logoDraft.removeCustomLogo);
  const isSnapshotDirty = useMemo(() => {
    if (!allHydrated || !savedSnapshotRef.current) return false;
    return !areConfigurazioneSnapshotsEqual(currentSnapshot, savedSnapshotRef.current);
  }, [allHydrated, currentSnapshot, savedRevision]);
  const isDirty =
    allHydrated && savedSnapshotRef.current != null && (isSnapshotDirty || hasLogoDraftChanges);

  const handleAddStatoFromLabel = useCallback(
    (label: string) => {
      const next = addStatoFromLabel(stati, label);
      if (!next) {
        gestToast.validation("Stato già presente o nome non valido.");
        return;
      }
      setStati(next);
    },
    [stati],
  );

  useEffect(() => {
    setSettingsModalOpen(open);
    return () => setSettingsModalOpen(false);
  }, [open, setSettingsModalOpen]);

  useEffect(() => {
    if (!open) {
      hydratedSessionRef.current = false;
      return;
    }
    if (!pageMode) {
      setModalSection(settingsDefaultSectionId(false));
      setMobileNavOpen(false);
    }
  }, [open, pageMode]);

  useEffect(() => {
    if (pageMode) {
      hydratedSessionRef.current = false;
    }
  }, [pageMode]);

  useEffect(() => {
    if (!open) return;
    if (hydratedSessionRef.current) return;
    if (!resolvedSettings && settingsPayload.isPending) return;

    hydratedSessionRef.current = true;
    setLavPrefsHydrated(false);
    setMagHydrated(false);
    setMezziHydrated(false);
    setEcoHydrated(false);
    setDipHydrated(false);
    setBrandHydrated(false);

    const r = resolvedSettings ?? resolveCabAppSettingsFromRows([], null);
    const next = snapshotFromResolved(r);
    commitSavedBaseline(next);

    setStati(next.stati);
    setAddettiRecords(next.addettiRecords);
    setAddettoColors(next.addettoColors);
    setPrioritaColors(next.prioritaColors);
    setPrioritaDb(next.prioritaDb);
    setMag(next.mag);
    setListe(next.liste);
    setEco(next.eco);
    setTipiAssenza(next.tipiAssenza);
    setBranding(next.branding);
    setLogoDraft({ pendingFile: null, removeCustomLogo: false });
    setLogoPreviewUrl(null);

    setLavPrefsHydrated(true);
    setMagHydrated(true);
    setMezziHydrated(true);
    setEcoHydrated(true);
    setDipHydrated(true);
    setBrandHydrated(true);
  }, [open, resolvedSettings, settingsPayload.isPending, commitSavedBaseline]);

  const renameQueueRef = useRef<SettingsRenameEntry[]>([]);
  const propagaInFlightRef = useRef(false);
  const [propagaOpen, setPropagaOpen] = useState(false);
  const [propagaPending, setPropagaPending] = useState(false);
  const [propagaError, setPropagaError] = useState<string | null>(null);
  const [propagaProgressLabel, setPropagaProgressLabel] = useState<string | undefined>(undefined);
  const [propagaEntries, setPropagaEntries] = useState<SettingsRenameEntry[]>([]);
  const [propagaImpacts, setPropagaImpacts] = useState<PropagaImpactSummary[]>([]);

  const queueRename = useCallback((entry: SettingsRenameEntry) => {
    renameQueueRef.current = [
      ...renameQueueRef.current.filter((r) => !(r.kind === entry.kind && r.from === entry.from)),
      entry,
    ];
  }, []);

  const labelsForRenameKind = useCallback(
    (kind: SettingsRenameEntry["kind"]): readonly string[] => {
      switch (kind) {
        case "cliente":
          return liste.clienti;
        case "utilizzatore":
          return liste.utilizzatori;
        case "cantiere":
          return liste.cantieri;
        case "mag_marca":
          return mag.marche;
        case "mag_categoria":
          return mag.categorie;
        case "mag_fornitore":
          return mag.fornitori;
        case "mag_produttore":
          return mag.produttori;
        case "tipo_attrezzatura":
          return liste.tipiAttrezzatura;
        case "tipo_telaio":
          return liste.tipiTelaio ?? [];
        case "addetto":
          return addettiRecords.map((r) => r.nome);
        case "hierarchy_marca_attrezzature":
        case "hierarchy_modello_attrezzature":
          return flattenHierarchyRenameLabels(liste.attrezzature);
        case "hierarchy_marca_telai":
        case "hierarchy_modello_telai":
          return flattenHierarchyRenameLabels(liste.telai);
        default:
          return [];
      }
    },
    [addettiRecords, liste, mag],
  );

  useEffect(() => {
    if (!propagaOpen || propagaEntries.length === 0) {
      setPropagaImpacts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const summaries: PropagaImpactSummary[] = [];
      try {
        for (const entry of propagaEntries) {
          const plan = settingsRenameEngineEntry.buildRenamePlan({
            kind: entry.kind,
            oldLabel: entry.from,
            newLabel: entry.to,
            entityId: entry.from,
          });
          const preview = await runWithCorrelationIdAsync(plan.correlationId, () =>
            settingsRenameEngineEntry.previewRename(plan, {
              existingLabels: labelsForRenameKind(entry.kind),
            }),
          );
          if (cancelled) return;
          if (!preview.success || !preview.data) {
            summaries.push({
              entry,
              validationBlocked: true,
              validationWarnings: [preview.error ?? "Anteprima impatto non riuscita"],
            });
            continue;
          }
          const warnings = preview.data.validation.checks
            .filter((c) => c.status === "warning")
            .map((c) => c.message ?? c.name);
          summaries.push({
            entry,
            impact: preview.data.impact,
            validationBlocked: preview.data.validation.status === "blocked",
            validationWarnings: warnings,
          });
        }
        if (!cancelled) setPropagaImpacts(summaries);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Anteprima impatto non riuscita";
        setPropagaImpacts(
          propagaEntries.map((entry) => ({
            entry,
            validationBlocked: true,
            validationWarnings: [message],
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propagaOpen, propagaEntries, labelsForRenameKind]);

  const { gate: addettiGate, similarDialog: addettiSimilarDialog } = useSettingsSimilarGate();

  const persistSnapshot = useCallback(
    async (
      snapshotInput: SettingsWorkspaceSnapshot,
      options?: {
        logBefore?: SettingsWorkspaceSnapshot;
        appendUndoPush?: boolean;
        ignoreLogoDraft?: boolean;
      },
    ): Promise<boolean> => {
      if (!lavPrefsHydrated || !magHydrated || !mezziHydrated || !ecoHydrated || !dipHydrated || !brandHydrated) {
        return false;
      }
      let nextBranding = snapshotInput.branding;
      try {
        if (
          !options?.ignoreLogoDraft &&
          (logoDraft.pendingFile || logoDraft.removeCustomLogo)
        ) {
          nextBranding = await resolveBrandingForSave(snapshotInput.branding, logoDraft);
        }
      } catch (e) {
        gestToast.errorOnce(
          "settings-branding-upload",
          e instanceof Error ? e.message : "Caricamento logo non riuscito",
          { action: "update" },
        );
        return false;
      }
      const snapshotForSave = { ...snapshotInput, branding: nextBranding };
      const payload = mergeAppSettingsUpsertWithVersions(
        buildBulkRowsFromResolved(buildResolvedFromModalSnapshot(snapshotForSave)),
        settingsRows,
      );
      suppressSettingsRemoteNotify(8000);
      try {
        await bulkSave.mutateAsync(payload);
      } catch {
        return false;
      }
      const logBefore = options?.logBefore;
      if (logBefore) {
        appendConfigurazioneLogs(buildConfigurazioneLogEntriesFromSnapshotDiff(logBefore, snapshotForSave, authorName));
      }
      if (
        options?.appendUndoPush &&
        logBefore &&
        user?.id &&
        undoSessionId &&
        !areConfigurazioneSnapshotsEqual(logBefore, snapshotForSave)
      ) {
        pushConfigurazioneUndo({
          beforeSnapshot: logBefore,
          undoSessionId,
          userId: user.id,
          autore: authorName,
        });
      }
      suppressSettingsRemoteNotify(8000);
      commitSavedBaseline(snapshotForSave);
      setBranding(nextBranding);
      setLogoDraft({ pendingFile: null, removeCustomLogo: false });
      if (logoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl(null);
      syncBranding(nextBranding);
      // renameQueueRef: cleared in finalizePropaga after user choice (not here — dialog opens post-save)
      return true;
    },
    [
      bulkSave,
      commitSavedBaseline,
      lavPrefsHydrated,
      magHydrated,
      mezziHydrated,
      ecoHydrated,
      dipHydrated,
      brandHydrated,
      settingsRows,
      authorName,
      logoDraft,
      logoPreviewUrl,
      syncBranding,
      gestToast,
      user?.id,
      undoSessionId,
    ],
  );

  const saveNow = useCallback(async (): Promise<boolean> => {
    const s = currentSnapshot;
    if (!s) return false;
    const before = savedSnapshotRef.current;
    return persistSnapshot(
      s,
      before ? { logBefore: before, appendUndoPush: true } : undefined,
    );
  }, [currentSnapshot, persistSnapshot]);

  const completePendingExit = useCallback(() => {
    const action = pendingExitRef.current;
    pendingExitRef.current = null;
    exitAfterSaveRef.current = false;
    setUnsavedExitOpen(false);
    if (!action) return;
    if (action.kind === "close") {
      onClose?.();
      return;
    }
    router.push(action.href);
  }, [onClose, router]);

  const finalizePropaga = useCallback(async (propagate: boolean) => {
    if (propagaInFlightRef.current) return;

    const shouldExitAfter = exitAfterSaveRef.current;
    let completeExitAfterSuccess = false;

    propagaInFlightRef.current = true;
    setPropagaPending(true);
    setPropagaError(null);
    setPropagaProgressLabel(undefined);

    const queue = [...renameQueueRef.current];
    let hadError = false;

    try {
      if (!propagate) {
        if (user?.id && queue.length > 0) {
          for (let i = 0; i < queue.length; i += 1) {
            const entry = queue[i]!;
            setPropagaProgressLabel(`Configurazione ${i + 1}/${queue.length}…`);
            const plan = settingsRenameEngineEntry.buildRenamePlan({
              kind: entry.kind,
              oldLabel: entry.from,
              newLabel: entry.to,
              entityId: entry.from,
            });
            await runWithCorrelationIdAsync(plan.correlationId, () =>
              settingsRenameEngineEntry.runRenameJob({
                plan,
                userId: user.id,
                executionMode: "configuration_only",
                existingLabels: labelsForRenameKind(entry.kind),
                propagate: false,
              }),
            );
          }
        }
        renameQueueRef.current = [];
        setPropagaOpen(false);
        setPropagaImpacts([]);
        gestToast.successSaved();
        completeExitAfterSuccess = shouldExitAfter;
        return;
      }

      if (!user?.id) {
        hadError = true;
        setPropagaError("Utente non autenticato");
        gestToast.errorOnce("settings-propaga", "Utente non autenticato", { action: "update" });
        return;
      }

      let total = 0;
      for (let i = 0; i < queue.length; i += 1) {
        const entry = queue[i]!;
        setPropagaProgressLabel(`Aggiornamento ${i + 1}/${queue.length}…`);
        const plan = settingsRenameEngineEntry.buildRenamePlan({
          kind: entry.kind,
          oldLabel: entry.from,
          newLabel: entry.to,
          entityId: entry.from,
        });
        const res = await runWithCorrelationIdAsync(plan.correlationId, () =>
          withRenamePropagationTimeout(() =>
            settingsRenameEngineEntry.runRenameJob({
              plan,
              userId: user.id,
              executionMode: "full",
              existingLabels: labelsForRenameKind(entry.kind),
              propagate: true,
            }),
          ),
        );
        if (!res.success) {
          hadError = true;
          const message = res.error ?? "Propagazione non riuscita";
          setPropagaError(message);
          gestToast.errorOnce("settings-propaga", message, { action: "update" });
          exitAfterSaveRef.current = false;
          return;
        }
        total += res.data?.metrics?.records_updated ?? 0;
        if (total > 0) {
          setPropagaProgressLabel(`${total} record aggiornati…`);
        }
      }

      const propagatedKinds = queue.map((e) => e.kind);
      invalidateAfterSettingsRenamePropagation(queryClient, propagatedKinds);
      gestToast.successOnce(
        "settings-propaga",
        total > 0 ? `Salvataggio completato — ${total} record aggiornati` : "Salvataggio completato",
      );
      renameQueueRef.current = [];
      setPropagaOpen(false);
      setPropagaImpacts([]);
      setPropagaError(null);
      completeExitAfterSuccess = shouldExitAfter;
    } catch (error) {
      hadError = true;
      const message = error instanceof Error ? error.message : "Propagazione non riuscita";
      setPropagaError(message);
      gestToast.errorOnce("settings-propaga", message, { action: "update" });
      exitAfterSaveRef.current = false;
    } finally {
      setPropagaPending(false);
      setPropagaProgressLabel(undefined);
      propagaInFlightRef.current = false;
    }

    if (!hadError && completeExitAfterSuccess) {
      completePendingExit();
    }
  }, [completePendingExit, gestToast, labelsForRenameKind, queryClient, user?.id]);

  const applySnapshot = useCallback((s: SettingsWorkspaceSnapshot) => {
    setLavPrefsHydrated(false);
    setMagHydrated(false);
    setMezziHydrated(false);
    setEcoHydrated(false);
    setDipHydrated(false);
    setBrandHydrated(false);
    setStati(s.stati);
    setAddettiRecords(s.addettiRecords);
    setAddettoColors(s.addettoColors);
    setPrioritaColors(s.prioritaColors);
    setPrioritaDb(s.prioritaDb);
    setMag(s.mag);
    setListe(s.liste);
    setEco(s.eco);
    setTipiAssenza(s.tipiAssenza);
    setBranding(s.branding);
    setLogoDraft({ pendingFile: null, removeCustomLogo: false });
    if (logoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(null);
    setLavPrefsHydrated(true);
    setMagHydrated(true);
    setMezziHydrated(true);
    setEcoHydrated(true);
    setDipHydrated(true);
    setBrandHydrated(true);
  }, [logoPreviewUrl]);

  const undoUltimaConfigurazione = useCallback(async () => {
    if (!undoableConfigSave || bulkSave.isPending) return;
    const ok = await confirm({
      title: "Annullare l'ultima modifica?",
      message: isDirty
        ? "Verrà ripristinata la configurazione globale al salvataggio precedente. Le modifiche non salvate verranno perse."
        : "Verrà ripristinata la configurazione globale al salvataggio precedente.",
      confirmLabel: "Annulla modifica",
      destructive: true,
    });
    if (!ok) return;
    const savedNow = savedSnapshotRef.current;
    applySnapshot(undoableConfigSave.beforeSnapshot);
    const okSave = await persistSnapshot(undoableConfigSave.beforeSnapshot, {
      logBefore: savedNow ?? undefined,
      ignoreLogoDraft: true,
    });
    if (!okSave) {
      gestToast.errorOnce("settings-undo", "Annullamento configurazione non riuscito");
      if (savedNow) applySnapshot(savedNow);
      return;
    }
    markConfigurazioneUndoReverted(undoableConfigSave.id);
    appendConfigurazioneLog({
      tone: "neutral",
      tipoRiga: "UNDO CONFIGURAZIONE",
      oggettoRiga: "Configurazione globale",
      modificaRiga: `• ${authorName.trim() || "Operatore"} ha annullato l'ultimo salvataggio`,
      autore: authorName.trim() || "Operatore",
      atIso: new Date().toISOString(),
    });
    gestToast.info("Ultimo salvataggio annullato");
  }, [
    applySnapshot,
    authorName,
    bulkSave.isPending,
    confirm,
    gestToast,
    isDirty,
    persistSnapshot,
    undoableConfigSave,
  ]);

  const openUnsavedExitDialog = useCallback((action: PendingSettingsExit) => {
    pendingExitRef.current = action;
    setUnsavedExitOpen(true);
  }, []);

  const handleRequestClose = useCallback(() => {
    if (!isDirty) {
      onClose?.();
      return;
    }
    openUnsavedExitDialog({ kind: "close" });
  }, [isDirty, onClose, openUnsavedExitDialog]);

  const handleUnsavedStay = useCallback(() => {
    pendingExitRef.current = null;
    exitAfterSaveRef.current = false;
    setUnsavedExitOpen(false);
  }, []);

  const handleUnsavedDiscard = useCallback(() => {
    const s = savedSnapshotRef.current;
    if (s) {
      applySnapshot(s);
      commitSavedBaseline(s);
    }
    renameQueueRef.current = [];
    completePendingExit();
  }, [applySnapshot, commitSavedBaseline, completePendingExit]);

  const handleUnsavedSaveAndExit = useCallback(() => {
    void saveNow().then((ok) => {
      if (!ok) {
        gestToast.errorOnce("settings-save", "Salvataggio configurazione non riuscito");
        return;
      }
      if (renameQueueRef.current.length > 0) {
        exitAfterSaveRef.current = true;
        setPropagaEntries([...renameQueueRef.current]);
        setPropagaError(null);
        setPropagaOpen(true);
        setUnsavedExitOpen(false);
        return;
      }
      gestToast.successSaved();
      completePendingExit();
    });
  }, [completePendingExit, gestToast, saveNow]);

  const handleSaveNow = useCallback(() => {
    void saveNow().then((ok) => {
      if (!ok) {
        gestToast.errorOnce("settings-save", "Salvataggio configurazione non riuscito");
        return;
      }
      if (renameQueueRef.current.length > 0) {
        setPropagaEntries([...renameQueueRef.current]);
        setPropagaError(null);
        setPropagaOpen(true);
      } else {
        gestToast.successSaved();
      }
    });
  }, [gestToast, saveNow]);

  const handleCancelChanges = useCallback(() => {
    const s = savedSnapshotRef.current;
    if (!s) return;
    void (async () => {
      if (isDirty) {
        const ok = await confirm({
          title: "Annullare modifiche?",
          message: "Tutte le modifiche non salvate verranno perse.",
          destructive: true,
          confirmLabel: "Annulla modifiche",
        });
        if (!ok) return;
      }
      applySnapshot(s);
      commitSavedBaseline(s);
      renameQueueRef.current = [];
      gestToast.info("Modifiche annullate");
    })();
  }, [applySnapshot, commitSavedBaseline, confirm, gestToast, isDirty]);

  useBeforeUnloadWhenDirty(
    open && isDirty,
    "Hai modifiche non salvate alla configurazione.",
  );

  useEffect(() => {
    if (!open || !isDirty) return;
    function onDocumentClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.origin !== window.location.origin) return;
      if (anchor.pathname === window.location.pathname && anchor.search === window.location.search && anchor.hash === window.location.hash) return;
      e.preventDefault();
      e.stopPropagation();
      cancelRouteTransition();
      const href = `${anchor.pathname}${anchor.search}${anchor.hash}`;
      openUnsavedExitDialog({ kind: "navigate", href });
    }
    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [open, isDirty, openUnsavedExitDialog]);

  useEffect(() => () => cancelRouteTransition(), []);

  const patchMag = useCallback((fn: (prev: MagazzinoMasterPrefs) => MagazzinoMasterPrefs) => {
    setMag(fn);
  }, []);

  const lavEmbeddedFocus =
    section === "op-addetti" ? "addetti" : section === "op-stati" ? "stati" : section === "op-priorita" ? "priorita" : null;
  const activeSectionLabel = useMemo(() => {
    const entry = SETTINGS_NAV_STRUCTURE.find((e): e is Extract<(typeof SETTINGS_NAV_STRUCTURE)[number], { kind: "item" }> => e.kind === "item" && e.id === section);
    return entry?.label ?? "Sezione";
  }, [section]);
  const activeGroupLabel = settingsNavGroupForSection(section);
  const sectionTitleId = "settings-active-section-title";

  const magAdd = (key: keyof MagazzinoMasterPrefs, raw: string, clear?: () => void): boolean => {
    const next = addUniqueToStringList(mag[key] as string[], raw);
    if (!next) return false;
    patchMag((prev) => ({ ...prev, [key]: next }));
    clear?.();
    return true;
  };

  const listeAdd = (
    key: "clienti" | "utilizzatori" | "cantieri" | "tipiAttrezzatura" | "tipiTelaio",
    raw: string,
    clear?: () => void,
  ): boolean => {
    const cur = (liste[key] as string[] | undefined) ?? [];
    const next = addUniqueToStringList(cur, raw);
    if (!next) return false;
    setListe((prev) => ({ ...prev, [key]: next }));
    clear?.();
    return true;
  };

  type SettingsDeleteConfirm = {
    label: string;
    detail?: string;
    onConfirm: () => void;
  } | null;
  const [settingsDeleteConfirm, setSettingsDeleteConfirm] = useState<SettingsDeleteConfirm>(null);

  if (!open) return null;

  const settingsModalHeader = !pageMode ? (
    <LavorazioniModalHeader
      title="Configurazione globale"
      subtitle={activeSectionLabel}
      onRequestClose={handleRequestClose}
      actions={
        <>
          <button
            type="button"
            className={`${erpBtnNeutral} h-9 min-w-9 shrink-0 px-2 text-base md:hidden`}
            onClick={() => setMobileNavOpen(true)}
            aria-label="Apri sezioni configurazione"
            aria-expanded={mobileNavOpen}
          >
            ☰
          </button>
          <button
            type="button"
            className={`${erpBtnNeutral} hidden h-9 min-w-9 shrink-0 px-2 text-base md:inline-flex`}
            onClick={() => setDesktopNavOpen((v) => !v)}
            aria-label={desktopNavOpen ? "Comprimi sezioni configurazione" : "Espandi sezioni configurazione"}
            aria-expanded={desktopNavOpen}
          >
            ☰
          </button>
        </>
      }
    />
  ) : null;

  const settingsMenuItems = useMemo((): PageActionItem[] => [
    pageActionUndoItem({
      canUndo: Boolean(undoableConfigSave) || isDirty,
      undoPending: bulkSave.isPending,
      onUndo: () => {
        if (undoableConfigSave) void undoUltimaConfigurazione();
        else if (isDirty) void handleCancelChanges();
      },
    }),
    pageActionLogItem(() => setConfigLogOpen(true), "Log attività"),
    {
      id: "save",
      label: "Salva modifiche",
      description: "Salva tutte le modifiche alla configurazione",
      onSelect: () => void handleSaveNow(),
      disabled: !isDirty || bulkSave.isPending,
      loading: bulkSave.isPending,
    },
    {
      id: "cancel",
      label: "Annulla modifiche",
      description: "Ripristina le modifiche non salvate",
      onSelect: () => void handleCancelChanges(),
      disabled: !isDirty || bulkSave.isPending,
    },
  ], [undoableConfigSave, isDirty, bulkSave.isPending]);

  const settingsPageHeader = pageMode ? (
    <div className={`${SETTINGS_PAGE_HEADER_WRAP} flex flex-wrap items-center justify-end gap-2`}>
      <div className={gestionalePageToolbarActionsClass}>
        {isDirty ? (
          <GestionaleDirtySaveActions
            isDirty={isDirty}
            saving={bulkSave.isPending}
            onCancel={handleCancelChanges}
            onSave={handleSaveNow}
            saveTitle="Salva tutte le modifiche alla configurazione globale"
          />
        ) : null}
        <PageHeaderPageActionMenu items={settingsMenuItems} />
      </div>
    </div>
  ) : null;

  const content = (
    <>
      <div
        className={
          pageMode
            ? SETTINGS_PAGE_SHELL_PAGE
            : "relative flex min-h-0 w-full min-w-0 flex-col max-md:max-h-[min(100dvh,calc(var(--cab-vv-height,100dvh)))] max-md:min-h-0 max-md:flex-1 max-md:overflow-hidden md:h-[min(88dvh,900px)] md:overflow-hidden"
        }
      >
        {mobileNavOpen && !pageMode ? (
          <div className="absolute inset-0 z-20 bg-[var(--cab-overlay)] backdrop-blur-[1px] md:hidden" role="presentation" onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMobileNavOpen(false);
          }}>
            <aside className="flex h-full w-[min(82vw,20rem)] flex-col border-r border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-2xl" aria-label="Sezioni configurazione">
              <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--cab-border)] px-3 py-2.5">
                <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Sezioni</h3>
                <CloseButton onClick={() => setMobileNavOpen(false)} />
              </header>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <SettingsNavSidebar
                  section={section}
                  onPickSection={pickSection}
                  variant="page"
                />
              </div>
            </aside>
          </div>
        ) : null}

        {pageMode ? settingsPageHeader : null}
        <div className={pageMode ? SETTINGS_PAGE_MASTER_ROW : SETTINGS_PAGE_GRID_MODAL}>
          {pageMode ? (
            <aside
              ref={settingsSidebarRef}
              className={`${SETTINGS_SIDEBAR_SHELL} ${desktopNavOpen ? "md:flex" : "md:hidden"}`}
            >
              <SettingsNavSidebar
                section={section}
                onPickSection={pickSection}
                variant="page"
              />
            </aside>
          ) : (
          <aside
            className={
              `${desktopNavOpen ? "md:flex" : "md:hidden"} hidden w-[15rem] shrink-0 flex-col border-[color:var(--cab-border)] bg-[var(--cab-card)] border-r lg:w-[16rem]`
            }
          >
            <SettingsNavSidebar
              section={section}
              onPickSection={pickSection}
              variant="default"
            />
          </aside>
          )}

          <SettingsMainPanel
            pageMode={pageMode}
            sectionTitleId={pageMode ? sectionTitleId : undefined}
            className={
              pageMode
                ? SETTINGS_MAIN_PANEL
                : "gestionale-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-2.5 max-sm:[scrollbar-gutter:auto] sm:p-4"
            }
          >
            {pageMode ? (
              <SettingsSectionHeader
                groupLabel={section === SETTINGS_NAV_OVERVIEW_ID ? undefined : activeGroupLabel}
                title={activeSectionLabel}
                titleId={sectionTitleId}
              />
            ) : null}

            {lavEmbeddedFocus ? (
              <>
                {section === "op-addetti" ? (
                  <div className="mb-3 flex justify-end">
                    <SettingsImportBar entity="settings_addetti" />
                  </div>
                ) : null}
              <SettingsLavorazioniModalLazy
                layout="embedded"
                embeddedFocus={lavEmbeddedFocus}
                stati={stati}
                onAddStatoFromLabel={handleAddStatoFromLabel}
                prioritaColors={prioritaColors}
                onChangePrioritaColor={(p, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  setPrioritaColors((prev) => ({ ...prev, [p]: nh }));
                }}
                onChangeStatoLabel={(id, label) => setStati((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)))}
                onChangeStatoColor={(id, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  setStati((prev) => prev.map((s) => (s.id === id ? { ...s, color: nh } : s)));
                }}
                onReorderStato={(from, to) => setStati((prev) => reorderStatiList(prev, from, to))}
                onRemoveStato={(id) => {
                  if (id === STATO_LAVORAZIONE_COMPLETATA_DB) {
                    gestToast.validation("Lo stato «Completata» non può essere eliminato.");
                    return;
                  }
                  if (attiveStatoIds.has(id)) {
                    gestToast.validation("Impossibile eliminare: stato in uso su lavorazioni attive.");
                    return;
                  }
                  if (storicoStatoIds.has(id)) {
                    gestToast.validation("Impossibile eliminare: stato in uso nello storico.");
                    return;
                  }
                  const nome = stati.find((s) => s.id === id)?.label ?? id;
                  setSettingsDeleteConfirm({
                    label: nome,
                    onConfirm: () => {
                      setStati((prev) => prev.filter((s) => s.id !== id));
                      setSettingsDeleteConfirm(null);
                    },
                  });
                }}
                addettiRecords={addettiRecords}
                addettoColors={addettoColors}
                onAddAddetto={({ nome, cognome }) => {
                  const t = nome.trim();
                  if (!t) return;
                  const legacyNomi = addettiLegacyNomi(addettiRecords);
                  addettiGate(legacyNomi, t, undefined, () => {
                    const id = createAddettoId();
                    const rec: AddettoRecord = { id, nome: t, cognome: cognome?.trim() || null, colorKey: id };
                    setAddettiRecords((prev) => [...prev, rec]);
                    setAddettoColors((prev) => assignColorForNewAddettoById(prev, rec));
                  });
                }}
                onUpdateAddetto={(id, patch) => {
                  const rec = findAddettoById(addettiRecords, id);
                  if (!rec) return;
                  if (patch.nome !== undefined) {
                    const t = patch.nome.trim();
                    if (!t || t === rec.nome) return;
                    const legacyNomi = addettiLegacyNomi(addettiRecords);
                    addettiGate(legacyNomi, t, rec.nome, () => {
                      setAddettiRecords((prev) =>
                        prev.map((r) => (r.id === id ? { ...r, nome: t } : r)),
                      );
                      // ponytail: colore keyed su id — rename nome non sposta hex
                      queueRename({
                        kind: "addetto",
                        from: rec.nome,
                        to: t,
                        fromAliases: addettoStoredNameAliases(rec),
                      });
                      dispatchAddettoDisplayRename({ previousName: rec.nome, nextName: t });
                    });
                    return;
                  }
                  if (patch.cognome !== undefined) {
                    setAddettiRecords((prev) =>
                      prev.map((r) =>
                        r.id === id ? { ...r, cognome: patch.cognome?.trim() ? patch.cognome.trim() : null } : r,
                      ),
                    );
                  }
                }}
                onChangeAddettoColor={(colorKey, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  setAddettoColors((prev) => ({ ...prev, [colorKey]: nh }));
                }}
                onRemoveAddetto={(id) => {
                  const rec = findAddettoById(addettiRecords, id);
                  if (!rec) return;
                  const name = rec.nome;
                  const inUse = attiviAddetti.has(name) || storicoAddetti.has(name);
                  setSettingsDeleteConfirm({
                    label: name,
                    detail: inUse
                      ? "Compare in lavorazioni già registrate. Verrà rimosso solo dalle liste di selezione future; i record esistenti manterranno il nome."
                      : undefined,
                    onConfirm: () => {
                      setAddettiRecords((prev) => prev.filter((r) => r.id !== id));
                      setAddettoColors((prev) => removeAddettoFromColorMapById(prev, rec));
                      setSettingsDeleteConfirm(null);
                    },
                  });
                }}
                attiviStatoIds={attiveStatoIds}
                storicoStatoIds={storicoStatoIds}
                attiviAddetti={attiviAddetti}
                storicoAddetti={storicoAddetti}
                onRequestClose={handleRequestClose}
              />
              </>
            ) : null}

            {section === "op-dipendenti-assenze" ? (
              <div className="w-full">
                <SettingsDipendentiAssenzeSection layout={listLayout} tipi={tipiAssenza} onChange={setTipiAssenza} />
              </div>
            ) : null}

            {section === "mag-marche" ? (
              <div className="w-full">
                <SettingsImportBar entity="settings_marche" />
                <SettingsMagazzinoMarcheList
                  layout={listLayout}
                  mag={mag}
                  setMag={setMag}
                  onRename={(from, to) => queueRename({ kind: "mag_marca", from, to })}
                />
              </div>
            ) : null}

            {section === "mag-fornitori" ? (
              <div className="w-full">
                <SettingsImportBar entity="settings_fornitori" />
                <SettingsMagazzinoFornitoriList
                  layout={listLayout}
                  mag={mag}
                  setMag={setMag}
                  onRename={(from, to) => queueRename({ kind: "mag_fornitore", from, to })}
                />
              </div>
            ) : null}

            {section === "mag-produttori" ? (
              <div className="w-full">
                <SettingsImportBar entity="settings_produttori" />
                <SettingsUnifiedStringList
                  layout={listLayout}
                  title="Produttori"
                  values={mag.produttori ?? []}
                  placeholder="Nuovo produttore"
                  onAdd={(t) => {
                    magAdd("produttori", t);
                  }}
                  onRemove={(m) => {
                    patchMag((prev) => ({
                      ...prev,
                      produttori: (prev.produttori ?? []).filter((x) => x !== m),
                    }));
                  }}
                  onRename={(from, to) => {
                    patchMag((prev) => ({
                      ...prev,
                      produttori: renameInStringList(prev.produttori ?? [], from, to),
                    }));
                    queueRename({ kind: "mag_produttore", from, to });
                  }}
                />
              </div>
            ) : null}

            {section === "mag-categorie" ? (
              <div className="w-full">
                <SettingsImportBar entity="settings_categorie" />
                <SettingsUnifiedStringList
                  layout={listLayout}
                  title="Categorie magazzino"
                  values={mag.categorie}
                  placeholder="Nuova categoria"
                  onAdd={(t) => {
                    magAdd("categorie", t);
                  }}
                  onRemove={(m) => {
                    patchMag((prev) => ({ ...prev, categorie: prev.categorie.filter((x) => x !== m) }));
                  }}
                  onRename={(from, to) => {
                    patchMag((prev) => ({ ...prev, categorie: renameInStringList(prev.categorie, from, to) }));
                    queueRename({ kind: "mag_categoria", from, to });
                  }}
                />
              </div>
            ) : null}

            {section === "att-tipo" ? (
              <div className="w-full">
                <SettingsUnifiedStringList
                  layout={listLayout}
                  title="Tipo attrezzatura"
                  values={liste.tipiAttrezzatura}
                  placeholder="Nuovo tipo attrezzatura"
                  onAdd={(t) => {
                    listeAdd("tipiAttrezzatura", t);
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({ ...prev, tipiAttrezzatura: prev.tipiAttrezzatura.filter((x) => x !== m) }));
                  }}
                  onRename={(from, to) => {
                    setListe((prev) => ({
                      ...prev,
                      tipiAttrezzatura: renameInStringList(prev.tipiAttrezzatura, from, to),
                    }));
                    queueRename({ kind: "tipo_attrezzatura", from, to });
                  }}
                />
              </div>
            ) : null}

            {section === "att-marca" ? (
              <>
                <p className="mb-4 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  Gerarchia attrezzature sincronizzata dalla flotta; le preferenze qui servono solo per ricambi orfani
                  senza match in anagrafica mezzi.
                </p>
                <SettingsImportBar entity="settings_hierarchy_attrezzature" />
              <HierarchyTreeSettingsSectionLazy
                treeKey="attrezzature"
                variant="marca"
                liste={liste}
                setListe={setListe}
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_attrezzature", from, to, tree: "attrezzature" })}
                onRenameModello={(marcaContext, from, to) =>
                  queueRename({ kind: "hierarchy_modello_attrezzature", from, to, marcaContext, tree: "attrezzature" })
                }
              />
              </>
            ) : null}

            {section === "att-modello" ? (
              <HierarchyTreeSettingsSectionLazy
                treeKey="attrezzature"
                variant="modello"
                liste={liste}
                setListe={setListe}
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_attrezzature", from, to, tree: "attrezzature" })}
                onRenameModello={(marcaContext, from, to) =>
                  queueRename({ kind: "hierarchy_modello_attrezzature", from, to, marcaContext, tree: "attrezzature" })
                }
              />
            ) : null}

            {section === "tel-tipo" ? (
              <div className="w-full">
                <SettingsUnifiedStringList
                  layout={listLayout}
                  title="Tipo telaio"
                  values={liste.tipiTelaio ?? []}
                  placeholder="Nuovo tipo telaio"
                  onAdd={(t) => {
                    listeAdd("tipiTelaio", t);
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({
                      ...prev,
                      tipiTelaio: (prev.tipiTelaio ?? []).filter((x) => x !== m),
                    }));
                  }}
                  onRename={(from, to) => {
                    setListe((prev) => ({
                      ...prev,
                      tipiTelaio: renameInStringList(prev.tipiTelaio ?? [], from, to),
                    }));
                    queueRename({ kind: "tipo_telaio", from, to });
                  }}
                />
              </div>
            ) : null}

            {section === "tel-marca" ? (
              <>
                <SettingsImportBar entity="settings_hierarchy_telai" />
                <HierarchyTreeSettingsSectionLazy
                treeKey="telai"
                variant="marca"
                liste={liste}
                setListe={setListe}
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_telai", from, to, tree: "telai" })}
                onRenameModello={(marcaContext, from, to) =>
                  queueRename({ kind: "hierarchy_modello_telai", from, to, marcaContext, tree: "telai" })
                }
              />
              </>
            ) : null}

            {section === "tel-modello" ? (
              <HierarchyTreeSettingsSectionLazy
                treeKey="telai"
                variant="modello"
                liste={liste}
                setListe={setListe}
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_telai", from, to, tree: "telai" })}
                onRenameModello={(marcaContext, from, to) =>
                  queueRename({ kind: "hierarchy_modello_telai", from, to, marcaContext, tree: "telai" })
                }
              />
            ) : null}

            {section === "cli-cliente" ? (
              <div className="w-full">
                <SettingsClientiCommercialiList
                  layout={listLayout}
                  liste={liste}
                  setListe={setListe}
                  onAdd={(t) => {
                    setListe((prev) => registerClienteInListe(prev, t));
                  }}
                  onRemove={(m) => {
                    setListe((prev) => {
                      const next = removeScontoRicambiCliente(prev, m);
                      return { ...next, clienti: next.clienti.filter((x) => x !== m) };
                    });
                  }}
                  onRename={(from, to) => queueRename({ kind: "cliente", from, to })}
                />
              </div>
            ) : null}

            {section === "cli-utilizzatore" ? (
              <div className="w-full">
                <SettingsImportBar entity="settings_utilizzatori" />
                <SettingsUnifiedStringList
                  layout={listLayout}
                  title="Utilizzatori"
                  values={liste.utilizzatori}
                  placeholder="Nuovo utilizzatore"
                  onAdd={(t) => {
                    listeAdd("utilizzatori", t);
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({ ...prev, utilizzatori: prev.utilizzatori.filter((x) => x !== m) }));
                  }}
                  onRename={(from, to) => {
                    setListe((prev) => ({
                      ...prev,
                      utilizzatori: renameInStringList(prev.utilizzatori, from, to),
                    }));
                    queueRename({ kind: "utilizzatore", from, to });
                  }}
                />
              </div>
            ) : null}

            {section === "cli-cantiere" ? (
              <div className="w-full">
                <SettingsImportBar entity="settings_cantieri" />
                <SettingsUnifiedStringList
                  layout={listLayout}
                  title="Cantieri"
                  values={liste.cantieri}
                  placeholder="Nuovo cantiere"
                  onAdd={(t) => {
                    listeAdd("cantieri", t);
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({ ...prev, cantieri: prev.cantieri.filter((x) => x !== m) }));
                  }}
                  onRename={(from, to) => {
                    setListe((prev) => ({
                      ...prev,
                      cantieri: renameInStringList(prev.cantieri, from, to),
                    }));
                    queueRename({ kind: "cantiere", from, to });
                  }}
                />
              </div>
            ) : null}

            {section === SETTINGS_NAV_OVERVIEW_ID ? (
              <SettingsOverviewSection onPickSection={pickSection} />
            ) : null}

            {section === "brand-personalizzazione" ? (
              <SettingsBrandingSectionLazy
                layout={listLayout}
                branding={branding}
                onBrandingChange={setBranding}
                logoDraft={logoDraft}
                onLogoDraftChange={setLogoDraft}
                logoPreviewUrl={logoPreviewUrl}
                onLogoPreviewUrlChange={setLogoPreviewUrl}
                onResetBranding={() => {
                  setBranding({ ...DEFAULT_CAB_BRANDING_SETTINGS });
                  setLogoDraft({ pendingFile: null, removeCustomLogo: true });
                  if (logoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
                  setLogoPreviewUrl(null);
                }}
              />
            ) : null}

            {section === "sys-officina-profilo" ? <SettingsOfficinaProfiloSection /> : null}

            {section === "sys-comunicazioni" ? <SettingsComunicazioniSection /> : null}

            {section === "sys-economici" ? (
              <SettingsEconomiciSectionLazy
                layout={listLayout}
                costoOrarioDefault={eco.costoOrarioDefault}
                onChange={(v) => setEco({ costoOrarioDefault: v })}
              />
            ) : null}

            {section === "sys-tkb-kb" ? <SettingsTkbAdminSectionLazy /> : null}

            {pageMode ? <div aria-hidden className={dsGestionaleScrollEndPad} /> : null}
          </SettingsMainPanel>
        </div>
      </div>
      {settingsDeleteConfirm != null ? (
        <SettingsEliminaConfirmDialogLazy
          open
          itemLabel={settingsDeleteConfirm.label}
          detail={settingsDeleteConfirm.detail}
          onCancel={() => setSettingsDeleteConfirm(null)}
          onConfirm={() => settingsDeleteConfirm.onConfirm()}
        />
      ) : null}
      {propagaOpen ? (
        <SettingsRinominaPropagaDialogLazy
          open
          entries={propagaEntries}
          impactSummaries={propagaImpacts}
          pending={propagaPending}
          progressLabel={propagaProgressLabel}
          errorMessage={propagaError}
          onCancel={() => void finalizePropaga(false)}
          onConfirm={() => void finalizePropaga(true)}
        />
      ) : null}
      {addettiSimilarDialog}
      {confirmDialog}
      <GestionaleUnsavedChangesDialog
        open={unsavedExitOpen}
        placement="stacked"
        title="Modifiche non salvate"
        message="Hai modifiche non salvate alla configurazione. Come vuoi procedere?"
        stayLabel="Torna indietro"
        discardLabel="Esci senza salvare"
        saveAndExitLabel="Salva ed esci"
        pending={bulkSave.isPending}
        onStay={handleUnsavedStay}
        onDiscard={handleUnsavedDiscard}
        onSaveAndExit={handleUnsavedSaveAndExit}
      />
    </>
  );

  if (pageMode) {
    return (
      <div className={layoutPageRoot}>
        <div className={SETTINGS_PAGE_STACK}>
          <div className="md:hidden">
            <SettingsMobileSectionPicker
              open={mobileNavOpen}
              activeLabel={activeSectionLabel}
              activeGroupLabel={activeGroupLabel}
              onToggle={() => setMobileNavOpen((v) => !v)}
              onClose={() => setMobileNavOpen(false)}
              section={section}
              onPickSection={pickSection}
            />
          </div>
          {content}
        </div>
        <Drawer
          open={configLogOpen}
          onClose={() => setConfigLogOpen(false)}
          title="Log modifiche"
          ariaLabel="Log modifiche configurazione"
        >
          <div className={gestionaleLogDrawerPanelClass}>
            {configLogOpen ? <ConfigurazioneLogListEmbeddedLazy paged /> : null}
          </div>
        </Drawer>
      </div>
    );
  }

  return (
    <LavorazioniModalShell
      modalSize="formLarge"
      alignTop
      onRequestClose={handleRequestClose}
      header={settingsModalHeader ?? undefined}
    >
      {content}
    </LavorazioniModalShell>
  );
}

