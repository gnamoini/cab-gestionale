import { noAuthInServices } from "./cab-rbac/no-auth-in-services.mjs";
import { noEnsureWorkflowWrite } from "./cab-rbac/no-ensure-workflow-write.mjs";
import { noEntrypointChaining } from "./cab-rbac/no-entrypoint-chaining.mjs";
import { noFlexOverflowRisk } from "./no-flex-overflow-risk.mjs";
import { noUiContractViolation } from "./no-ui-contract-violation.mjs";
import { noNativeTitleTooltip } from "./cab-ui/no-native-title-tooltip.mjs";
import { noDirectDsImport } from "./cab-ui/no-direct-ds-import.mjs";
import { noCssTooltip } from "./cab-ui/no-css-tooltip.mjs";
import { noSelectStar } from "./cab-perf/no-select-star.mjs";
import { noHeavyImportInClient } from "./cab-perf/no-heavy-import-in-client.mjs";
import { noSsrFalsePrefetchedRoute } from "./cab-perf/no-ssr-false-prefetched-route.mjs";
import { noImgWithoutNextImage } from "./cab-perf/no-img-without-next-image.mjs";

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
    "no-select-star": noSelectStar,
    "no-heavy-import-in-client": noHeavyImportInClient,
    "no-ssr-false-prefetched-route": noSsrFalsePrefetchedRoute,
    "no-img-without-next-image": noImgWithoutNextImage,
  },
};

export default cabLayoutPlugin;
