"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  closeOtherSelectorsInExclusiveGroup,
  registerSelectorExclusiveGroup,
} from "@/lib/selector-interaction/selector-exclusive-group";

/**
 * Gruppo mutuamente esclusivo: aprendo un GlobalSelect chiude gli altri con lo stesso `groupId`.
 */
export function useSelectorExclusiveGroup(
  groupId: string | undefined,
  onClose: () => void,
): { notifyOpening: () => void } {
  const memberIdRef = useRef<symbol>(Symbol("selector-exclusive-group"));
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!groupId) return;
    return registerSelectorExclusiveGroup(groupId, memberIdRef.current, () => onCloseRef.current());
  }, [groupId]);

  const notifyOpening = useCallback(() => {
    if (!groupId) return;
    closeOtherSelectorsInExclusiveGroup(groupId, memberIdRef.current);
  }, [groupId]);

  return { notifyOpening };
}
