"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  buildEconomicAnalytics,
  buildLaborAnalytics,
  buildOperationalAnalytics,
  buildWarehouseAnalytics,
  type EconomicAnalyticsBuildInput,
  type LaborAnalyticsBuildInput,
  type OperationalAnalyticsBuildInput,
  type WarehouseAnalyticsBuildInput,
} from "@/lib/report/report-domain-analytics";
import type {
  DerivedEntry,
  DerivedKey,
  ReportAnalyticsDerivedSnapshot,
} from "@/lib/report/report-domain-types";

type VersionMap = Record<DerivedKey, number>;

const EMPTY_VERSIONS: VersionMap = {
  operational: 0,
  warehouse: 0,
  labor: 0,
  economic: 0,
};

type DerivedReadContextValue = ReportAnalyticsDerivedSnapshot;

type DerivedActionsContextValue = {
  resetForRangeChange: (rangeKey: string) => void;
  invalidate: (section: DerivedKey) => void;
  publishOperationalAnalytics: (input: OperationalAnalyticsBuildInput) => void;
  publishWarehouseAnalytics: (input: WarehouseAnalyticsBuildInput) => void;
  publishLaborAnalytics: (input: LaborAnalyticsBuildInput) => void;
  publishEconomicAnalytics: (input: EconomicAnalyticsBuildInput) => void;
};

const DerivedReadContext = createContext<DerivedReadContextValue | null>(null);
const DerivedActionsContext = createContext<DerivedActionsContextValue | null>(null);

function makeEntry<T>(data: T, rangeKey: string, version: number): DerivedEntry<T> {
  return { data, rangeKey, generatedAt: Date.now(), version };
}

export function ReportAnalyticsDerivedProvider({
  rangeKey,
  children,
}: {
  rangeKey: string;
  children: ReactNode;
}) {
  const [revision, setRevision] = useState(0);
  const [currentRangeKey, setCurrentRangeKey] = useState(rangeKey);
  const [operational, setOperational] = useState<DerivedEntry<ReturnType<typeof buildOperationalAnalytics>>>();
  const [warehouse, setWarehouse] = useState<DerivedEntry<ReturnType<typeof buildWarehouseAnalytics>>>();
  const [labor, setLabor] = useState<DerivedEntry<ReturnType<typeof buildLaborAnalytics>>>();
  const [economic, setEconomic] = useState<DerivedEntry<ReturnType<typeof buildEconomicAnalytics>>>();

  const versionsRef = useRef<VersionMap>({ ...EMPTY_VERSIONS });
  const lastAcceptedRef = useRef<Record<DerivedKey, number>>({
    operational: 0,
    warehouse: 0,
    labor: 0,
    economic: 0,
  });

  const resetForRangeChange = useCallback((nextRangeKey: string) => {
    setCurrentRangeKey(nextRangeKey);
    setOperational(undefined);
    setWarehouse(undefined);
    setLabor(undefined);
    setEconomic(undefined);
    versionsRef.current = { ...EMPTY_VERSIONS };
    lastAcceptedRef.current = { operational: 0, warehouse: 0, labor: 0, economic: 0 };
    setRevision((r) => r + 1);
  }, []);

  useEffect(() => {
    if (rangeKey !== currentRangeKey) resetForRangeChange(rangeKey);
  }, [rangeKey, currentRangeKey, resetForRangeChange]);

  const invalidate = useCallback((section: DerivedKey) => {
    versionsRef.current[section] += 1;
    switch (section) {
      case "operational":
        setOperational(undefined);
        break;
      case "warehouse":
        setWarehouse(undefined);
        break;
      case "labor":
        setLabor(undefined);
        break;
      case "economic":
        setEconomic(undefined);
        break;
      default:
        break;
    }
    setRevision((r) => r + 1);
  }, []);

  const acceptPublish = useCallback(
    (key: DerivedKey, inputRangeKey: string, requestId: number): boolean => {
      if (inputRangeKey !== currentRangeKey) return false;
      if (requestId < lastAcceptedRef.current[key]) return false;
      lastAcceptedRef.current[key] = requestId;
      return true;
    },
    [currentRangeKey],
  );

  const publishOperationalAnalytics = useCallback(
    (input: OperationalAnalyticsBuildInput) => {
      if (!acceptPublish("operational", input.rangeKey, input.requestId)) return;
      const dto = buildOperationalAnalytics(input);
      const version = versionsRef.current.operational;
      setOperational(makeEntry(dto, input.rangeKey, version));
      setRevision((r) => r + 1);
    },
    [acceptPublish],
  );

  const publishWarehouseAnalytics = useCallback(
    (input: WarehouseAnalyticsBuildInput) => {
      if (!acceptPublish("warehouse", input.rangeKey, input.requestId)) return;
      const dto = buildWarehouseAnalytics(input);
      const version = versionsRef.current.warehouse;
      setWarehouse(makeEntry(dto, input.rangeKey, version));
      setRevision((r) => r + 1);
    },
    [acceptPublish],
  );

  const publishLaborAnalytics = useCallback(
    (input: LaborAnalyticsBuildInput) => {
      if (!acceptPublish("labor", input.rangeKey, input.requestId)) return;
      const dto = buildLaborAnalytics(input);
      const version = versionsRef.current.labor;
      setLabor(makeEntry(dto, input.rangeKey, version));
      setRevision((r) => r + 1);
    },
    [acceptPublish],
  );

  const publishEconomicAnalytics = useCallback(
    (input: EconomicAnalyticsBuildInput) => {
      if (!acceptPublish("economic", input.rangeKey, input.requestId)) return;
      const dto = buildEconomicAnalytics(input);
      const version = versionsRef.current.economic;
      setEconomic(makeEntry(dto, input.rangeKey, version));
      setRevision((r) => r + 1);
    },
    [acceptPublish],
  );

  const readValue = useMemo<DerivedReadContextValue>(
    () => ({
      revision,
      currentRangeKey,
      operational,
      warehouse,
      labor,
      economic,
    }),
    [revision, currentRangeKey, operational, warehouse, labor, economic],
  );

  const actions = useMemo<DerivedActionsContextValue>(
    () => ({
      resetForRangeChange,
      invalidate,
      publishOperationalAnalytics,
      publishWarehouseAnalytics,
      publishLaborAnalytics,
      publishEconomicAnalytics,
    }),
    [
      resetForRangeChange,
      invalidate,
      publishOperationalAnalytics,
      publishWarehouseAnalytics,
      publishLaborAnalytics,
      publishEconomicAnalytics,
    ],
  );

  return (
    <DerivedActionsContext.Provider value={actions}>
      <DerivedReadContext.Provider value={readValue}>{children}</DerivedReadContext.Provider>
    </DerivedActionsContext.Provider>
  );
}

export function useReportAnalyticsDerived(): ReportAnalyticsDerivedSnapshot {
  const ctx = useContext(DerivedReadContext);
  if (!ctx) throw new Error("useReportAnalyticsDerived must be used within ReportAnalyticsDerivedProvider");
  return ctx;
}

export function useReportAnalyticsDerivedActions(): DerivedActionsContextValue {
  const ctx = useContext(DerivedActionsContext);
  if (!ctx) throw new Error("useReportAnalyticsDerivedActions must be used within ReportAnalyticsDerivedProvider");
  return ctx;
}
