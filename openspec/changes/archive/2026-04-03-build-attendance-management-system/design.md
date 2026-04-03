## Context

This change introduces a full-stack attendance management product where employees clock in and out, submit leave and overtime requests, and participate in manager approval flows. The system must support administrator-led user management, secure onboarding through email, delegation during leave periods, and local development through Docker Compose with PostgreSQL and pgAdmin.

The implementation spans frontend application flows, backend APIs, authorization, database modeling, email delivery, and containerized runtime concerns. Because the project starts from a blank OpenSpec baseline, the design should establish stable boundaries that allow an MVP to ship without overcommitting to advanced HR rules such as shift planning or payroll integration.

## Goals / Non-Goals

**Goals:**
- Deliver a role-based system for administrators, managers, and employees.
- Support account creation, authentication, password setup, and safe account deactivation.
- Support attendance clock-in and clock-out flows with historical record viewing and lateness evaluation.
- Support leave requests for annual leave and compensatory leave with delegate assignment and manager approval.
- Support overtime request submission and manager approval with future compatibility for compensatory leave accrual.
- Allow administrators to configure standard work start and end time windows used by attendance evaluation.
- Provide a local Docker Compose runtime containing frontend, backend, PostgreSQL, and pgAdmin.

**Non-Goals:**
- Payroll calculation, salary settlement, or tax reporting.
- Geo-fencing, IP restrictions, or biometric attendance validation in the MVP.
- Complex multi-level approval chains beyond a single direct approver.
- Advanced roster scheduling, shift differential rules, or public-holiday policy engines.
- Production-grade cloud deployment automation in this change.

## Decisions

### 1. Use a single React application with route-guarded role experiences

The frontend will be a single React app that renders employee, manager, and administrator views based on authenticated role and permissions. This reduces duplicated UI infrastructure and keeps shared concepts such as notifications, navigation, and profile state in one codebase.

Alternative considered:
- Separate admin and employee frontends. Rejected for MVP because it adds deployment and maintenance overhead without clear functional gain.

### 2. Use Express as a modular monolith with domain-oriented API modules

The backend will be an Express application organized into modules for auth, users, attendance, leave, overtime, approvals, and notifications. This keeps the service simple to run in Docker while preserving clear separation for testing and future extraction if scale requires it.

Alternative considered:
- Split into multiple services from the start. Rejected because workflow consistency and transaction boundaries are easier to manage in one service at MVP stage.

### 3. Model approval ownership around a direct approver relationship

Each employee record will reference a manager or approver account. Leave and overtime requests will snapshot the approver at submission time so later user hierarchy changes do not rewrite historical approval chains.

Alternative considered:
- Configurable multi-step workflows. Rejected for MVP because it introduces policy configuration and escalation complexity beyond the current business ask.

### 4. Send password setup emails instead of emailing plaintext passwords

When an administrator creates a user, the backend will generate a one-time password setup token and email a setup link. This is more secure than sending a plaintext password and still satisfies the onboarding requirement.

Alternative considered:
- Generate and email a temporary password. Rejected because it increases credential exposure risk and creates extra support burden if the message is intercepted or delayed.

### 5. Record attendance as immutable clock events with a derived workday view

Clock actions will be stored as timestamped attendance events or records that distinguish clock-in and clock-out. The application can derive a day summary from the earliest clock-in and latest clock-out for MVP reporting while preserving audit history for corrections later.

Alternative considered:
- Store only one row per day with editable check-in and check-out columns. Rejected because immutable events are safer for auditing and future expansion such as break tracking or correction requests.

### 5a. Store attendance policy separately from attendance events

Administrator-managed workday policy should live in its own settings table or configuration record so the system can compare actual clock-in time against the expected start and end windows without mutating the raw attendance history. This keeps policy changes auditable and avoids mixing configuration with transaction data.

Alternative considered:
- Hard-code work hours in frontend or backend constants. Rejected because administrators explicitly need to adjust the allowed work window without code deployment.

### 6. Treat leave balances and overtime balances as separate but connected domains

Leave requests will validate against leave balances by type, while approved overtime requests remain their own records. The design leaves a service boundary where compensatory leave balances can be incremented from approved overtime without entangling the initial overtime submission flow.

Alternative considered:
- Directly mutate compensatory leave balance during overtime approval in the same workflow. Deferred so balance accrual rules can evolve without rewriting the request process.

### 7. Prefer soft deletion or deactivation for users

Administrators may manage user lifecycle, but persisted attendance, leave, overtime, and approval history must remain referentially intact. The system will therefore use an inactive status for ordinary removal and reserve hard deletion for exceptional administrative cleanup before a user has transactional history.

Alternative considered:
- Hard delete all users. Rejected because it risks orphaning historical records and weakens auditability.

### 8. Use Docker Compose as the canonical local runtime

The repository will define services for frontend, backend, PostgreSQL, and pgAdmin through Docker Compose. pgAdmin provides the requested browser-based administration surface without requiring extra local tooling.

Alternative considered:
- Local Node and database processes without containers. Rejected because onboarding would be less predictable and would not satisfy the explicit Docker requirement.

## Risks / Trade-offs

- [Approval model too simple for future org policies] -> Mitigation: keep approval services and database schema extensible by storing approval records separately from request records.
- [Attendance rules may vary by company policy] -> Mitigation: limit MVP behavior to basic clock-in/clock-out and document advanced policy handling as future change work.
- [Late-arrival rules may vary by department or shift] -> Mitigation: start with a single global attendance policy configurable by administrators and leave room for future per-user or per-department overrides.
- [Email setup flow depends on SMTP configuration] -> Mitigation: use a development-safe mail catcher or test SMTP during local setup and keep the mail provider behind an adapter interface.
- [Soft-deleted users may still affect UI lists] -> Mitigation: centralize active-user filtering and add admin visibility for inactive accounts.
- [Compensatory leave logic may need policy-specific calculations] -> Mitigation: keep overtime approval and leave balance accrual loosely coupled so balance rules can be revised later.

## Migration Plan

1. Create Docker Compose services and environment templates for frontend, backend, PostgreSQL, and pgAdmin.
2. Add the backend database schema and migration scripts for users, auth setup tokens, attendance records, leave balances, leave requests, overtime requests, approvals, and email logs.
3. Add attendance policy settings and lateness evaluation support in the backend data model.
4. Implement authentication and role authorization before feature endpoints.
5. Implement user administration, role management, and onboarding email flow.
6. Implement attendance APIs and UI, including late-arrival messaging based on configured work windows.
6. Implement leave, delegation, and approval APIs and UI.
7. Implement overtime request and approval APIs and UI.
8. Validate the stack through containerized smoke tests and manual workflow verification.

Rollback strategy:
- Revert application containers to the previous image set.
- Roll back the latest database migration if newly introduced tables or columns break the release and no irreversible data conversion has occurred.

## Open Questions

- Should approved overtime immediately generate compensatory leave balance, or should administrators confirm accrual separately?
- Are annual leave balances seeded manually by administrators, or calculated from tenure rules in a later phase?
- Does each employee have exactly one default approver, or should the system allow an administrator override per request type?
- Are leave durations required in hours as well as days from day one, or is day-based input sufficient for the first release?
- Is the configurable work window global for the whole company in MVP, or should the design already support different work windows by team?
