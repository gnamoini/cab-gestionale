import type { FormUxDeviceClass } from "@/lib/form-ux-migration/types";

const DEFAULT_DEVICES: FormUxDeviceClass[] = ["desktop", "mobile", "ios"];

function isIosLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

/** Classify current runtime device for rollout policy. */
export function getFormUxDeviceClass(): FormUxDeviceClass {
  if (isIosLike()) return "ios";
  if (isMobileViewport()) return "mobile";
  return "desktop";
}

/** True when field rollout devices includes current device class. */
export function isFormUxRolloutActiveForDevice(
  devices: FormUxDeviceClass[] | undefined,
): boolean {
  const allowed = devices ?? DEFAULT_DEVICES;
  return allowed.includes(getFormUxDeviceClass());
}
