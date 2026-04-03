## Why

The team needs a single internal system for attendance, leave, and overtime workflows so employees and managers do not rely on manual spreadsheets or chat-based approvals. Building this now gives the project a clear functional baseline that can be implemented with a modern web stack and run consistently through Docker in local and deployment environments.

## What Changes

- Add a web-based attendance management system with React frontend, Express backend, PostgreSQL database, and Docker Compose orchestration.
- Add role-based access control for administrators, managers, and employees.
- Add administrator user lifecycle management, including create, update, deactivate, and delete-safe account administration.
- Add administrator controls for user role assignment and attendance policy configuration.
- Add secure account onboarding by sending a password setup or initial credential email when a new user is created.
- Add employee clock-in and clock-out workflows with attendance history viewing, expected work window comparison, and lateness feedback.
- Add leave request workflows supporting annual leave, compensatory leave, delegation, and approval processing.
- Add overtime request workflows with manager approval and future compatibility with compensatory leave balance updates.
- Add Docker-managed supporting services, including PostgreSQL and a browser-based PostgreSQL admin console.

## Capabilities

### New Capabilities
- `user-and-access-management`: Manage users, roles, account onboarding, and authentication entry points.
- `attendance-tracking`: Record employee clock-in and clock-out events, expose attendance history, and evaluate attendance against configured work windows.
- `leave-and-delegation-workflow`: Submit leave requests with leave types, delegate assignment, and approval flow.
- `overtime-approval-workflow`: Submit overtime requests and process approval decisions.
- `local-platform-runtime`: Run the application stack with Docker Compose, PostgreSQL, and a PostgreSQL admin web UI.

### Modified Capabilities

None.

## Impact

- Affects frontend application structure, authenticated routing, form flows, and manager/admin screens.
- Affects backend API design, authorization middleware, email delivery integration, attendance rule evaluation, and approval workflow logic.
- Adds PostgreSQL schema for users, attendance, attendance policy settings, leave, overtime, approvals, and notification history.
- Adds Docker Compose configuration for frontend, backend, PostgreSQL, and pgAdmin.
