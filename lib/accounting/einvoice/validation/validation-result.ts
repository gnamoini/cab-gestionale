export type ValidationLevel = "CANONICAL" | "BUSINESS" | "XSD";

export type ValidationError = {
  code: string;
  message: string;
  path?: string;
  field?: string;
  context?: Record<string, unknown>;
};

export type ValidationWarning = {
  code: string;
  message: string;
  path?: string;
};

export type ValidationResult =
  | { valid: true; level: ValidationLevel; errors: []; warnings: ValidationWarning[] }
  | { valid: false; level: ValidationLevel; errors: ValidationError[]; warnings: ValidationWarning[] };

export function validationOk(level: ValidationLevel, warnings: ValidationWarning[] = []): ValidationResult {
  return { valid: true, level, errors: [], warnings };
}

export function validationFail(level: ValidationLevel, errors: ValidationError[], warnings: ValidationWarning[] = []): ValidationResult {
  return { valid: false, level, errors, warnings };
}
