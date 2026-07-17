/** Feature flag: launcher uses dry-run → apply (Single Apply Engine). Default on; =0 → legacy create path. */
export function isDocumentCaptureLauncherApplyV1Enabled(): boolean {
  return process.env.DOCUMENT_CAPTURE_LAUNCHER_APPLY_V1 !== "0";
}
