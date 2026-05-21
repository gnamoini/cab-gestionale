"use client";

import { PREVENTIVI_LEARNING_STORAGE_KEY } from "@/lib/preventivi/constants";
import {
  loadPreventiviLearning,
  savePreventiviLearning,
  type PreventivoLearningStore,
} from "@/lib/preventivi/preventivi-learning-storage";
import { settingsService } from "@/src/services/settings.service";

const MODULE = "preventivi";
const KEY = "phrase_learning_v1";

export async function loadPreventiviLearningMerged(): Promise<PreventivoLearningStore> {
  const local = loadPreventiviLearning();
  const remote = await settingsService.getSetting(MODULE, KEY);
  if (!remote.success || !remote.data?.value) return local;
  const v = remote.data.value as Partial<PreventivoLearningStore>;
  if (v.version !== 1) return local;
  return {
    version: 1,
    phraseMap: { ...local.phraseMap, ...(v.phraseMap ?? {}) },
    corrections: [...local.corrections, ...(v.corrections ?? [])].slice(0, 120),
    finalVersions: [...local.finalVersions, ...(v.finalVersions ?? [])].slice(0, 80),
  };
}

export function mirrorPreventiviLearningToSettings(store: PreventivoLearningStore): void {
  void settingsService
    .upsertSetting({ module: MODULE, key: KEY, value: store as unknown as Record<string, unknown> })
    .catch(() => {
      /* offline: localStorage resta source */
    });
}

/** Migrazione one-shot localStorage → app_settings. */
export async function migratePreventiviLearningToSettings(): Promise<void> {
  const local = loadPreventiviLearning();
  if (typeof window === "undefined") return;
  const flag = window.localStorage.getItem(`${PREVENTIVI_LEARNING_STORAGE_KEY}-migrated`);
  if (flag === "1") return;
  await settingsService.upsertSetting({
    module: MODULE,
    key: KEY,
    value: local as unknown as Record<string, unknown>,
  });
  window.localStorage.setItem(`${PREVENTIVI_LEARNING_STORAGE_KEY}-migrated`, "1");
}
