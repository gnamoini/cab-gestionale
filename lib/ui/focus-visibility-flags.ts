/**
 * Feature flag — Focus Visibility Manager V2 (default on).
 * V2: Focus Transaction pipeline. Rollback: NEXT_PUBLIC_MOBILE_FOCUS_VISIBILITY_V2=false
 */
export function isMobileFocusVisibilityV2(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MOBILE_FOCUS_VISIBILITY_V2 === "false") {
    return false;
  }
  return true;
}
