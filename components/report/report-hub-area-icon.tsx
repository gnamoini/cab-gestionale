import type { ReportHubAreaId } from "@/lib/report/report-hub-areas-config";
import type { ReactElement, ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden {...props}>
      {children}
    </svg>
  );
}

const ICONS: Record<ReportHubAreaId, (props: IconProps) => ReactElement> = {
  panoramica: (props) => (
    <IconBase {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 17V9m4 8V7m4 10v-6" />
    </IconBase>
  ),
  lavorazioni: (props) => (
    <IconBase {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </IconBase>
  ),
  magazzino: (props) => (
    <IconBase {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </IconBase>
  ),
  dipendenti: (props) => (
    <IconBase {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </IconBase>
  ),
  preventivi: (props) => (
    <IconBase {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </IconBase>
  ),
  mezzi: (props) => (
    <IconBase {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 17h8M6 11l1.5-4h9L18 11M6 11H4l1 6h14l1-6h-2M7 17a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zm10 0a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0z"
      />
    </IconBase>
  ),
  economia: (props) => (
    <IconBase {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </IconBase>
  ),
  clienti: (props) => (
    <IconBase {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </IconBase>
  ),
  trasversali: (props) => (
    <IconBase {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </IconBase>
  ),
  contesto: (props) => (
    <IconBase {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </IconBase>
  ),
  ai: (props) => (
    <IconBase {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M8 21h8a2 2 0 002-2v-9a6 6 0 00-12 0v9a2 2 0 002 2z"
      />
    </IconBase>
  ),
};

export function ReportHubAreaIcon({ areaId, className = "h-5 w-5" }: { areaId: ReportHubAreaId; className?: string }) {
  const Icon = ICONS[areaId];
  return <Icon className={className} />;
}
