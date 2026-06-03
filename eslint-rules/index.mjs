import { noFlexOverflowRisk } from "./no-flex-overflow-risk.mjs";
import { noUiContractViolation } from "./no-ui-contract-violation.mjs";

/** @type {import('eslint').ESLint.Plugin} */
const cabLayoutPlugin = {
  rules: {
    "no-flex-overflow-risk": noFlexOverflowRisk,
    "no-ui-contract-violation": noUiContractViolation,
  },
};

export default cabLayoutPlugin;
