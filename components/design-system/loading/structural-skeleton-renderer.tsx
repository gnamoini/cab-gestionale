import { Fragment, memo } from "react";
import type { SkeletonContract } from "./skeleton-contract";
import { SkeletonBlock } from "./skeleton-primitives";
import { SkeletonChart, SkeletonTable } from "./skeleton-primitives";
import { SkeletonShellCard } from "./skeleton-shell-card";
import {
  resolveSkeletonStructure,
  resolveSkeletonStructureList,
  type ResolvedSkeletonNode,
} from "./skeleton-structure-resolver";

function ResolvedSkeletonNodeView({ node }: { node: ResolvedSkeletonNode }) {
  switch (node.type) {
    case "block":
      return <SkeletonBlock className={`${node.minHeightClass} ${node.className}`.trim()} />;
    case "shell-card":
      return (
        <SkeletonShellCard
          bodyMinHeightClass={node.bodyMinHeightClass}
          sectionLabel={node.sectionLabel}
          className={node.className}
        />
      );
    case "table":
      return (
        <SkeletonTable
          minHeightClass={node.minHeightClass}
          className={node.className}
          wrapClassName={node.wrapClassName}
        />
      );
    case "chart":
      return <SkeletonChart minHeightClass={node.minHeightClass} className={node.className} />;
    case "grid":
      return (
        <div className={node.className}>
          {Array.from({ length: node.itemCount }).map((_, i) => (
            <SkeletonBlock key={i} className={`${node.itemMinHeightClass} min-w-0 w-full`} />
          ))}
        </div>
      );
    case "stack":
      return (
        <div className={node.className}>
          {node.children.map((child, i) => (
            <Fragment key={i}>
              <ResolvedSkeletonNodeView node={child} />
            </Fragment>
          ))}
        </div>
      );
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}

export type StructuralSkeletonRendererProps = {
  contract?: SkeletonContract;
  contracts?: SkeletonContract[];
  ariaLabel?: string;
  className?: string;
};

/** RSC-safe — nessun Context, nessun hook. */
export const StructuralSkeletonRenderer = memo(function StructuralSkeletonRenderer({
  contract,
  contracts,
  ariaLabel = "Caricamento",
  className = "",
}: StructuralSkeletonRendererProps) {
  const nodes = contract
    ? [resolveSkeletonStructure(contract)]
    : resolveSkeletonStructureList(contracts ?? []);

  return (
    <div
      className={className}
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {nodes.map((node, i) => (
        <Fragment key={i}>
          <ResolvedSkeletonNodeView node={node} />
        </Fragment>
      ))}
    </div>
  );
});
