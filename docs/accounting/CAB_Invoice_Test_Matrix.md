# CAB Invoice Test Matrix

Scenarios A-F in invoice-engine-invariants.test.ts and ciclo-attivo-xml-sdi.test.ts.

A: delivered + validly_issued
B: rejected + not_validly_issued  
C: correction preserves history
D: MC != rejected
E: timeout -> reconciliation
F: duplicate idempotent
