import { sortStringsItCaseInsensitive } from "@/lib/ui/sort-strings-it";
import { settingsNormKey } from "@/lib/settings/settings-list-duplicate";

export function renameInStringList(list: readonly string[], from: string, to: string): string[] {
  const t = to.trim();
  if (!t || from === t) return [...list];
  return sortStringsItCaseInsensitive(list.map((v) => (v === from ? t : v)));
}

export function addUniqueToStringList(list: readonly string[], raw: string): string[] | null {
  const t = raw.trim();
  if (!t) return null;
  if (list.some((v) => settingsNormKey(v) === settingsNormKey(t))) return null;
  return sortStringsItCaseInsensitive([...list, t]);
}
