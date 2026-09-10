import type { VatConfiguration, VatLineCalculation } from "@/lib/vat/types";
import { VAT_SNAPSHOT_VERSION } from "@/lib/vat/types";

export type VatRowSnapshot = {
  snapshot_version: number;
  vat_code_id: string;
  vat_configuration_id: string;
  vat_code: string;
  description: string;
  rate: number;
  nature_code: string | null;
  operation_type_code: string;
  direction: string;
  deductibility_rate: number;
  vat_account_id: string | null;
  vat_register_id: string | null;
  valid_from: string;
  valid_to: string | null;
  normative_reference: string | null;
  calculated: VatLineCalculation;
};

export function buildVatSnapshot(
  configuration: VatConfiguration,
  calculated: VatLineCalculation,
): VatRowSnapshot {
  return {
    snapshot_version: VAT_SNAPSHOT_VERSION,
    vat_code_id: configuration.vat_code_id,
    vat_configuration_id: configuration.configuration_id,
    vat_code: configuration.vat_code,
    description: configuration.description,
    rate: configuration.rate,
    nature_code: configuration.nature_code,
    operation_type_code: configuration.operation_type_code,
    direction: configuration.direction,
    deductibility_rate: configuration.deductibility_rate,
    vat_account_id: configuration.vat_account_id,
    vat_register_id: configuration.vat_register_id,
    valid_from: configuration.valid_from,
    valid_to: configuration.valid_to,
    normative_reference: configuration.normative_reference,
    calculated,
  };
}
