import {
  isOperatorGlobalSettingsEnabled,
  isOperatorGlobalSettingsEnvEnabled,
} from "@/lib/permissions/operator-global-settings";

export type PilotOverrideState = "disabled" | "ui_only" | "db_only" | "complete";

export type PilotSettingsState = {
  envEnabled: boolean;
  dbEnabled: boolean;
  effectiveEnabled: boolean;
  state: PilotOverrideState;
  incoherent: boolean;
};

function computePilotState(envEnabled: boolean, dbEnabled: boolean): PilotOverrideState {
  if (envEnabled && dbEnabled) return "complete";
  if (envEnabled) return "ui_only";
  if (dbEnabled) return "db_only";
  return "disabled";
}

/** Unico resolver runtime per pilot impostazioni operatore (env + DB). */
export function resolvePilotSettingsState(dbEnabled: boolean): PilotSettingsState {
  const envEnabled = isOperatorGlobalSettingsEnvEnabled();
  const effectiveEnabled = isOperatorGlobalSettingsEnabled(dbEnabled);
  const state = computePilotState(envEnabled, dbEnabled);
  return {
    envEnabled,
    dbEnabled,
    effectiveEnabled,
    state,
    incoherent: state === "ui_only" || state === "db_only",
  };
}

/** Alias per dashboard sicurezza (stesso shape di PilotControlStatus). */
export type PilotControlStatus = PilotSettingsState;
