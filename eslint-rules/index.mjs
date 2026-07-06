import { noAuthInServices } from "./cab-rbac/no-auth-in-services.mjs";
import { noEnsureWorkflowWrite } from "./cab-rbac/no-ensure-workflow-write.mjs";
import { noEntrypointChaining } from "./cab-rbac/no-entrypoint-chaining.mjs";
import { noFlexOverflowRisk } from "./no-flex-overflow-risk.mjs";
import { noUiContractViolation } from "./no-ui-contract-violation.mjs";

/** @type {import('eslint').ESLint.Plugin} */
const cabLayoutPlugin = {
  rules: {
    "no-flex-overflow-risk": noFlexOverflowRisk,
    "no-ui-contract-violation": noUiContractViolation,
    "no-auth-in-services": noAuthInServices,
    "no-ensure-workflow-write": noEnsureWorkflowWrite,
    "no-entrypoint-chaining": noEntrypointChaining,
  },
};

export default cabLayoutPlugin;
