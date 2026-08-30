import type { Metadata } from "next";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { PWA_DESCRIPTION } from "@/lib/pwa/pwa-config";
import {
  getReportHubArea,
  REPORT_HUB_AREAS,
  type ReportHubAreaId,
} from "@/lib/report/report-hub-areas-config";

/** Separatore titoli pagina — brand aggiunto solo da title.template root. */
export const APP_PAGE_TITLE_SEPARATOR = " · " as const;

/** Route esenti da metadata dedicato (redirect, ecc.). */
export const PAGE_METADATA_COVERAGE_EXEMPT = [
  "app/page.tsx",
] as const;

export type AppPageRoutePath =
  | "/dashboard"
  | "/agenda"
  | "/lavorazioni"
  | "/lavorazioni-clienti"
  | "/preventivi"
  | "/ordini-fornitori"
  | "/fatturazione"
  | "/documenti"
  | "/magazzino"
  | "/magazzino/carichi"
  | "/magazzino/carichi/nuovo"
  | "/identifica-ricambio"
  | "/mezzi"
  | "/dipendenti"
  | "/report"
  | "/report/panoramica"
  | "/report/lavorazioni"
  | "/report/magazzino"
  | "/report/dipendenti"
  | "/report/preventivi"
  | "/report/mezzi"
  | "/report/economia"
  | "/report/clienti"
  | "/report/trasversali"
  | "/report/contesto"
  | "/report/ai"
  | "/report/design-system-preview"
  | "/impostazioni"
  | "/impostazioni/ai-providers"
  | "/sicurezza"
  | "/sicurezza/production-readiness"
  | "/acesso-negato"
  | "/login"
  | "/login/reset-password"
  | "/privacy-policy"
  | "/termini-e-condizioni"
  | "/offline"
  | "/m/q/errore";

export type AppPageRouteConfig = {
  title: string;
  description?: string;
};

const REPORT_AREA_TITLE_OVERRIDES: Partial<Record<ReportHubAreaId, string>> = {
  economia: "Analisi economica",
};

/** Unisce segmenti pagina — mai il brand applicativo. */
export function formatPageTitle(...segments: string[]): string {
  return segments.map((s) => s.trim()).filter(Boolean).join(APP_PAGE_TITLE_SEPARATOR);
}

export function buildPageMetadata(
  pageTitle: string,
  opts?: { description?: string },
): Metadata {
  const metadata: Metadata = { title: pageTitle.trim() };
  const description = opts?.description?.trim();
  if (description) metadata.description = description;
  return metadata;
}

export function reportAreaPageTitle(areaId: ReportHubAreaId): string {
  if (areaId === "ai") return "Report AI";
  const label = REPORT_AREA_TITLE_OVERRIDES[areaId] ?? getReportHubArea(areaId)?.label ?? areaId;
  return formatPageTitle(label, "Report");
}

function routeConfig(title: string, description?: string): AppPageRouteConfig {
  return description ? { title, description } : { title };
}

function reportAreaRouteConfig(areaId: ReportHubAreaId): AppPageRouteConfig {
  const area = getReportHubArea(areaId);
  return {
    title: reportAreaPageTitle(areaId),
    description: area?.description,
  };
}

/** Registry SSOT titoli pre-brand per route statiche. */
export const GESTIONALE_ROUTE_TITLES: Record<AppPageRoutePath, AppPageRouteConfig> = {
  "/dashboard": routeConfig("Dashboard", "Panoramica operativa dell'officina"),
  "/agenda": routeConfig("Agenda", "Pianificazione sessioni e attività officina"),
  "/lavorazioni": routeConfig("Lavorazioni", "Gestione interventi e stato lavorazioni"),
  "/lavorazioni-clienti": routeConfig("Portale clienti", "Area clienti per stato lavorazioni"),
  "/preventivi": routeConfig("Preventivi", "Preventivi e offerte"),
  "/ordini-fornitori": routeConfig("Ordini fornitori", "Ordini e approvvigionamento"),
  "/fatturazione": routeConfig("Fatturazione", "Emissione e gestione fatture"),
  "/documenti": routeConfig("Documenti", "Archivio e acquisizione documenti"),
  "/magazzino": routeConfig("Magazzino", "Giacenze e movimenti ricambi"),
  "/magazzino/carichi": routeConfig("Carichi di magazzino", "Registrazione carichi da DDT"),
  "/magazzino/carichi/nuovo": routeConfig("Nuovo carico", "Wizard registrazione nuovo carico DDT"),
  "/identifica-ricambio": routeConfig(
    "Identifica ricambio",
    "Identificazione ricambio da foto e cataloghi OEM",
  ),
  "/mezzi": routeConfig("Mezzi", "Parco mezzi e attrezzature"),
  "/dipendenti": routeConfig("Dipendenti", "Anagrafica e presenze"),
  "/report": routeConfig("Report", "Hub reportistica e analisi"),
  "/report/panoramica": reportAreaRouteConfig("panoramica"),
  "/report/lavorazioni": reportAreaRouteConfig("lavorazioni"),
  "/report/magazzino": reportAreaRouteConfig("magazzino"),
  "/report/dipendenti": reportAreaRouteConfig("dipendenti"),
  "/report/preventivi": reportAreaRouteConfig("preventivi"),
  "/report/mezzi": reportAreaRouteConfig("mezzi"),
  "/report/economia": reportAreaRouteConfig("economia"),
  "/report/clienti": reportAreaRouteConfig("clienti"),
  "/report/trasversali": reportAreaRouteConfig("trasversali"),
  "/report/contesto": reportAreaRouteConfig("contesto"),
  "/report/ai": reportAreaRouteConfig("ai"),
  "/report/design-system-preview": routeConfig(
    formatPageTitle("Anteprima design system", "Report"),
    "Anteprima componenti report (sviluppo)",
  ),
  "/impostazioni": routeConfig("Impostazioni", "Configurazione del gestionale"),
  "/impostazioni/ai-providers": routeConfig(
    formatPageTitle("Provider AI", "Impostazioni"),
    "Configurazione provider AI",
  ),
  "/sicurezza": routeConfig("Sicurezza", "Audit, accessi e sicurezza"),
  "/sicurezza/production-readiness": routeConfig(
    formatPageTitle("Prontezza operativa", "Sicurezza"),
    "Checklist pre-produzione",
  ),
  "/acesso-negato": routeConfig("Accesso negato", "Permessi insufficienti"),
  "/login": routeConfig("Accedi", "Accesso all'area riservata del gestionale officina"),
  "/login/reset-password": routeConfig("Reimposta password", "Imposta una nuova password di accesso"),
  "/privacy-policy": routeConfig(
    "Informativa privacy",
    "Informativa sul trattamento dei dati personali ai sensi del GDPR",
  ),
  "/termini-e-condizioni": routeConfig(
    "Termini e condizioni",
    "Termini e condizioni di utilizzo dell'area riservata",
  ),
  "/offline": routeConfig("Connessione assente", "Contenuto disponibile senza connessione di rete"),
  "/m/q/errore": routeConfig("QR non valido", "Identificativo mezzo non disponibile o accesso non consentito"),
};

function metadataForRoute(path: AppPageRoutePath): Metadata {
  const config = GESTIONALE_ROUTE_TITLES[path];
  return buildPageMetadata(config.title, { description: config.description });
}

/** Metadata pre-esportati per re-export nelle page.tsx. */
export const dashboardPageMetadata = metadataForRoute("/dashboard");
export const agendaPageMetadata = metadataForRoute("/agenda");
export const lavorazioniPageMetadata = metadataForRoute("/lavorazioni");
export const lavorazioniClientiPageMetadata = metadataForRoute("/lavorazioni-clienti");
export const preventiviPageMetadata = metadataForRoute("/preventivi");
export const ordiniFornitoriPageMetadata = metadataForRoute("/ordini-fornitori");
export const fatturazionePageMetadata = metadataForRoute("/fatturazione");
export const documentiPageMetadata = metadataForRoute("/documenti");
export const magazzinoPageMetadata = metadataForRoute("/magazzino");
export const magazzinoCarichiPageMetadata = metadataForRoute("/magazzino/carichi");
export const magazzinoCarichiNuovoPageMetadata = metadataForRoute("/magazzino/carichi/nuovo");
export const identificaRicambioPageMetadata = metadataForRoute("/identifica-ricambio");
export const mezziPageMetadata = metadataForRoute("/mezzi");
export const dipendentiPageMetadata = metadataForRoute("/dipendenti");
export const reportPageMetadata = metadataForRoute("/report");
export const reportPanoramicaPageMetadata = metadataForRoute("/report/panoramica");
export const reportLavorazioniPageMetadata = metadataForRoute("/report/lavorazioni");
export const reportMagazzinoPageMetadata = metadataForRoute("/report/magazzino");
export const reportDipendentiPageMetadata = metadataForRoute("/report/dipendenti");
export const reportPreventiviPageMetadata = metadataForRoute("/report/preventivi");
export const reportMezziPageMetadata = metadataForRoute("/report/mezzi");
export const reportEconomiaPageMetadata = metadataForRoute("/report/economia");
export const reportClientiPageMetadata = metadataForRoute("/report/clienti");
export const reportTrasversaliPageMetadata = metadataForRoute("/report/trasversali");
export const reportContestoPageMetadata = metadataForRoute("/report/contesto");
export const reportAiPageMetadata = metadataForRoute("/report/ai");
export const reportDesignSystemPreviewPageMetadata = metadataForRoute("/report/design-system-preview");
export const impostazioniPageMetadata = metadataForRoute("/impostazioni");
export const impostazioniAiProvidersPageMetadata = metadataForRoute("/impostazioni/ai-providers");
export const sicurezzaPageMetadata = metadataForRoute("/sicurezza");
export const sicurezzaProductionReadinessPageMetadata = metadataForRoute("/sicurezza/production-readiness");
export const accessoNegatoPageMetadata = metadataForRoute("/acesso-negato");
export const loginPageMetadata = metadataForRoute("/login");
export const loginResetPasswordPageMetadata = metadataForRoute("/login/reset-password");
export const privacyPolicyPageMetadata = metadataForRoute("/privacy-policy");
export const terminiECondizioniPageMetadata = metadataForRoute("/termini-e-condizioni");
export const offlinePageMetadata = metadataForRoute("/offline");
export const mezzoQrErrorePageMetadata = metadataForRoute("/m/q/errore");
export const notFoundPageMetadata = buildPageMetadata("Pagina non trovata", {
  description: "La pagina richiesta non esiste o non è più disponibile",
});

/** Verifica che il registry report copra tutte le aree hub. */
export function assertReportHubMetadataCoverage(): void {
  for (const area of REPORT_HUB_AREAS) {
    const path = area.href as AppPageRoutePath;
    if (!GESTIONALE_ROUTE_TITLES[path]) {
      throw new Error(`GESTIONALE_ROUTE_TITLES manca entry per ${path}`);
    }
  }
}

/** Brand completo — solo per template root e global-error. */
export const APP_PAGE_TITLE_BRAND = CAB_APP_PRODUCT_NAME;

/** Description default app — allineata a PWA. */
export const APP_PAGE_DEFAULT_DESCRIPTION = PWA_DESCRIPTION;
