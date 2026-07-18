"use client";

import { useGestionaleDirtySyncMode } from "@/src/hooks/gestionale/use-gestionale-dirty-sync-mode";

export function GestionaleDirtySyncModeBridge() {
  useGestionaleDirtySyncMode();
  return null;
}
