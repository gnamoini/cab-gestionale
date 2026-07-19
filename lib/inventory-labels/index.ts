export { GENERATOR_VERSION, INVENTORY_ENTITY_MAGAZZINO_RICAMBIO } from "@/lib/inventory-labels/domain/types";
export type {
  LabelFormat,
  LabelPayload,
  LabelRenderOptions,
  LabelTemplateDefinition,
  OpenRicambioSource,
  TokenStatus,
} from "@/lib/inventory-labels/domain/types";

export {
  buildInventoryQrUrl,
  generateInventoryPublicToken,
  isValidInventoryTokenFormat,
  normalizeInventoryToken,
} from "@/lib/inventory-labels/domain/tokens";

export {
  DEFAULT_LABEL_PRESET,
  LABEL_PRESET_IDS,
  LABEL_TEMPLATE_REGISTRY,
  getLabelTemplate,
  labelPresetDisplayName,
  labelPresetOptionLabel,
} from "@/lib/inventory-labels/domain/templates";

export { computeLabelFingerprint } from "@/lib/inventory-labels/domain/fingerprints";

export {
  BULK_ABSOLUTE_MAX,
  BULK_SYNC_MAX,
  bulkLabelRequestSchema,
  formatLabelJobPreset,
  isBulkSyncCount,
  labelFormatSchema,
  labelPresetSchema,
  parseLabelJobPreset,
  renderLabelQuerySchema,
} from "@/lib/inventory-labels/validation";
