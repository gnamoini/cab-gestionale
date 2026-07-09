import type { DomainReportSectionProps } from "@/components/report/report-section-types";

export function reportComparePublishInput(props: DomainReportSectionProps) {
  return {
    compareRange: props.showCompare ? props.compareRange : null,
    compareMode: props.analyticsContext.compareMode,
  };
}
