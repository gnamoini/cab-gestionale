import { noAuthInServices } from "./cab-rbac/no-auth-in-services.mjs";
import { noEnsureWorkflowWrite } from "./cab-rbac/no-ensure-workflow-write.mjs";
import { noEntrypointChaining } from "./cab-rbac/no-entrypoint-chaining.mjs";
import { noFlexOverflowRisk } from "./no-flex-overflow-risk.mjs";
import { noUiContractViolation } from "./no-ui-contract-violation.mjs";
import { noNativeTitleTooltip } from "./cab-ui/no-native-title-tooltip.mjs";
import { noDirectDsImport } from "./cab-ui/no-direct-ds-import.mjs";
import { noCssTooltip } from "./cab-ui/no-css-tooltip.mjs";

/** @type {import('eslint').ESLint.Plugin} */
const cabLayoutPlugin = {
  rules: {
    "no-flex-overflow-risk": noFlexOverflowRisk,
    "no-ui-contract-violation": noUiContractViolation,
    "no-auth-in-services": noAuthInServices,
    "no-ensure-workflow-write": noEnsureWorkflowWrite,
    "no-entrypoint-chaining": noEntrypointChaining,
    "no-native-title-tooltip": noNativeTitleTooltip,
    "no-direct-ds-import": noDirectDsImport,
    "no-css-tooltip": noCssTooltip,
  },
};

export default cabLayoutPlugin;
