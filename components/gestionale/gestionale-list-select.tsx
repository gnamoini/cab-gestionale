"use client";

/**
 * @deprecated Usa `GlobalSettingsListSelect` (con `listKey`) o `GlobalSelect` da `@/components/gestionale/global-input`.
 */
export { GlobalSelect as GestionaleListSelect, type GlobalSelectProps as GestionaleListSelectProps } from "@/components/gestionale/global-input/global-select";
export { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
export { isValueInListOptions, resolveListSelectValue } from "@/lib/ui/list-select-utils";
