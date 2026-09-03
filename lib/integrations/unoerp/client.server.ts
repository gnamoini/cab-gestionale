import "server-only";

import { readUnoerpBaseUrl } from "@/lib/env/unoerp.server";
import { UnoerpError } from "@/lib/integrations/unoerp/errors";
import { assertSafeUnoerpAct } from "@/lib/integrations/unoerp/safety.server";
import { unoerpTransportRequest } from "@/lib/integrations/unoerp/transport";
import { UNOERP_ALLOWED_ACTS, type UnoerpAct, type UnoerpInfoResponse } from "@/lib/integrations/unoerp/types";

export { verifyUnoerpConnection } from "@/lib/integrations/unoerp/auth-connection";

export type UnoerpRequest = {
  act: UnoerpAct;
  module: string;
  file: string;
  row?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function unoerpRequest<T = unknown>(req: UnoerpRequest): Promise<T> {
  assertSafeUnoerpAct(req.act);
  if (!(UNOERP_ALLOWED_ACTS as readonly string[]).includes(req.act)) {
    throw new UnoerpError("UNOERP_VALIDATION_ERROR", `Unsupported act: ${req.act}`);
  }
  const base = readUnoerpBaseUrl();
  if (!base) throw new UnoerpError("UNOERP_AUTH_ERROR", "UNOERP_BASE_URL missing");
  return unoerpTransportRequest<T>(req);
}

export async function getModuleInfo(module: string, file: string): Promise<UnoerpInfoResponse> {
  return unoerpRequest<UnoerpInfoResponse>({ act: "info", module, file });
}

export async function findRecords(module: string, file: string, extra?: Record<string, unknown>): Promise<unknown> {
  return unoerpRequest({ act: "index", module, file, ...extra });
}

export async function getRecord(module: string, file: string, row: string): Promise<unknown> {
  return unoerpRequest({ act: "show", module, file, row });
}

export async function createRecord(
  module: string,
  file: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  return unoerpRequest({ act: "create", module, file, data });
}

export async function updateRecord(
  module: string,
  file: string,
  row: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  return unoerpRequest({ act: "update", module, file, row, data });
}
