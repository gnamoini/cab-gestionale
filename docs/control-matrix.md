# Control matrix (generated)

**Generated:** 2026-07-10
**Contract:** 1.0.0 | **Registry:** 1.0.0

Do not edit by hand — regenerate with `npm run control:matrix`.

| ID | Domain | Tier | Severity | Status | Owner |
|----|--------|------|----------|--------|-------|
| `security.rbac.matrix` | security | pr | blocker | active | security |
| `security.rbac.hardening` | security | pr | blocker | active | security |
| `security.typescript.compile` | security | pr | blocker | active | platform |
| `data.production.readiness` | data | pr | blocker | active | database |
| `data.supabase.connection` | data | pr | blocker | active | database |
| `data.publication.sanity` | data | pr | blocker | active | database |
| `data.publication.full` | data | cert | blocker | active | database |
| `data.migration.parity` | data | staging | blocker | active | database |
| `data.release-v2.audit` | data | cert | warning | active | database |
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
| `runtime.lint.full` | runtime | observe | info | active | platform |
| `runtime.performance.regression` | runtime | observe | warning | active | platform |
| `runtime.soak.extended` | runtime | observe | info | active | platform |
| `governance.control.review` | governance | pr | blocker | active | platform |
| `governance.regression.classification` | governance | pr | blocker | active | platform |
| `governance.production.certification` | governance | production | blocker | active | platform |
| `governance.rbac.sync-check` | governance | observe | warning | experimental | security |
| `formux.promotion.gate` | governance | observe | info | deprecated | platform |

## Impact

- **security.rbac.matrix:** all-users, tenant-isolation, customer-data
- **security.rbac.hardening:** all-users, tenant-isolation
- **security.typescript.compile:** developer-experience, compliance-audit
- **data.production.readiness:** all-users, customer-data, compliance-audit
- **data.supabase.connection:** all-users, operations
- **data.publication.sanity:** operations
- **data.publication.full:** operations, compliance-audit
- **data.migration.parity:** all-users, customer-data
- **data.release-v2.audit:** compliance-audit
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
- **runtime.lint.full:** developer-experience
- **runtime.performance.regression:** operations
- **runtime.soak.extended:** operations
- **governance.control.review:** compliance-audit, developer-experience
- **governance.regression.classification:** compliance-audit
- **governance.production.certification:** compliance-audit
- **governance.rbac.sync-check:** tenant-isolation, compliance-audit
- **formux.promotion.gate:** developer-experience
