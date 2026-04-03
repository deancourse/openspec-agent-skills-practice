## 1. Data Model and Policy

- [x] 1.1 Add a migration for missed punch policy fields on `attendance_policy`
- [x] 1.2 Add a migration for missed punch request storage, statuses, reviewer fields, and indexes
- [x] 1.3 Update attendance policy read/write logic to include missed punch settings and safe defaults

## 2. Backend Attendance Workflow

- [x] 2.1 Add backend service logic to create and list missed punch adjustment requests with scope-aware permissions
- [x] 2.2 Add backend decision logic for deadline checks, auto-approval quota, approver assignment, and duplicate pending request prevention
- [x] 2.3 Add backend review actions for manager/admin approval and rejection with audit fields
- [x] 2.4 Update attendance summary queries to return raw bounds, effective bounds, and adjustment status

## 3. Frontend Experience

- [x] 3.1 Extend `frontend/src/api.js` with missed punch request and review endpoints
- [x] 3.2 Update `frontend/src/pages/AttendancePage.jsx` to show effective attendance status, pending requests, and a missed punch submission flow
- [x] 3.3 Update the admin management UI to edit missed punch policy and review pending requests

## 4. Verification

- [x] 4.1 Add backend integration tests for request submission, policy deadline enforcement, and auto-approval behavior
- [x] 4.2 Add backend integration tests for manager/admin review permissions and effective attendance recomputation
- [x] 4.3 Validate the OpenSpec change and update docs if policy behavior or setup expectations need clarification
