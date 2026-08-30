# Control matrix (generated)

**Generated:** 2026-08-29
**Contract:** 1.0.0 | **Registry:** 1.0.0

Do not edit by hand — regenerate with `npm run control:matrix`.

| ID | Domain | Tier | Severity | Status | Owner |
|----|--------|------|----------|--------|-------|
| `security.rbac.matrix` | security | pr | blocker | active | security |
| `security.rbac.hardening` | security | pr | blocker | active | security |
| `security.remediation` | security | pr | blocker | active | security |
| `security.typescript.compile` | security | pr | blocker | active | platform |
| `data.production.readiness` | data | pr | blocker | active | database |
| `data.supabase.connection` | data | pr | blocker | active | database |
| `data.publication.sanity` | data | pr | blocker | active | database |
| `data.publication.full` | data | cert | blocker | active | database |
| `data.migration.parity` | data | staging | blocker | active | database |
| `data.release-v2.audit` | data | cert | warning | active | database |
| `governance.audit.write-coverage` | data | pr | blocker | active | platform |
| `design.ux.enforce` | design | pr | blocker | active | frontend |
| `design.ui.consistency` | design | pr | blocker | active | frontend |
| `design.mobile.gate` | design | pr | blocker | active | frontend |
| `design.ios.static` | design | pr | blocker | active | frontend |
| `design.flex.eslint` | design | pr | blocker | active | frontend |
| `design.flex.freeze` | design | pr | blocker | active | frontend |
| `design.structural.smoke` | design | pr | blocker | active | frontend |
| `domain.build.production` | domain | pr | blocker | active | platform |
| `runtime.regression.p0` | runtime | pr | blocker | active | platform |
| `runtime.regression.p1` | runtime | cert | blocker | active | platform |
| `runtime.regression.p2` | runtime | cert | warning | active | frontend |
| `runtime.regression.p3` | runtime | observe | info | active | platform |
| `runtime.e2e.smoke` | runtime | pr | blocker | active | platform |
| `runtime.e2e.cert.mobile` | runtime | cert | blocker | active | frontend |
| `runtime.e2e.cert.scheda` | runtime | cert | blocker | active | frontend |
| `runtime.e2e.cert.ricambio` | runtime | cert | blocker | active | domain-owner |
| `runtime.smoke.preflight` | runtime | pr | blocker | active | devops |
| `runtime.smoke.cleanup` | runtime | cert | blocker | active | devops |
| `runtime.smoke.residues` | runtime | cert | warning | active | devops |
| `runtime.session.soak` | runtime | cert | blocker | active | platform |
| `runtime.performance.policy` | runtime | pr | blocker | active | platform |
| `runtime.performance.build-budget` | runtime | pr | blocker | active | platform |
| `runtime.performance.lint` | runtime | pr | blocker | active | platform |
| `runtime.lint.full` | runtime | observe | info | active | platform |
| `runtime.performance.regression` | runtime | cert | blocker | active | platform |
| `runtime.performance.lighthouse` | runtime | cert | warning | active | platform |
| `runtime.performance.browser-profile` | runtime | observe | info | active | platform |
| `runtime.soak.extended` | runtime | observe | info | active | platform |
| `governance.control.review` | governance | pr | blocker | active | platform |
| `governance.regression.classification` | governance | pr | blocker | active | platform |
| `governance.production.certification` | governance | production | blocker | active | platform |
| `governance.rbac.sync-check` | governance | observe | warning | experimental | security |
| `governance.control.coverage` | governance | pr | warning | active | platform |
| `governance.control.owner` | governance | observe | warning | active | platform |
| `governance.notification.ssot` | governance | pr | blocker | active | platform |
| `governance.notification.catalog` | governance | pr | blocker | active | platform |
| `governance.registry.size` | governance | observe | warning | active | platform |
| `governance.ai.runtime` | governance | pr | blocker | active | platform |
| `governance.lifecycle.deprecated` | governance | observe | warning | active | platform |
| `governance.report.v2.contracts` | governance | pr | blocker | active | platform |
| `governance.report.v2.datasets` | governance | pr | blocker | active | platform |
| `governance.report.v2.semantic-contract` | governance | pr | blocker | active | platform |
| `governance.report.v2.executive-contract` | governance | pr | blocker | active | platform |
| `governance.report.v2.executive-boundary` | governance | pr | blocker | active | platform |
| `governance.report.v2.executive-hardening` | governance | pr | blocker | active | platform |
| `governance.report.v2.executive` | governance | pr | blocker | active | platform |
| `governance.report.v2.cross-contract` | governance | pr | blocker | active | platform |
| `governance.report.v2.cross-parity` | governance | pr | blocker | active | platform |
| `governance.report.v2.cross-analysis` | governance | pr | blocker | active | platform |
| `governance.report.v2.insight-contract` | governance | pr | blocker | active | platform |
| `governance.report.v2.insight-rules` | governance | pr | blocker | active | platform |
| `governance.report.v2.insight-engine` | governance | pr | blocker | active | platform |
| `governance.report.v2.insight-analysis` | governance | pr | blocker | active | platform |
| `governance.report.v2.insight-hardening` | governance | pr | blocker | active | platform |
| `governance.report.v2.ai-context` | governance | pr | blocker | active | platform |
| `governance.report.v2.narrative-contract` | governance | pr | blocker | active | platform |
| `governance.report.v2.narrative-provider` | governance | pr | blocker | active | platform |
| `governance.report.v2.narrative-quality` | governance | pr | blocker | active | platform |
| `governance.report.v2.narrative-consumer` | governance | pr | blocker | active | platform |
| `governance.report.v2.narrative-preflight` | governance | pr | blocker | active | platform |
| `governance.report.v2.narrative-rollout` | governance | pr | blocker | active | platform |
| `governance.report.p4.business-report` | governance | pr | blocker | active | platform |
| `governance.report.p5.operational-context` | governance | pr | blocker | active | platform |
| `governance.report.p6.advanced-bi` | governance | pr | blocker | active | platform |
| `governance.report.p7.decision-center` | governance | pr | blocker | active | platform |
| `governance.report.p8.ask-report` | governance | pr | blocker | active | platform |
| `governance.report.data-integration` | governance | pr | blocker | active | platform |
| `governance.report.data-completion` | governance | pr | blocker | active | platform |
| `governance.report.legacy-consolidation` | governance | pr | blocker | active | platform |
| `governance.report.p9.legacy-elimination` | governance | pr | blocker | active | platform |
| `governance.report.p10.data-ux` | governance | pr | blocker | active | platform |
| `formux.promotion.gate` | governance | observe | info | deprecated | platform |

## Impact

- **security.rbac.matrix:** all-users, tenant-isolation, customer-data
- **security.rbac.hardening:** all-users, tenant-isolation
- **security.remediation:** all-users, tenant-isolation, customer-data, compliance-audit
- **security.typescript.compile:** developer-experience, compliance-audit
- **data.production.readiness:** all-users, customer-data, compliance-audit
- **data.supabase.connection:** all-users, operations
- **data.publication.sanity:** operations
- **data.publication.full:** operations, compliance-audit
- **data.migration.parity:** all-users, customer-data
- **data.release-v2.audit:** compliance-audit
- **governance.audit.write-coverage:** compliance-audit, all-users
- **design.ux.enforce:** developer-experience
- **design.ui.consistency:** all-users, developer-experience
- **design.mobile.gate:** all-users
- **design.ios.static:** all-users
- **design.flex.eslint:** developer-experience
- **design.flex.freeze:** developer-experience
- **design.structural.smoke:** developer-experience
- **domain.build.production:** all-users, operations
- **runtime.regression.p0:** all-users, customer-data, billing
- **runtime.regression.p1:** operations, billing
- **runtime.regression.p2:** developer-experience
- **runtime.regression.p3:** developer-experience
- **runtime.e2e.smoke:** all-users, operations
- **runtime.e2e.cert.mobile:** all-users
- **runtime.e2e.cert.scheda:** operations
- **runtime.e2e.cert.ricambio:** operations
- **runtime.smoke.preflight:** operations
- **runtime.smoke.cleanup:** customer-data, operations
- **runtime.smoke.residues:** customer-data
- **runtime.session.soak:** operations
- **runtime.performance.policy:** developer-experience, operations
- **runtime.performance.build-budget:** operations
- **runtime.performance.lint:** developer-experience
- **runtime.lint.full:** developer-experience
- **runtime.performance.regression:** operations
- **runtime.performance.lighthouse:** operations
- **runtime.performance.browser-profile:** operations
- **runtime.soak.extended:** operations
- **governance.control.review:** compliance-audit, developer-experience
- **governance.regression.classification:** compliance-audit
- **governance.production.certification:** compliance-audit
- **governance.rbac.sync-check:** tenant-isolation, compliance-audit
- **governance.control.coverage:** compliance-audit, developer-experience
- **governance.control.owner:** compliance-audit
- **governance.notification.ssot:** all-users, operations
- **governance.notification.catalog:** all-users, operations
- **governance.registry.size:** developer-experience, compliance-audit
- **governance.ai.runtime:** customer-data, operations, compliance-audit, developer-experience
- **governance.lifecycle.deprecated:** compliance-audit
- **governance.report.v2.contracts:** compliance-audit, developer-experience
- **governance.report.v2.datasets:** compliance-audit, developer-experience, customer-data
- **governance.report.v2.semantic-contract:** compliance-audit, developer-experience
- **governance.report.v2.executive-contract:** compliance-audit, developer-experience
- **governance.report.v2.executive-boundary:** compliance-audit, developer-experience
- **governance.report.v2.executive-hardening:** compliance-audit, developer-experience
- **governance.report.v2.executive:** compliance-audit, developer-experience, customer-data
- **governance.report.v2.cross-contract:** compliance-audit, developer-experience
- **governance.report.v2.cross-parity:** compliance-audit, developer-experience
- **governance.report.v2.cross-analysis:** compliance-audit, developer-experience, customer-data
- **governance.report.v2.insight-contract:** compliance-audit, developer-experience
- **governance.report.v2.insight-rules:** compliance-audit, developer-experience
- **governance.report.v2.insight-engine:** compliance-audit, developer-experience
- **governance.report.v2.insight-analysis:** compliance-audit, developer-experience, customer-data
- **governance.report.v2.insight-hardening:** compliance-audit, developer-experience
- **governance.report.v2.ai-context:** compliance-audit, developer-experience
- **governance.report.v2.narrative-contract:** compliance-audit, developer-experience
- **governance.report.v2.narrative-provider:** compliance-audit, developer-experience
- **governance.report.v2.narrative-quality:** compliance-audit, developer-experience
- **governance.report.v2.narrative-consumer:** compliance-audit, developer-experience
- **governance.report.v2.narrative-preflight:** compliance-audit, developer-experience
- **governance.report.v2.narrative-rollout:** compliance-audit, developer-experience
- **governance.report.p4.business-report:** compliance-audit, developer-experience
- **governance.report.p5.operational-context:** compliance-audit, developer-experience
- **governance.report.p6.advanced-bi:** compliance-audit, developer-experience
- **governance.report.p7.decision-center:** compliance-audit, developer-experience
- **governance.report.p8.ask-report:** compliance-audit, developer-experience
- **governance.report.data-integration:** compliance-audit, developer-experience
- **governance.report.data-completion:** compliance-audit, developer-experience
- **governance.report.legacy-consolidation:** compliance-audit, developer-experience
- **governance.report.p9.legacy-elimination:** compliance-audit, developer-experience
- **governance.report.p10.data-ux:** compliance-audit, developer-experience
- **formux.promotion.gate:** developer-experience
