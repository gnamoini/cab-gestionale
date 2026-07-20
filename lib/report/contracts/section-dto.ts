import type { ReportMetadataEnvelope } from "@/lib/report/contracts/metadata-envelope";

export type SectionDto<T> = {
  sectionId: string;
  label: string;
  metadata: ReportMetadataEnvelope;
  items: T[];
};
