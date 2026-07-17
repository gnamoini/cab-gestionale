"use client";

/** Client mirror of DOCUMENT_CAPTURE_LAUNCHER_APPLY_V1 — default on. */
export function isDocumentCaptureLauncherApplyV1ClientEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DOCUMENT_CAPTURE_LAUNCHER_APPLY_V1 === "0") {
    return false;
  }
  return true;
}
