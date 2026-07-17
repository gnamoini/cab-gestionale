"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  GESTIONALE_SHELL_CONTENT_WIDTH_VAR,
  GESTIONALE_SHELL_TIER_ATTR,
} from "./gestionale-shell-layout";

const CONTENT_WIDTH_BUCKET_PX = 8;

function bucketShellContentWidth(px: number): number {
  if (px <= 0) return 0;
  return Math.round(px / CONTENT_WIDTH_BUCKET_PX) * CONTENT_WIDTH_BUCKET_PX;
}

function readShellContentWidthFromDom(): number {
  if (typeof document === "undefined") return 0;
  const shell = document.querySelector(".cab-app-shell");
  if (!(shell instanceof HTMLElement)) return 0;
  const raw = shell.style.getPropertyValue(GESTIONALE_SHELL_CONTENT_WIDTH_VAR);
  const px = parseInt(raw, 10);
  if (!Number.isFinite(px) || px <= 0) return 0;
  return bucketShellContentWidth(px);
}

function subscribeShellContentWidth(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const shell =
    typeof document !== "undefined" ? document.querySelector(".cab-app-shell") : null;

  const ro =
    typeof ResizeObserver !== "undefined" && shell instanceof HTMLElement
      ? new ResizeObserver(() => {
          onStoreChange();
        })
      : null;

  if (shell && ro) ro.observe(shell);

  const onResize = () => onStoreChange();
  window.addEventListener("resize", onResize);
  const vv = window.visualViewport;
  vv?.addEventListener("resize", onResize);

  const mo =
    shell instanceof HTMLElement && typeof MutationObserver !== "undefined"
      ? new MutationObserver((records) => {
          for (const record of records) {
            if (record.type === "attributes" && record.attributeName === "style") {
              onStoreChange();
              return;
            }
            if (
              record.type === "attributes" &&
              record.attributeName === GESTIONALE_SHELL_TIER_ATTR
            ) {
              onStoreChange();
              return;
            }
          }
        })
      : null;

  if (shell && mo) {
    mo.observe(shell, { attributes: true, attributeFilter: ["style", GESTIONALE_SHELL_TIER_ATTR] });
  }

  return () => {
    ro?.disconnect();
    mo?.disconnect();
    window.removeEventListener("resize", onResize);
    vv?.removeEventListener("resize", onResize);
  };
}

/** Larghezza colonna contenuto — letta da CSS var shell, bucket 8px (no context re-render). */
export function useGestionaleShellContentWidth(): number {
  const subscribe = useCallback(subscribeShellContentWidth, []);
  return useSyncExternalStore(subscribe, readShellContentWidthFromDom, () => 0);
}
