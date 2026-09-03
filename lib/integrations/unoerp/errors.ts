import type { UnoerpErrorCode } from "@/lib/integrations/unoerp/types";

export class UnoerpError extends Error {
  readonly code: UnoerpErrorCode;
  readonly retryable: boolean;
  readonly httpStatus: number | null;

  constructor(code: UnoerpErrorCode, message: string, opts?: { retryable?: boolean; httpStatus?: number | null }) {
    super(message);
    this.name = "UnoerpError";
    this.code = code;
    this.retryable = opts?.retryable ?? isRetryableCode(code);
    this.httpStatus = opts?.httpStatus ?? null;
  }
}

export function isRetryableCode(code: UnoerpErrorCode): boolean {
  return code === "UNOERP_NETWORK_ERROR" || code === "UNOERP_TIMEOUT";
}

export const RETRYABLE_CODES: readonly UnoerpErrorCode[] = ["UNOERP_NETWORK_ERROR", "UNOERP_TIMEOUT"];
