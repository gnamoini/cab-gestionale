import { isMagazzinoNotificationsPath } from "@/lib/lavorazioni/admin-notifications";
import {
  didCrossBelowMin,
  type StockSnapshot,
} from "@/lib/magazzino/ricambio-stock-crossing";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MagazzinoSottoScortaNotification } from "@/lib/notifications/admin-dashboard-notifications";

export function ricambioToMagazzinoSottoScortaNotification(
  ricambio: RicambioMagazzino,
  createdAt?: string,
): MagazzinoSottoScortaNotification {
  const now = createdAt?.trim() || new Date().toISOString();
  return {
    kind: "magazzino_sotto_scorta",
    id: ricambio.id,
    ricambioId: ricambio.id,
    marca: ricambio.marca?.trim() || "—",
    descrizione: ricambio.descrizione?.trim() || "—",
    scorta: Math.max(0, Math.round(ricambio.scorta)),
    scortaMinima: Math.max(0, Math.round(ricambio.scortaMinima)),
    createdAt: now,
  };
}

export function magazzinoCrossingToNotification(input: {
  ricambioId: string;
  prev: StockSnapshot | undefined;
  curr: StockSnapshot;
  ricambio?: RicambioMagazzino | null;
  pathname: string;
  isAdmin: boolean;
}): MagazzinoSottoScortaNotification | null {
  const { ricambioId, prev, curr, ricambio, pathname, isAdmin } = input;
  if (!isAdmin) return null;
  if (isMagazzinoNotificationsPath(pathname)) return null;
  if (!prev) return null;
  if (!didCrossBelowMin(prev, curr)) return null;

  if (ricambio?.id === ricambioId) {
    return ricambioToMagazzinoSottoScortaNotification(ricambio);
  }

  return {
    kind: "magazzino_sotto_scorta",
    id: ricambioId,
    ricambioId,
    marca: ricambio?.marca?.trim() || "—",
    descrizione: ricambio?.descrizione?.trim() || "—",
    scorta: curr.scorta,
    scortaMinima: curr.scortaMinima,
    createdAt: new Date().toISOString(),
  };
}
