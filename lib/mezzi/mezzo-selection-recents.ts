import { pushSelectorRecent, readSelectorRecents } from "@/lib/ui/gestionale-selector-recents";

export const MEZZO_LAVORAZIONE_CREATE_RECENTS_KEY = "mezzo-lavorazione-create";
export const MEZZO_LAVORAZIONE_CREATE_RECENTS_MAX = 8;

export function mezzoSelectionRecentsListKey(userId?: string | null): string {
  const uid = userId?.trim();
  return uid ? `${MEZZO_LAVORAZIONE_CREATE_RECENTS_KEY}:${uid}` : MEZZO_LAVORAZIONE_CREATE_RECENTS_KEY;
}

export function readMezzoSelectionRecents(userId?: string | null): string[] {
  return readSelectorRecents(
    mezzoSelectionRecentsListKey(userId),
    MEZZO_LAVORAZIONE_CREATE_RECENTS_MAX,
  );
}

export function pushMezzoSelectionRecent(mezzoId: string, userId?: string | null): void {
  pushSelectorRecent(
    mezzoSelectionRecentsListKey(userId),
    mezzoId,
    MEZZO_LAVORAZIONE_CREATE_RECENTS_MAX,
  );
}
