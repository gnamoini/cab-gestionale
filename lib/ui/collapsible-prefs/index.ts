export {
  collapsibleAccordionPref,
  collapsibleCollapsedBoolPref,
  collapsibleExpandedBoolPref,
  collapsibleSetPref,
} from "@/lib/ui/collapsible-prefs/presets";
export { read, readSection, write, writeSection, collapsiblePrefsStorageKey } from "@/lib/ui/collapsible-prefs/storage";
export {
  COLLAPSIBLE_KANBAN_OPEN_KEY,
  COLLAPSIBLE_LEGACY_EXPAND_ALL_KEY,
  COLLAPSIBLE_PREFS_KEY_PREFIX,
  type CollapsiblePrefValue,
  type CollapsiblePrefsBlob,
} from "@/lib/ui/collapsible-prefs/types";
export { useCollapsiblePreference, type UseCollapsiblePreferenceOptions } from "@/lib/ui/collapsible-prefs/use-collapsible-preference";
