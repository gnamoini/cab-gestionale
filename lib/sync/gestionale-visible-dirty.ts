import {
  dirtyEntryKey,
  isDirtyRelevantForScope,
  type DirtyEntry,
} from "@/lib/sync/gestionale-dirty-state";
import type { GestionaleSyncScopeRegistration } from "@/lib/sync/gestionale-sync-scope";

export function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function getVisibleDirtyEntries(input: {
  pathname: string;
  scopes: readonly GestionaleSyncScopeRegistration[];
  dirtyEntries: readonly DirtyEntry[];
}): DirtyEntry[] {
  const { pathname, scopes, dirtyEntries } = input;
  const seen = new Set<string>();
  const out: DirtyEntry[] = [];

  for (const entry of dirtyEntries) {
    for (const scope of scopes) {
      if (!isDirtyRelevantForScope(entry, scope)) continue;
      if (scope.route && !matchesRoute(pathname, scope.route)) continue;
      const key = dirtyEntryKey(entry.table, entry.entityId);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(entry);
      break;
    }
  }

  return out;
}
