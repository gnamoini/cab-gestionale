"use client";

import { useCallback, useRef, useState, type DragEvent, type HTMLAttributes } from "react";

function dragHasFiles(e: DragEvent): boolean {
  const types = Array.from(e.dataTransfer.types);
  if (types.includes("Files")) return true;
  if (e.dataTransfer.items?.length) {
    return Array.from(e.dataTransfer.items).some((item) => item.kind === "file");
  }
  return false;
}

export type UseFileDragZoneOptions = {
  disabled?: boolean;
  onDropFile?: (file: File) => void;
};

export type UseFileDragZoneResult = {
  dragActive: boolean;
  dropZoneProps: Pick<
    HTMLAttributes<HTMLElement>,
    "onDragEnter" | "onDragLeave" | "onDragOver" | "onDrop"
  >;
};

/**
 * Gestisce dragenter/dragleave con contatore profondità (evita flicker sui figli).
 * Attivo solo quando il drag contiene file dal filesystem.
 */
export function useFileDragZone({
  disabled = false,
  onDropFile,
}: UseFileDragZoneOptions = {}): UseFileDragZoneResult {
  const [dragActive, setDragActive] = useState(false);
  const depthRef = useRef(0);

  const resetDepth = useCallback(() => {
    depthRef.current = 0;
    setDragActive(false);
  }, []);

  const onDragEnter = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled || !dragHasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      depthRef.current += 1;
      if (depthRef.current === 1) setDragActive(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled || !dragHasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      depthRef.current = Math.max(0, depthRef.current - 1);
      if (depthRef.current === 0) setDragActive(false);
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled || !dragHasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    },
    [disabled],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (disabled || !dragHasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      resetDepth();
      const file = e.dataTransfer.files?.[0];
      if (file) onDropFile?.(file);
    },
    [disabled, onDropFile, resetDepth],
  );

  return {
    dragActive: dragActive && !disabled,
    dropZoneProps: { onDragEnter, onDragLeave, onDragOver, onDrop },
  };
}
