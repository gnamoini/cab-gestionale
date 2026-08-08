/** SSOT nomi performance.mark cold start — importabile senza side-effect. */

export const CAB_COLD_START_MARK = {
  staticBootVisible: "cab_static_boot_visible",
  firstPaint: "first-paint",
  firstContentfulPaint: "first-contentful-paint",
  reactRootMount: "react_root_mount",
  hydrationStart: "hydration_start",
  hydrationEnd: "hydration_end",
  appBootScreenMount: "app_boot_screen_mount",
  appBootStaticHidden: "app_boot_static_hidden",
  appBootDismiss: "app_boot_dismiss",
  authInitStart: "auth_init_start",
  authInitEnd: "auth_init_end",
  loadingScreenVisible: "loading_screen_visible",
  firstUsefulUi: "first_useful_ui",
} as const;

export const CAB_COLD_START_MEASURE = {
  staticToFp: "static_to_fp",
  fpToReact: "fp_to_react",
  reactToBootMount: "react_to_boot_mount",
  bootMountToStaticHidden: "boot_mount_to_static_hidden",
  staticHiddenToDismiss: "static_hidden_to_dismiss",
} as const;

export const CAB_LAST_VISIBILITY_HIDDEN_KEY = "cab_last_visibility_hidden";
