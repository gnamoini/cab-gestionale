"use client";

import { useEffect } from "react";
import { isPwaStandaloneMode } from "@/lib/pwa/pwa-display-mode";
import {
  getPwaDisplayModeSnapshot,
  subscribePwaDisplayMode,
} from "@/src/hooks/use-pwa-display-mode";

function applyDisplayModeToDocument(): void {
  if (typeof document === "undefined") return;
  const mode = getPwaDisplayModeSnapshot();
  const standalone = isPwaStandaloneMode(mode);
  const root = document.documentElement;
  root.dataset.pwaDisplay = standalone ? "standalone" : "browser";
  root.classList.toggle("pwa-standalone", standalone);
}

export function PwaDisplayModeBridge() {
  useEffect(() => {
    applyDisplayModeToDocument();
    return subscribePwaDisplayMode(applyDisplayModeToDocument);
  }, []);

  return null;
}
