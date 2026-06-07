/** Mirror module-level dello stato transport Realtime (per metriche long-session). */
export type GestionaleRealtimeRuntimeMode = "connected" | "polling" | "idle";

let gestionaleRealtimeMode: GestionaleRealtimeRuntimeMode = "idle";

export function setGestionaleRealtimeRuntimeMode(mode: GestionaleRealtimeRuntimeMode): void {
  gestionaleRealtimeMode = mode;
}

export function getGestionaleRealtimeRuntimeMode(): GestionaleRealtimeRuntimeMode {
  return gestionaleRealtimeMode;
}
