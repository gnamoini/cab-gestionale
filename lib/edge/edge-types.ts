export type EdgeRouteGroup = "auth" | "documents" | "media" | "upload";

export type EdgeEligibility = "EDGE_SAFE" | "NON_EDGE";

export type EdgeHandlerId =
  | "auth-precheck-edge"
  | "document-route-edge"
  | "media-cache-edge"
  | "upload-policy-precheck-edge";

export type EdgeDeliveryRoute = "thumbnail" | "full_file" | "download";

export type EdgeCachePolicy = "immutable" | "short";

export type EdgeRouteOutcome = "handled" | "fallback";

export type EdgeRouteDecision = {
  outcome: EdgeRouteOutcome;
  handlerId: EdgeHandlerId;
  reason?: string;
  latencyMs: number;
  latencySavedEstimate?: number;
};

export type EdgeRequestContext = {
  pathname: string;
  method: string;
  correlationId: string;
  routeGroup?: EdgeRouteGroup;
};

export type EdgeHandlerResult =
  | {
      outcome: "handled";
      status: number;
      body?: string;
      contentType?: string;
      headers?: Record<string, string>;
      latencySavedEstimate?: number;
    }
  | {
      outcome: "fallback";
      reason: string;
      requestHeaders?: Record<string, string>;
      latencySavedEstimate?: number;
    };
