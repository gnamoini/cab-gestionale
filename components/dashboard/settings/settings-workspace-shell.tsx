"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useBranding } from "@/context/branding-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { Drawer } from "@/components/design-system";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { LavorazioniModalHeader, LavorazioniModalShell, SettingsLavorazioniModal } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { ConfigurazioneLogListEmbedded } from "@/components/configurazione/configurazione-log-section";
import { HierarchyTreeSettingsSection } from "@/components/dashboard/hierarchy-tree-settings-section";
import { MagazzinoFornitoriProduttoriSettings, magazzinoMasterOnFornitoreRemove, magazzinoMasterOnFornitoreRename } from "@/components/dashboard/magazzino-fornitori-produttori-settings";
import { SettingsBrandingSection } from "@/components/dashboard/settings-branding-section";
import { SettingsClientiCommercialiList } from "@/components/dashboard/settings/settings-clienti-list";
import { SettingsMagazzinoMarcheList } from "@/components/dashboard/settings/settings-magazzino-marche-list";
import { SettingsMainPanel, SettingsMobileSectionPicker, SettingsNavMenuList } from "@/components/dashboard/settings/settings-nav-shell";
import { SettingsUnifiedStringList } from "@/components/dashboard/settings/settings-unified-string-list";
import {
  SETTINGS_NAV_STRUCTURE,
  SETTINGS_SECTION_DESCRIPTIONS,
  settingsNavGroupForSection,
  type SistemaSectionId,
} from "@/components/dashboard/settings/settings-workspace-types";
import { SettingsDipendentiAssenzeSection } from "@/components/dashboard/settings-dipendenti-assenze-section";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import { SettingsRinominaPropagaDialog } from "@/components/dashboard/settings-rinomina-propaga-dialog";
import {
  SettingsSectionHeader,
  SETTINGS_ACTION_CARD,
  SETTINGS_MAIN_PANEL,
  SETTINGS_PAGE_GRID,
  SETTINGS_PAGE_SHELL,
  SETTINGS_SECTION_CARD,
  SETTINGS_SIDEBAR_SHELL,
} from "@/components/dashboard/settings-list-ui";
import { useSettingsSimilarGate } from "@/components/dashboard/use-settings-similar-gate";
import { OperatorGlobalSettingsPilotBadge } from "@/components/gestionale/operator-global-settings-pilot-badge";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import { CloseButton } from "@/components/design-system";
import {
  DEFAULT_CAB_BRANDING_SETTINGS,
  type CabBrandingSettings,
} from "@/lib/branding/branding-settings-model";
import { resolveBrandingForSave, type BrandingLogoUploadDraft } from "@/lib/branding/branding-logo-upload";
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
  createAddettoId,
  defaultAddettiRecords,
  findAddettoById,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import {
  assignColorForNewAddetto,
  removeAddettoFromColorMap,
  renameAddettoInColorMap,
  syncAddettoColorMap,
} from "@/lib/lavorazioni/addetto-colors-assign";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { registerClienteInListe, removeScontoRicambiCliente } from "@/lib/mezzi/cliente-commerciale";
import { createMezziListePrefsDefault, type MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { migratePreventiviLocalToDb } from "@/lib/preventivi/migrate-preventivi-local-to-db";
import { loadPreventivi } from "@/lib/preventivi/preventivi-storage";
import { addUniqueToStringList, renameInStringList } from "@/lib/settings/settings-list-mutations";
import type { SettingsRenameEntry } from "@/lib/settings/settings-rename-types";
import { dispatchAddettoDisplayRename } from "@/lib/sistema/cab-events";
import { suppressSettingsRemoteNotify } from "@/lib/sistema/settings-remote-notify-guard";
import type { SistemaPreventiviDefaults } from "@/lib/sistema/sistema-preventivi-defaults-storage";
import { cancelRouteTransition } from "@/src/lib/navigation/route-transition";
import { buildBulkRowsFromResolved, resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";
import { DEFAULT_PRIORITA_LAVORAZIONI_DB } from "@/src/lib/app-settings/resolve-from-rows";
import { invalidateAfterSettingsRenamePropagation } from "@/src/lib/react-query/invalidate-related";
import { useSettingsModalOpen } from "@/src/context/settings-modal-open-context";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useLavorazioniAddettiInUsoQuery } from "@/src/hooks/gestionale/use-lavorazioni-addetti-in-uso";
import { useLavorazioniStatiInUsoQuery } from "@/src/hooks/gestionale/use-lavorazioni-stati-in-uso";
import { useCabAppSettingsPayloadQuery, useSettingsBulkMutation } from "@/src/hooks/gestionale/use-settings-queries";
import { useUndoableConfigurazioneSave } from "@/src/hooks/gestionale/use-undoable-configurazione-save";
import { mergeAppSettingsUpsertWithVersions } from "@/src/services/settings.service";
import { settingsRenamePropagationService } from "@/src/services/settings-rename-propagation.service";
import {
  addStatoFromLabel,
  DEFAULT_STATI_LAVORAZIONI_DB,
  reorderStatiList,
  STATO_LAVORAZIONE_COMPLETATA_DB,
} from "@/src/shared/selectors";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  dsBtnPrimary,
  dsFocus,
  dsInput,
  dsPageToolbarBtn,
  dsPageToolbarMetaChipAccent,
  dsStackPage,
} from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

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
  const queryClient = useQueryClient();
  const mezziListQ = useMezziListQuery(undefined, { enabled: open });
  const [migratePreventiviPending, setMigratePreventiviPending] = useState(false);
  const localPreventiviCount = useMemo(() => {
    if (!open || typeof window === "undefined") return 0;
    return loadPreventivi().length;
  }, [open, migratePreventiviPending]);
  const { setOpen: setSettingsModalOpen } = useSettingsModalOpen();
  const { syncBranding } = useBranding();
  const settingsPayload = useCabAppSettingsPayloadQuery({ enabled: open });
  const resolvedSettings = settingsPayload.data?.resolved;
  const settingsRows = settingsPayload.data?.rows ?? [];
  const pageMode = surface === "page";
  const bulkSave = useSettingsBulkMutation();
  const { undoable: undoableConfigSave, sessionId: undoSessionId } = useUndoableConfigurazioneSave({
    enabled: open && pageMode,
  });
  const statiInUsoQ = useLavorazioniStatiInUsoQuery({ enabled: open });
  const addettiInUsoQ = useLavorazioniAddettiInUsoQuery({ enabled: open });

  const savedSnapshotRef = useRef<SettingsWorkspaceSnapshot | null>(null);
  /** Evita reset sezione/stato locale su refetch React Query mentre il modal resta aperto. */
  const hydratedSessionRef = useRef(false);
  const [savedRevision, setSavedRevision] = useState(0);

  const commitSavedBaseline = useCallback((s: SettingsWorkspaceSnapshot) => {
    savedSnapshotRef.current = s;
    setSavedRevision((n) => n + 1);
  }, []);

  const [section, setSection] = useState<SistemaSectionId>(() => "brand-personalizzazione");
  const [navQ, setNavQ] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopNavOpen, setDesktopNavOpen] = useState(true);
  const [configLogOpen, setConfigLogOpen] = useState(false);
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);

  type PendingSettingsExit = { kind: "close" } | { kind: "navigate"; href: string };
  const pendingExitRef = useRef<PendingSettingsExit | null>(null);
  const exitAfterSaveRef = useRef(false);

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
    syncAddettoColorMap([...DEFAULT_ADDETTI_LAVORAZIONI], undefined),
  );
  const [prioritaColors, setPrioritaColors] = useState<Partial<Record<PrioritaLav, string>>>({});
  const [prioritaDb, setPrioritaDb] = useState<PrioritaLavorazione[]>(() => [...DEFAULT_PRIORITA_LAVORAZIONI_DB]);
  const [lavPrefsHydrated, setLavPrefsHydrated] = useState(false);

  const [mag, setMag] = useState<MagazzinoMasterPrefs>(() => ({
    marche: [],
    categorie: [],
    mezziCompatibili: [],
    fornitori: [],
  }));
  const [magHydrated, setMagHydrated] = useState(false);
  const [nuovaMarca, setNuovaMarca] = useState("");
  const [nuovaCategoria, setNuovaCategoria] = useState("");
  const [nuovoFornitore, setNuovoFornitore] = useState("");
  const [nuovoCliente, setNuovoCliente] = useState("");
  const [nuovoUtilizzatore, setNuovoUtilizzatore] = useState("");
  const [nuovoCantiere, setNuovoCantiere] = useState("");
  const [nuovoTipoAttrezzatura, setNuovoTipoAttrezzatura] = useState("");
  const [nuovoTipoTelaio, setNuovoTipoTelaio] = useState("");

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
    setSection("brand-personalizzazione");
    setNavQ("");
    setMobileNavOpen(false);
  }, [open]);

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
  const [propagaOpen, setPropagaOpen] = useState(false);
  const [propagaPending, setPropagaPending] = useState(false);
  const [propagaEntries, setPropagaEntries] = useState<SettingsRenameEntry[]>([]);

  const queueRename = useCallback((entry: SettingsRenameEntry) => {
    renameQueueRef.current = [
      ...renameQueueRef.current.filter((r) => !(r.kind === entry.kind && r.from === entry.from)),
      entry,
    ];
  }, []);

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
      renameQueueRef.current = [];
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
    const shouldExitAfter = exitAfterSaveRef.current;
    if (!propagate) {
      renameQueueRef.current = [];
      setPropagaOpen(false);
      gestToast.successSaved();
      if (shouldExitAfter) completePendingExit();
      return;
    }
    setPropagaPending(true);
    const res = await settingsRenamePropagationService.propagateRenames(renameQueueRef.current);
    setPropagaPending(false);
    setPropagaOpen(false);
    if (!res.success) {
      gestToast.errorOnce("settings-propaga", res.error ?? "Propagazione non riuscita", { action: "update" });
      exitAfterSaveRef.current = false;
      return;
    }
    const propagatedKinds = renameQueueRef.current.map((e) => e.kind);
    renameQueueRef.current = [];
    invalidateAfterSettingsRenamePropagation(queryClient, propagatedKinds);
    const total = (res.data ?? []).reduce((sum, r) => sum + r.updated, 0);
    gestToast.successOnce(
      "settings-propaga",
      total > 0 ? `Salvataggio completato — ${total} record aggiornati` : "Salvataggio completato",
    );
    if (shouldExitAfter) completePendingExit();
  }, [completePendingExit, gestToast, queryClient]);

  const runPreventiviLocalMigration = useCallback(async () => {
    if (migratePreventiviPending) return;
    const mezziRows = mezziListQ.data ?? [];
    if (mezziRows.length === 0) {
      gestToast.warning("Attendi il caricamento mezzi prima di migrare i preventivi.");
      return;
    }
    if (localPreventiviCount === 0) {
      gestToast.info("Nessun preventivo in localStorage da importare.");
      return;
    }
    const okMigrate = await confirm({
      title: "Importare preventivi locali?",
      message: `Importare ${localPreventiviCount} preventivi da localStorage verso il database? L'operazione è idempotente.`,
      confirmLabel: "Importa",
    });
    if (!okMigrate) return;
    setMigratePreventiviPending(true);
    try {
      const res = await migratePreventiviLocalToDb(mezziRows, {
        queryClient,
        clearLocalOnSuccess: true,
      });
      if (res.errors.length > 0) {
        gestToast.warning(
          `Migrati ${res.migrated}, saltati ${res.skipped}. Primi errori: ${res.errors.slice(0, 2).join("; ")}`,
        );
      } else {
        gestToast.successOnce(
          "settings-migrate-preventivi",
          `Import completato: ${res.migrated} preventivi sincronizzati.`,
        );
      }
    } catch {
      gestToast.errorOnce("settings-migrate-preventivi", "Migrazione preventivi non riuscita.");
    } finally {
      setMigratePreventiviPending(false);
    }
  }, [confirm, gestToast, localPreventiviCount, mezziListQ.data, migratePreventiviPending, queryClient]);

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
      gestToast.info("Modifiche annullate");
    })();
  }, [applySnapshot, commitSavedBaseline, confirm, gestToast, isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "Hai modifiche non salvate. Vuoi davvero uscire?";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
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
  }, [isDirty, openUnsavedExitDialog]);

  useEffect(() => () => cancelRouteTransition(), []);

  const patchMag = useCallback((fn: (prev: MagazzinoMasterPrefs) => MagazzinoMasterPrefs) => {
    setMag(fn);
  }, []);

  const filteredNav = useMemo(() => {
    const q = navQ.trim().toLowerCase();
    if (!q) return SETTINGS_NAV_STRUCTURE;
    return SETTINGS_NAV_STRUCTURE.filter((e) => (e.kind === "group" ? e.label.toLowerCase().includes(q) : `${e.label}`.toLowerCase().includes(q)));
  }, [navQ]);

  const lavEmbeddedFocus =
    section === "op-addetti" ? "addetti" : section === "op-stati" ? "stati" : section === "op-priorita" ? "priorita" : null;
  const activeSectionLabel = useMemo(() => {
    const entry = SETTINGS_NAV_STRUCTURE.find((e): e is Extract<(typeof SETTINGS_NAV_STRUCTURE)[number], { kind: "item" }> => e.kind === "item" && e.id === section);
    return entry?.label ?? "Sezione";
  }, [section]);
  const activeGroupLabel = settingsNavGroupForSection(section);
  const sectionTitleId = "settings-active-section-title";

  const magAdd = (key: keyof MagazzinoMasterPrefs, raw: string, clear: () => void): boolean => {
    const next = addUniqueToStringList(mag[key] as string[], raw);
    if (!next) return false;
    patchMag((prev) => ({ ...prev, [key]: next }));
    clear();
    return true;
  };

  const listeAdd = (
    key: "clienti" | "utilizzatori" | "cantieri" | "tipiAttrezzatura" | "tipiTelaio",
    raw: string,
    clear: () => void,
  ): boolean => {
    const cur = (liste[key] as string[] | undefined) ?? [];
    const next = addUniqueToStringList(cur, raw);
    if (!next) return false;
    setListe((prev) => ({ ...prev, [key]: next }));
    clear();
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

  const content = (
    <>
      <div
        className={
          pageMode
            ? SETTINGS_PAGE_SHELL
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
              <div className="shrink-0 border-b border-[color:var(--cab-border)] p-2">
                <GestionaleSearchField
                  value={navQ}
                  onChange={(e) => setNavQ(e.target.value)}
                  placeholder="Cerca…"
                  autoComplete="off"
                  aria-label="Cerca nelle sezioni configurazione"
                />
              </div>
              <SettingsNavMenuList
                filteredNav={filteredNav}
                section={section}
                navClassName="min-h-0 flex-1 max-h-none"
                onPickSection={(id) => {
                  setSection(id);
                  setMobileNavOpen(false);
                }}
              />
            </aside>
          </div>
        ) : null}

        <div className={pageMode ? SETTINGS_PAGE_GRID : "flex min-h-0 min-w-0 flex-1 overflow-hidden"}>
          <aside
            className={
              pageMode
                ? `${SETTINGS_SIDEBAR_SHELL} ${desktopNavOpen ? "md:flex" : "md:hidden"}`
                : `${desktopNavOpen ? "md:flex" : "md:hidden"} hidden w-[13.75rem] shrink-0 flex-col border-[color:var(--cab-border)] bg-[var(--cab-card)] border-r`
            }
          >
            <div className="shrink-0 border-b border-[color:var(--cab-border)] p-2">
              <GestionaleSearchField
                value={navQ}
                onChange={(e) => setNavQ(e.target.value)}
                placeholder="Cerca…"
                autoComplete="off"
                aria-label="Cerca nelle sezioni configurazione"
              />
            </div>
            <SettingsNavMenuList
              filteredNav={filteredNav}
              section={section}
              onPickSection={setSection}
              navClassName={
                pageMode
                  ? "gestionale-scrollbar min-h-0 flex-1 overflow-y-auto max-h-none"
                  : "gestionale-scrollbar min-h-0 flex-1 overflow-y-auto"
              }
            />
          </aside>

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
                groupLabel={activeGroupLabel}
                title={activeSectionLabel}
                titleId={sectionTitleId}
                description={SETTINGS_SECTION_DESCRIPTIONS[section]}
              />
            ) : null}

            {lavEmbeddedFocus ? (
              <SettingsLavorazioniModal
                layout="embedded"
                embeddedFocus={lavEmbeddedFocus}
                stati={stati}
                onAddStatoFromLabel={handleAddStatoFromLabel}
                prioritaDb={prioritaDb}
                prioritaColors={prioritaColors}
                onChangePrioritaDb={(next) => {
                  setPrioritaDb(next);
                }}
                onChangePrioritaColor={(p, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  setPrioritaColors((prev) => ({ ...prev, [p]: nh }));
                }}
                onChangeStatoLabel={(id, label) => setStati((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)))}
                onChangeStatoColor={(id, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  const nome = stati.find((s) => s.id === id)?.label ?? id;
                  setStati((prev) => prev.map((s) => (s.id === id ? { ...s, color: nh } : s)));
                }}
                onChangeStatoClosed={(id, closed) =>
                  setStati((prev) =>
                    prev.map((s) => {
                      if (s.id !== id) return s;
                      if (closed) return { ...s, closed: true };
                      const { closed: _omit, ...rest } = s;
                      return rest;
                    }),
                  )
                }
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
                    setAddettiRecords((prev) => [
                      ...prev,
                      { id: createAddettoId(), nome: t, cognome: cognome?.trim() || null },
                    ]);
                    setAddettoColors((prev) => assignColorForNewAddetto(prev, t));
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
                      setAddettoColors((prev) => renameAddettoInColorMap(prev, rec.nome, t));
                      queueRename({ kind: "addetto", from: rec.nome, to: t });
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
                onChangeAddettoColor={(nome, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  setAddettoColors((prev) => ({ ...prev, [nome]: nh }));
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
                      setAddettoColors((prev) => removeAddettoFromColorMap(prev, name));
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
            ) : null}

            {section === "op-dipendenti-assenze" ? (
              <div className="w-full min-w-0 max-w-2xl">
                <SettingsDipendentiAssenzeSection tipi={tipiAssenza} onChange={setTipiAssenza} />
              </div>
            ) : null}

            {section === "mag-marche" ? (
              <div className="w-full">
                <SettingsMagazzinoMarcheList
                  mag={mag}
                  setMag={setMag}
                  nuovo={nuovaMarca}
                  setNuovo={setNuovaMarca}
                  onRename={(from, to) => queueRename({ kind: "mag_marca", from, to })}
                />
              </div>
            ) : null}

            {section === "mag-fornitori" ? (
              <div className="w-full">
                <SettingsUnifiedStringList
                  title="Fornitori alternativi"
                  values={mag.fornitori}
                  nuovo={nuovoFornitore}
                  setNuovo={setNuovoFornitore}
                  placeholder="Nuovo fornitore"
                  onAdd={(t) => {
                    magAdd("fornitori", t, () => setNuovoFornitore(""));
                  }}
                  onRemove={(m) => {
                    patchMag((prev) =>
                      magazzinoMasterOnFornitoreRemove(
                        { ...prev, fornitori: prev.fornitori.filter((x) => x !== m) },
                        m,
                      ),
                    );
                  }}
                  onRename={(from, to) => {
                    patchMag((prev) =>
                      magazzinoMasterOnFornitoreRename(
                        { ...prev, fornitori: renameInStringList(prev.fornitori, from, to) },
                        from,
                        to,
                      ),
                    );
                    queueRename({ kind: "mag_fornitore", from, to });
                  }}
                />
                <MagazzinoFornitoriProduttoriSettings mag={mag} patchMag={patchMag} />
              </div>
            ) : null}

            {section === "mag-categorie" ? (
              <div className="w-full">
                <SettingsUnifiedStringList
                  title="Categorie magazzino"
                  values={mag.categorie}
                  nuovo={nuovaCategoria}
                  setNuovo={setNuovaCategoria}
                  placeholder="Nuova categoria"
                  onAdd={(t) => {
                    magAdd("categorie", t, () => setNuovaCategoria(""));
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
                  title="Tipo attrezzatura"
                  values={liste.tipiAttrezzatura}
                  nuovo={nuovoTipoAttrezzatura}
                  setNuovo={setNuovoTipoAttrezzatura}
                  placeholder="Nuovo tipo attrezzatura"
                  onAdd={(t) => {
                    listeAdd("tipiAttrezzatura", t, () => setNuovoTipoAttrezzatura(""));
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
              <HierarchyTreeSettingsSection
                treeKey="attrezzature"
                variant="marca"
                liste={liste}
                setListe={setListe}
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_attrezzature", from, to, tree: "attrezzature" })}
                onRenameModello={(marcaContext, from, to) =>
                  queueRename({ kind: "hierarchy_modello_attrezzature", from, to, marcaContext, tree: "attrezzature" })
                }
              />
            ) : null}

            {section === "att-modello" ? (
              <HierarchyTreeSettingsSection
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
                  title="Tipo telaio"
                  values={liste.tipiTelaio ?? []}
                  nuovo={nuovoTipoTelaio}
                  setNuovo={setNuovoTipoTelaio}
                  placeholder="Nuovo tipo telaio"
                  onAdd={(t) => {
                    listeAdd("tipiTelaio", t, () => setNuovoTipoTelaio(""));
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
              <HierarchyTreeSettingsSection
                treeKey="telai"
                variant="marca"
                liste={liste}
                setListe={setListe}
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_telai", from, to, tree: "telai" })}
                onRenameModello={(marcaContext, from, to) =>
                  queueRename({ kind: "hierarchy_modello_telai", from, to, marcaContext, tree: "telai" })
                }
              />
            ) : null}

            {section === "tel-modello" ? (
              <HierarchyTreeSettingsSection
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
                  liste={liste}
                  setListe={setListe}
                  nuovo={nuovoCliente}
                  setNuovo={setNuovoCliente}
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
                <SettingsUnifiedStringList
                  title="Utilizzatori"
                  values={liste.utilizzatori}
                  nuovo={nuovoUtilizzatore}
                  setNuovo={setNuovoUtilizzatore}
                  placeholder="Nuovo utilizzatore"
                  onAdd={(t) => {
                    listeAdd("utilizzatori", t, () => setNuovoUtilizzatore(""));
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
                <SettingsUnifiedStringList
                  title="Cantieri"
                  values={liste.cantieri}
                  nuovo={nuovoCantiere}
                  setNuovo={setNuovoCantiere}
                  placeholder="Nuovo cantiere"
                  onAdd={(t) => {
                    listeAdd("cantieri", t, () => setNuovoCantiere(""));
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

            {section === "brand-personalizzazione" ? (
              <SettingsBrandingSection
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

            {section === "sys-economici" ? (
              <div className="w-full">
                <div className={SETTINGS_SECTION_CARD}>
                  <SettingsSectionHeader
                    level="card"
                    title="Parametri economici"
                    description="Costo manodopera di default per nuovi preventivi e report."
                  />
                  <label htmlFor="config-costo-orario-default" className="mt-4 block text-xs font-medium text-[color:var(--cab-text-muted)]">
                    Costo manodopera default (€/h)
                    <input
                      id="config-costo-orario-default"
                      type="number"
                      inputMode="decimal"
                      min={1}
                      step={0.5}
                      value={eco.costoOrarioDefault}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v) || v <= 0) return;
                        setEco({ costoOrarioDefault: Math.round(v * 100) / 100 });
                      }}
                      className={`${dsInput} mt-1.5 w-full max-w-xs tabular-nums`}
                    />
                  </label>
                </div>
                {/* Admin-only: migrazione one-shot localStorage → DB (non automatica al boot). */}
                <div className={SETTINGS_ACTION_CARD}>
                  <SettingsSectionHeader
                    level="card"
                    title="Migrazione preventivi"
                    description="Importa i preventivi ancora presenti in localStorage verso Supabase. Operazione idempotente, da eseguire una sola volta per ambiente."
                  />
                  <p className="mt-2 text-xs text-[color:var(--cab-text)]">
                    In localStorage: <strong>{localPreventiviCount}</strong> record
                  </p>
                  <button
                    type="button"
                    className={`${dsPageToolbarBtn} mt-3 text-xs`}
                    disabled={migratePreventiviPending || localPreventiviCount === 0 || mezziListQ.isLoading}
                    onClick={() => void runPreventiviLocalMigration()}
                  >
                    {migratePreventiviPending ? "Import in corso…" : "Importa preventivi locali → DB"}
                  </button>
                </div>
              </div>
            ) : null}
          </SettingsMainPanel>
        </div>
      </div>
      <SettingsEliminaConfirmDialog
        open={settingsDeleteConfirm != null}
        itemLabel={settingsDeleteConfirm?.label}
        detail={settingsDeleteConfirm?.detail}
        onCancel={() => setSettingsDeleteConfirm(null)}
        onConfirm={() => settingsDeleteConfirm?.onConfirm()}
      />
      <SettingsRinominaPropagaDialog
        open={propagaOpen}
        entries={propagaEntries}
        pending={propagaPending}
        onCancel={() => void finalizePropaga(false)}
        onConfirm={() => void finalizePropaga(true)}
      />
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
        <PageHeader
          title="Impostazioni"
          description="Configurazione globale del gestionale"
          belowTitle={
            <>
              <OperatorGlobalSettingsPilotBadge />
              <SettingsMobileSectionPicker
                open={mobileNavOpen}
                activeLabel={activeSectionLabel}
                activeGroupLabel={activeGroupLabel}
                onToggle={() => setMobileNavOpen((v) => !v)}
                onClose={() => setMobileNavOpen(false)}
                filteredNav={filteredNav}
                section={section}
                onPickSection={setSection}
                navQ={navQ}
                setNavQ={setNavQ}
              />
            </>
          }
          actions={
            <GestionalePageToolbarActions
              canUndo={Boolean(undoableConfigSave) || isDirty}
              undoPending={bulkSave.isPending}
              onUndo={() => {
                if (undoableConfigSave) void undoUltimaConfigurazione();
                else if (isDirty) void handleCancelChanges();
              }}
              onOpenLog={() => setConfigLogOpen(true)}
              logTitle="Storico modifiche configurazione"
              overflowActions={
                <>
                  {isDirty ? (
                    <span className={`${dsPageToolbarMetaChipAccent} hidden sm:inline-flex`} role="status">
                      Modifiche non salvate
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className={dsPageToolbarBtn}
                    onClick={handleCancelChanges}
                    disabled={!isDirty || bulkSave.isPending}
                    title="Ripristina le modifiche non salvate"
                  >
                    Annulla modifiche
                  </button>
                  <button
                    type="button"
                    className={dsBtnPrimary}
                    onClick={handleSaveNow}
                    disabled={!isDirty || bulkSave.isPending}
                    title="Salva tutte le modifiche alla configurazione globale"
                    aria-busy={bulkSave.isPending}
                  >
                    {bulkSave.isPending ? "Salvataggio…" : isDirty ? "Salva modifiche" : "Salva"}
                  </button>
                </>
              }
            />
          }
        />
        <div className={dsStackPage}>{content}</div>
        <Drawer
          open={configLogOpen}
          onClose={() => setConfigLogOpen(false)}
          title="Log modifiche"
          ariaLabel="Log modifiche configurazione"
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3">
            <ConfigurazioneLogListEmbedded paged />
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

