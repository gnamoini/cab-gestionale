import { GESTIONALE_NAV, type GestionaleNavHref } from "@/components/gestionale/gestionale-nav-config";

export type MobilePageHeaderBack = {
  href: string;
  label: string;
};

const NAV_LABEL_BY_HREF = new Map<GestionaleNavHref, string>(
  GESTIONALE_NAV.map((item) => [item.href, item.label]),
);

function normalizePathname(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

/** Sotto-pagina shell compatta: back verso il parent nav (es. dettaglio portale → lista). */
export function resolveMobilePageHeaderBack(pathname: string): MobilePageHeaderBack | null {
  const normalized = normalizePathname(pathname);
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  const parentHref = `/${segments.slice(0, -1).join("/")}`;
  const parentLabel = NAV_LABEL_BY_HREF.get(parentHref as GestionaleNavHref);
  if (!parentLabel) return null;

  return {
    href: parentHref,
    label: `Torna a ${parentLabel}`,
  };
}

if (process.env.NODE_ENV !== "production") {
  const sample = resolveMobilePageHeaderBack("/lavorazioni-clienti/abc-123");
  console.assert(sample?.href === "/lavorazioni-clienti", "mobile back: portale clienti parent");
  console.assert(resolveMobilePageHeaderBack("/dashboard") === null, "mobile back: root page");
}
