import { isMagazzinoNotificationsPath } from "@/lib/lavorazioni/admin-notifications";
import {
  didCrossToZero,
  shouldNotifyStockCrossing,
  type StockSnapshot,
} from "@/lib/magazzino/ricambio-stock-crossing";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MagazzinoSottoScortaNotification } from "@/lib/notifications/admin-dashboard-notifications";

export function ricambioToMagazzinoSottoScortaNotification(
  ricambio: RicambioMagazzino,
  createdAt?: string,
  esaurito = false,
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
    esaurito,
    createdAt: now,
  };
}

export function magazzinoCrossingToNotification(input: {
  ricambioId: string;
  prev: StockSnapshot | undefined;
  curr: StockSnapshot;
  ricambio?: RicambioMagazzino | null;
  pathname: string;
}): MagazzinoSottoScortaNotification | null {
  const { ricambioId, prev, curr, ricambio, pathname } = input;
  if (isMagazzinoNotificationsPath(pathname)) return null;
  if (!shouldNotifyStockCrossing(prev, curr)) return null;

  const esaurito = prev ? didCrossToZero(prev, curr) : curr.scorta === 0;

  if (ricambio?.id === ricambioId) {
    return ricambioToMagazzinoSottoScortaNotification(ricambio, undefined, esaurito);
  }

  return {
    kind: "magazzino_sotto_scorta",
    id: ricambioId,
    ricambioId,
    marca: ricambio?.marca?.trim() || "—",
    descrizione: ricambio?.descrizione?.trim() || "—",
    scorta: curr.scorta,
    scortaMinima: curr.scortaMinima,
    esaurito,
    createdAt: new Date().toISOString(),
  };
}
