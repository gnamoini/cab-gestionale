import "server-only";

import {
  recordAssetCacheAccess,
  type AssetCacheAccessInput,
} from "@/lib/observability/asset-cache-telemetry";
import { readCorrelationIdFromRequest } from "@/lib/observability/runtime-coordination-tracer.server";

export { recordAssetCacheAccess };

export function recordAssetCacheFromRequest(
  input: AssetCacheAccessInput,
  request?: Request,
): void {
  const correlationId = input.correlationId ?? (request ? readCorrelationIdFromRequest(request) : undefined);
  recordAssetCacheAccess({ ...input, correlationId });
}
