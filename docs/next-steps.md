# Known gaps and next steps

## Current MVP gaps

- Manager selection currently relies on explicit user IDs in the UI instead of a polished picker.
- Approved overtime is exposed for downstream use, but compensatory leave accrual policies are not automatically applied yet.
- Current tests cover key workflows, but edge cases and UI-level automation are not yet comprehensive.

## Open policy decisions

- Whether annual leave balances should be seeded manually or derived from tenure.
- Whether compensatory leave should be credited automatically when overtime is approved.
- Whether request approvals should stay single-step or support multi-level escalation.
- Whether attendance should later enforce location, IP, or shift constraints.
- Whether attendance policy should remain global in MVP or evolve into per-department settings.

## Suggested next phase

- Add seed scripts for richer demo data such as manager/employee hierarchies.
- Add MailHog to Docker Compose if the team wants a visible inbox instead of the current local mock email delivery.
- Add stronger validation, richer form UX, and entity pickers.
- Expand automated tests to cover more edge cases, browser flows, and reporting scenarios.
- Add reporting, exports, and compensatory leave accrual rules.
