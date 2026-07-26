"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hashMaintenanceTasks } from "@/lib/maintenance-plans/preset-to-tasks";
import type { MaintenanceTask } from "@/lib/maintenance-plans/maintenance-task";

export function useTagliandoPresetSync({
  enabled,
  currentVersionRef,
  currentTasks,
  onResync,
}: {
  enabled: boolean;
  currentVersionRef: string | null | undefined;
  currentTasks: MaintenanceTask[];
  onResync: () => void;
}) {
  const [promptOpen, setPromptOpen] = useState(false);
  const baselineRef = useRef<{ version: string | null; hash: string } | null>(null);

  useEffect(() => {
    if (!enabled) {
      baselineRef.current = null;
      return;
    }
    baselineRef.current = {
      version: currentVersionRef ?? null,
      hash: hashMaintenanceTasks(currentTasks),
    };
  }, [enabled, currentVersionRef, currentTasks]);

  const checkForPresetChange = useCallback(
    (nextVersionRef: string | null | undefined, nextTasks: MaintenanceTask[]) => {
      if (!enabled || !baselineRef.current) return;
      const nextHash = hashMaintenanceTasks(nextTasks);
      const versionChanged = (nextVersionRef ?? null) !== baselineRef.current.version;
      const hashChanged = nextHash !== baselineRef.current.hash;
      if (versionChanged || hashChanged) setPromptOpen(true);
    },
    [enabled],
  );

  const acceptResync = useCallback(() => {
    setPromptOpen(false);
    onResync();
    baselineRef.current = {
      version: currentVersionRef ?? null,
      hash: hashMaintenanceTasks(currentTasks),
    };
  }, [currentTasks, currentVersionRef, onResync]);

  const keepCurrent = useCallback(() => {
    setPromptOpen(false);
    baselineRef.current = {
      version: currentVersionRef ?? null,
      hash: hashMaintenanceTasks(currentTasks),
    };
  }, [currentTasks, currentVersionRef]);

  return { promptOpen, checkForPresetChange, acceptResync, keepCurrent, setPromptOpen };
}
