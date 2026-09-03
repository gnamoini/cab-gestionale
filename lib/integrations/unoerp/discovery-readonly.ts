/**
 * Client UnoERP esclusivamente READ-ONLY per discovery.
 */
import { UnoerpError } from "@/lib/integrations/unoerp/errors";
import { unoerpTransportRequest } from "@/lib/integrations/unoerp/transport";
import type { UnoerpInfoResponse } from "@/lib/integrations/unoerp/types";

export const UNOERP_READONLY_ACTS = ["info", "index", "show"] as const;
export type UnoerpReadonlyAct = (typeof UNOERP_READONLY_ACTS)[number];

const FORBIDDEN = /^(create|update|delete|cancel|disable|archive|annulla|void)$/i;

function assertReadonlyAct(act: string): asserts act is UnoerpReadonlyAct {
  if (FORBIDDEN.test(act.trim()) || act.toLowerCase().includes("delete")) {
    throw new Error(`Forbidden act in discovery: ${act}`);
  }
  if (!(UNOERP_READONLY_ACTS as readonly string[]).includes(act)) {
    throw new Error(`Discovery allows only info/index/show, got: ${act}`);
  }
}

export type UnoerpReadonlyRequest = {
  act: UnoerpReadonlyAct;
  module: string;
  file: string;
  row?: string;
  pages?: Record<string, string>;
  filter?: Record<string, string>;
  status?: string;
  [key: string]: unknown;
};

export async function unoerpReadonlyRequest<T = unknown>(req: UnoerpReadonlyRequest): Promise<T> {
  assertReadonlyAct(req.act);
  return unoerpTransportRequest<T>(req);
}

export async function discoveryInfo(module: string, file: string): Promise<UnoerpInfoResponse> {
  return unoerpReadonlyRequest<UnoerpInfoResponse>({ act: "info", module, file });
}

export async function discoveryIndex(
  module: string,
  file: string,
  extra?: Record<string, unknown>,
): Promise<unknown> {
  return unoerpReadonlyRequest({ act: "index", module, file, pages: { attivi: "1" }, ...extra });
}

export async function discoveryShow(module: string, file: string, row: string): Promise<unknown> {
  return unoerpReadonlyRequest({ act: "show", module, file, row });
}
