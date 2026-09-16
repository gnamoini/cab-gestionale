"use client";

import { memo } from "react";
import { chartCssVars, useChart, useChartHover } from "../chart-context";
import type { IndicatorFadeEdges } from "../indicator-fade";
import { TooltipIndicator } from "./tooltip-indicator";

export interface ChartCrosshairLayerProps {
  fadeEdges?: IndicatorFadeEdges;
  fadeLength?: number;
  /** When false, crosshair stops at the plot bottom (default). When true, extends through x-axis margin. */
  spanXAxisMargin?: boolean;
  color?: string | ((point: Record<string, unknown>) => string);
  springConfig?: import("../chart-config-context").SpringConfig;
}

const ChartCrosshairLayerInner = memo(function ChartCrosshairLayerInner({
  fadeEdges = "none",
  fadeLength,
  spanXAxisMargin = false,
  color,
  springConfig,
}: ChartCrosshairLayerProps) {
  const { innerHeight, margin } = useChart();
  const { tooltipData } = useChartHover();

  const visible = tooltipData !== null;
  const x = tooltipData?.x ?? 0;
  const indicatorHeight = spanXAxisMargin
    ? innerHeight + margin.bottom
    : innerHeight;

  let indicatorColor = chartCssVars.crosshair;
  if (tooltipData) {
    if (typeof color === "function") {
      indicatorColor = color(tooltipData.point);
    } else if (typeof color === "string") {
      indicatorColor = color;
    }
  }

  return (
    <TooltipIndicator
      animate
      colorEdge={indicatorColor}
      colorMid={indicatorColor}
      fadeEdges={fadeEdges}
      fadeLength={fadeLength}
      gradientId="chart-crosshair-layer-gradient"
      height={indicatorHeight}
      springConfig={springConfig}
      visible={visible}
      width="line"
      x={x}
    />
  );
});

/** SVG postOverlay crosshair — avoids HTML overlay clipping in overflow-hidden layouts. */
export const ChartCrosshairLayer = Object.assign(ChartCrosshairLayerInner, {
  displayName: "ChartCrosshairLayer",
  __isPostOverlay: true as const,
});
