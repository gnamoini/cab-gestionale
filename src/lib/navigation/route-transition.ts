/** True when `href` is already the active section (exact route or direct child path). */
export function isNavTargetCurrent(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

export const ROUTE_LOADING_FAILSAFE_MS = 10_000;
