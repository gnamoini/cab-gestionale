import type { ReactNode, SVGProps } from "react";

function SvgIcon(props: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  const { children, className, ...rest } = props;
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

export function IconNavDashboard(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M4 11h6V4H4v7zm10 0h6V4h-6v7zM4 20h6v-7H4v7zm10 0h6v-7h-6v7z" />
    </SvgIcon>
  );
}

export function IconNavAgenda(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h2M14 14h2" />
    </SvgIcon>
  );
}

export function IconNavSecurity(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </SvgIcon>
  );
}

export function IconNavLavorazioni(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </SvgIcon>
  );
}

export function IconNavMagazzino(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </SvgIcon>
  );
}

export function IconNavDocumenti(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </SvgIcon>
  );
}

export function IconNavMezzi(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M14 18V6a2 2 0 00-2-2H4a2 2 0 00-2 2v11a1 1 0 001 1h1" />
      <path d="M15 18h2M14 10h7l3 3v5a1 1 0 01-1 1h-1" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </SvgIcon>
  );
}

export function IconNavPreventivi(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h6" />
    </SvgIcon>
  );
}

export function IconNavFatturazione(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M7 3h10a2 2 0 012 2v16l-3-1.5L13 21l-3-1.5L7 21l-3-1.5V5a2 2 0 012-2z" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </SvgIcon>
  );
}

export function IconNavReport(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </SvgIcon>
  );
}

export function IconNavSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
      <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 01-2.83 2.83l-.06-.06A1.7 1.7 0 0015 19.36a1.7 1.7 0 00-1 .32 1.7 1.7 0 00-.7 1.52V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.12-1.58 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.7 1.7 0 003.64 15a1.7 1.7 0 00-.32-1 1.7 1.7 0 00-1.52-.7H1.7a2 2 0 010-4h.1a1.7 1.7 0 001.58-1.12 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 012.83-2.83l.06.06A1.7 1.7 0 007 3.64a1.7 1.7 0 001-.32 1.7 1.7 0 00.7-1.52V1.7a2 2 0 014 0v.1a1.7 1.7 0 001.12 1.58 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 012.83 2.83l-.06.06A1.7 1.7 0 0020.36 7c.1.35.1.72 0 1.07.2.1.43.16.68.16h.26a2 2 0 010 4h-.1a1.7 1.7 0 00-1.58 1.12c-.08.2-.15.42-.22.65z" />
    </SvgIcon>
  );
}

export function IconNavLavorazioniClient(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M9 12h6M9 16h4" />
      <path d="M7 4h7l3 3v13H7V4Z" strokeLinejoin="round" />
      <path d="M14 4v4h4" />
      <circle cx="17" cy="17" r="3" />
      <path d="M17 15.5v3M15.5 17h3" strokeWidth="1.4" />
    </SvgIcon>
  );
}

export function IconNavDipendenti(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </SvgIcon>
  );
}

export function IconNavOrdiniFornitori(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M16 3H5a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2V8l-5-5z" />
      <path d="M15 3v5h5M8 13h8M8 17h5" />
      <path d="M3 9h4v10H3V9z" />
    </SvgIcon>
  );
}

export function IconNavIdentificaRicambio(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19h14" />
      <path d="M8 16h8v3H8z" />
    </SvgIcon>
  );
}
