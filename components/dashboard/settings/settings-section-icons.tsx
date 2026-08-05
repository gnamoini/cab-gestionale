import type { ReactNode, SVGProps } from "react";
import { IconNavMezzi } from "@/components/gestionale/gestionale-nav-config";
import type { SistemaSectionId } from "@/components/dashboard/settings/settings-workspace-types";

function SettingsSvgIcon({
  children,
  className,
  ...rest
}: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4 shrink-0"}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

function IconPanoramica(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </SettingsSvgIcon>
  );
}

function IconBrand(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M12 3c3.5 4.5 7 7.2 7 11a7 7 0 11-14 0c0-3.8 3.5-6.5 7-11z" />
    </SettingsSvgIcon>
  );
}

function IconAddetti(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </SettingsSvgIcon>
  );
}

function IconAssenze(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </SettingsSvgIcon>
  );
}

function IconStati(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <circle cx="5" cy="6" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="5" cy="18" r="1.5" />
      <path d="M9 6h11M9 12h11M9 18h11" />
    </SettingsSvgIcon>
  );
}

function IconPriorita(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </SettingsSvgIcon>
  );
}

function IconMarche(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <circle cx="7" cy="7" r="1.5" />
    </SettingsSvgIcon>
  );
}

function IconFornitori(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path d="M9 22V12h6v10" />
    </SettingsSvgIcon>
  );
}

function IconProduttori(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V11l4-3 4 3v10" />
      <path d="M13 21V9l6-4v16" />
      <path d="M7 15h2M7 18h2" />
      <path d="M15 13h2M15 16h2" />
      <path d="M16 5V3" />
      <path d="M18 6V4" />
    </SettingsSvgIcon>
  );
}

function IconCategorie(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" />
    </SettingsSvgIcon>
  );
}

function IconCliente(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6M23 11h-6" />
    </SettingsSvgIcon>
  );
}

function IconCantiere(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M2 20h20" />
      <path d="M5 20V9l7-4 7 4v11" />
      <path d="M9 20v-6h6v6" />
    </SettingsSvgIcon>
  );
}

function IconUtilizzatore(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M20 21v-2a4 4 0 00-3-3.87" />
      <path d="M4 21v-2a4 4 0 013-3.87" />
      <circle cx="12" cy="7" r="4" />
    </SettingsSvgIcon>
  );
}

function IconAttrezzaturaTipo(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </SettingsSvgIcon>
  );
}

function IconAttMarca(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
    </SettingsSvgIcon>
  );
}

function IconAttModello(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M12 2L3 7l9 5 9-5-9-5z" />
      <path d="M3 12l9 5 9-5M3 17l9 5 9-5" />
    </SettingsSvgIcon>
  );
}

function IconEconomici(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </SettingsSvgIcon>
  );
}

function IconComunicazioni(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
    </SettingsSvgIcon>
  );
}

function IconPropagazione(props: SVGProps<SVGSVGElement>) {
  return (
    <SettingsSvgIcon {...props}>
      <path d="M7 7h11v11" />
      <path d="M7 17L17 7" />
      <path d="M4 4v6h6M20 20v-6h-6" />
    </SettingsSvgIcon>
  );
}

export type SettingsSectionIconComponent = (props: SVGProps<SVGSVGElement>) => ReactNode;

export const SETTINGS_SECTION_ICONS: Record<SistemaSectionId, SettingsSectionIconComponent> = {
  "sys-panoramica": IconPanoramica,
  "brand-personalizzazione": IconBrand,
  "op-addetti": IconAddetti,
  "op-dipendenti-assenze": IconAssenze,
  "op-stati": IconStati,
  "op-priorita": IconPriorita,
  "mag-marche": IconMarche,
  "mag-fornitori": IconFornitori,
  "mag-produttori": IconProduttori,
  "mag-categorie": IconCategorie,
  "cli-cliente": IconCliente,
  "cli-cantiere": IconCantiere,
  "cli-utilizzatore": IconUtilizzatore,
  "att-tipo": IconAttrezzaturaTipo,
  "att-piani-tagliando": IconAttrezzaturaTipo,
  "att-marca": IconAttMarca,
  "att-modello": IconAttModello,
  "tel-tipo": IconNavMezzi,
  "tel-marca": IconAttMarca,
  "tel-modello": IconAttModello,
  "sys-officina-profilo": IconNavMezzi,
  "sys-comunicazioni": IconComunicazioni,
  "sys-stato-propagazioni": IconPropagazione,
  "sys-economici": IconEconomici,
  "sys-tkb-kb": IconEconomici,
};

export function SettingsSectionIcon({
  sectionId,
  className = "h-4 w-4",
}: {
  sectionId: SistemaSectionId;
  className?: string;
}) {
  const Icon = SETTINGS_SECTION_ICONS[sectionId];
  if (!Icon) return null;
  return <Icon className={className} />;
}
