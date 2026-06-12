/** Saga orchestrator Write Contract v2. Default OFF — v1 invariato. */
export function isInterventoWriteV2Enabled(): boolean {
  return process.env.NEXT_PUBLIC_INTERVENTO_WRITE_V2 === "1";
}

/** Shadow dry-run: saga in parallelo a v1, deps no-op — staging only. */
export function isInterventoWriteV2ShadowEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_INTERVENTO_WRITE_V2_SHADOW === "1" && !isInterventoWriteV2Enabled()
  );
}

/** RPC atomico server-side. Default OFF — fallback client stages. */
export function isInterventoWriteRpcEnabled(): boolean {
  return process.env.NEXT_PUBLIC_INTERVENTO_WRITE_RPC === "1";
}
