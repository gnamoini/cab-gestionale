export { authService } from "@/src/services/auth.service";
export { mezziService } from "@/src/services/mezzi.service";
export { lavorazioniService, type LavorazioneListRow } from "@/src/services/lavorazioni.service";
export { schedeService } from "@/src/services/schede.service";
export { magazzinoService } from "@/src/services/magazzino.service";
export { movimentiService } from "@/src/services/movimenti.service";
export { preventiviInferTotaleDaDettagli, preventiviService } from "@/src/services/preventivi.service";
export { documentiService } from "@/src/services/documenti.service";
export {
  mergeAppSettingsUpsertWithVersions,
  SETTINGS_CONCURRENCY_CONFLICT,
  settingsService,
  type AppSettingsUpsertInput,
} from "@/src/services/settings.service";
export { appSettingsAuditService, type AppSettingsAuditListParams } from "@/src/services/app-settings-audit.service";
export { permissionsService } from "@/src/services/permissions.service";
export { authLogsService } from "@/src/services/auth-logs.service";
export type { ServiceResult } from "@/src/services/service-result";
export { success, err, error } from "@/src/services/service-result";
export type {
  ProfileRow,
  MezzoRow,
  LavorazioneRow,
  SchedaLavorazioneRow,
  MagazzinoRicambioRow,
  MovimentoRicambioRow,
  PreventivoRow,
  DocumentoRow,
  LogModificaRow,
  AppSettingsAuditRow,
  UserPermissionRow,
  AuthLogRow,
  AuthLogAction,
} from "@/src/types/supabase-tables";
