import type { SkeletonContract, SkeletonGeometryToken } from "./skeleton-contract";
import { resolveGeometryClasses, SKELETON_GEOMETRY } from "./skeleton-geometry-tokens";

export type ResolvedSkeletonNode =
  | {
      type: "block";
      className: string;
      minHeightClass: string;
    }
  | {
      type: "shell-card";
      bodyMinHeightClass: string;
      sectionLabel?: string;
      className?: string;
    }
  | {
      type: "table";
      minHeightClass: string;
      className?: string;
      wrapClassName?: string;
    }
  | {
      type: "chart";
      minHeightClass: string;
      className?: string;
    }
  | {
      type: "grid";
      className: string;
      itemCount: number;
      itemMinHeightClass: string;
    }
  | {
      type: "stack";
      className: string;
      children: ResolvedSkeletonNode[];
    };

function geometryMinHeight(token: SkeletonGeometryToken): string {
  return SKELETON_GEOMETRY[token].minHeightClass;
}

/** Descriptor → albero risolto (funzione pura, RSC-safe). */
export function resolveSkeletonStructure(contract: SkeletonContract): ResolvedSkeletonNode {
  const geometryClass = resolveGeometryClasses(contract.geometry);
  const minHeight = geometryMinHeight(contract.geometry.height);
  const mergedClass = [geometryClass, contract.className].filter(Boolean).join(" ");

  switch (contract.kind) {
    case "combined-list":
      return {
        type: "shell-card",
        bodyMinHeightClass: minHeight,
        sectionLabel: contract.sectionLabel,
        className: contract.className,
      };
    case "table":
      return {
        type: "table",
        minHeightClass: minHeight,
        className: contract.className,
      };
    case "chart":
      return {
        type: "chart",
        minHeightClass: minHeight,
        className: contract.className,
      };
    case "toolbar":
    case "tab-bar":
    case "block":
      return {
        type: "block",
        className: mergedClass,
        minHeightClass: minHeight,
      };
    case "card":
      return {
        type: "shell-card",
        bodyMinHeightClass: minHeight,
        className: contract.className,
      };
    case "grid": {
      const count = Math.max(1, Math.min(contract.itemCount ?? 2, 12));
      return {
        type: "grid",
        className: contract.className ?? "grid min-w-0 gap-3",
        itemCount: count,
        itemMinHeightClass: minHeight,
      };
    }
    case "stack":
      return {
        type: "stack",
        className: contract.className ?? "flex min-w-0 flex-col gap-4",
        children: (contract.children ?? []).map(resolveSkeletonStructure),
      };
    default: {
      const _exhaustive: never = contract.kind;
      return _exhaustive;
    }
  }
}

export function resolveSkeletonStructureList(contracts: SkeletonContract[]): ResolvedSkeletonNode[] {
  return contracts.map(resolveSkeletonStructure);
}
