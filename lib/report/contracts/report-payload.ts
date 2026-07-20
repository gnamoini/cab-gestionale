import type { ReportMetadataEnvelope } from "@/lib/report/contracts/metadata-envelope";

export type ReportPayload<T> = {
  metadata: ReportMetadataEnvelope;
  data: T;
};
