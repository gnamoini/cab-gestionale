"use client";

import { useEffect, useRef } from "react";
import {
  subscribeCabSync,
  type CabSyncEntity,
  type CabSyncEvent,
} from "@/lib/sync/cab-sync-bus";

export function useCabSyncListener(
  entity: CabSyncEntity | CabSyncEntity[] | "settings",
  handler: (event: CabSyncEvent) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const entities =
    entity === "settings"
      ? (["app_settings"] as CabSyncEntity[])
      : Array.isArray(entity)
        ? entity
        : [entity];

  useEffect(() => {
    const targets = entities;
    return subscribeCabSync((ev) => {
      if (ev.type === "settings_updated" && entity === "settings") {
        handlerRef.current(ev);
        return;
      }
      if (ev.type === "settings_updated") return;
      if (targets.includes(ev.entity)) handlerRef.current(ev);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handler via ref; entity prop only
  }, [entity]);
}
