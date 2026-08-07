/** Client hardware hints for loading / query telemetry. */
export function getClientDeviceHints(): {
  browser: string;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
} {
  if (typeof navigator === "undefined") {
    return { browser: "", hardwareConcurrency: null, deviceMemory: null };
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    browser: nav.userAgent?.slice(0, 120) ?? "",
    hardwareConcurrency:
      typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
    deviceMemory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
  };
}
