import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import { mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { AuthLogAction, AuthLogWithProfileRow } from "@/src/types/supabase-tables";

export type DashboardMagStats = {
  sotto: number;
  cap: number;
  tot: number;
};

export type DashboardLavPreviewRow = {
  id: string;
  stato: string;
  macchina: string;
};

export type SecurityAuthAggregates = {
  recentLogins: AuthLogWithProfileRow[];
  recentLoginFailed: AuthLogWithProfileRow[];
  activeTodayCount: number;
  activeTodayIds: string[];
  lastAccessPerUser: {
    userId: string;
    nome: string;
    email: string;
    lastAt: string;
    lastAction: AuthLogAction;
  }[];
};

function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isTodayLocal(iso: string): boolean {
  return isSameLocalCalendarDay(new Date(iso), new Date());
}

function macchinaLabelFromLavRow(row: LavorazioneListRow): string {
  const m = row.mezzo;
  return m ? `${m.marca} ${m.modello}`.trim() : "—";
}

/** KPI magazzino da righe DB (read-only derivazione). */
export function computeDashboardMagStatsFromRows(
  rows: readonly MagazzinoRicambioRow[],
  staging = false,
  mezziListe?: MezziListePrefs,
): DashboardMagStats {
  if (staging) return { sotto: 0, cap: 0, tot: 0 };
  const items = mapMagazzinoRowsToUI(rows, "Sistema", mezziListe);
  return computeDashboardMagStatsFromUi(items);
}

export function computeDashboardMagStatsFromUi(items: readonly RicambioMagazzino[]): DashboardMagStats {
  const sotto = items.filter((p) => p.scortaMinima > 0 && p.scorta < p.scortaMinima).length;
  const cap = items.reduce((acc, r) => acc + capitaleImmobilizzato(r), 0);
  return { sotto, cap, tot: items.length };
}

/** Anteprima lavorazioni attive (max N). */
export function computeDashboardLavPreview(
  rows: readonly LavorazioneListRow[],
  limit = 3,
): DashboardLavPreviewRow[] {
  return rows.slice(0, limit).map((r) => ({
    id: r.id,
    stato: r.stato,
    macchina: macchinaLabelFromLavRow(r),
  }));
}

/** Aggregati auth logs per security dashboard (pure). */
export function computeSecurityAuthAggregates(rows: readonly AuthLogWithProfileRow[]): SecurityAuthAggregates {
  const recentLogins = rows.filter((r) => r.action === "login");
  const recentLoginFailed = rows.filter((r) => r.action === "login_failed");

  const activeTodayIds = new Set<string>();
  for (const r of rows) {
    if (!r.user_id) continue;
    if (r.action !== "login" && r.action !== "logout") continue;
    if (isTodayLocal(r.created_at)) activeTodayIds.add(r.user_id);
  }

  const lastByUser = new Map<
    string,
    { userId: string; nome: string; email: string; lastAt: string; lastAction: AuthLogAction }
  >();
  for (const r of rows) {
    if (!r.user_id) continue;
    if (r.action !== "login" && r.action !== "logout") continue;
    const nome = r.profiles?.nome?.trim() || r.email || "—";
    const cur = lastByUser.get(r.user_id);
    if (!cur || r.created_at > cur.lastAt) {
      lastByUser.set(r.user_id, {
        userId: r.user_id,
        nome,
        email: r.email,
        lastAt: r.created_at,
        lastAction: r.action,
      });
    }
  }

  return {
    recentLogins,
    recentLoginFailed,
    activeTodayCount: activeTodayIds.size,
    activeTodayIds: [...activeTodayIds],
    lastAccessPerUser: [...lastByUser.values()].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1)),
  };
}
