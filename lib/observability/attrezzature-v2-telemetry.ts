import { gestionaleLogger } from "@/lib/observability/logger";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";

export type AttrezzatureV2WritePath = "v2";

export function logAttrezzatureV2WritePath(meta: {
  path: AttrezzatureV2WritePath;
  operation: string;
  targetType?: string | null;
}): void {
  gestionaleLogger.info("attrezzature_v2.write_path", { meta });
}

export function logAttrezzatureLegacyWriteAttempt(meta: {
  source: string;
  fields?: readonly string[];
}): void {
  gestionaleLogger.warn("attrezzature_v2.write_legacy_attempt", { meta });
  incrementHealthCounter("attrezzatureLegacyWriteBlocked");
}
