import "server-only";

import { isUnoerpConfigured } from "@/lib/env/unoerp.server";

export function hasUnoerpCredentials(): boolean {
  return isUnoerpConfigured();
}
