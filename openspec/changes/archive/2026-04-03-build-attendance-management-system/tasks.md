## 1. Project setup and local runtime

- [x] 1.1 Initialize the React frontend and Express backend project structure for the attendance system
- [x] 1.2 Add Docker Compose services for frontend, backend, PostgreSQL, and pgAdmin with environment-based configuration
- [x] 1.3 Add shared environment documentation and local startup instructions for the containerized stack

## 2. Data model and backend foundations

- [x] 2.1 Design and create database migrations for users, setup tokens, attendance records, leave balances, leave requests, overtime requests, approvals, and email logs
- [x] 2.2 Implement backend configuration loading, database connection setup, and module structure for auth, users, attendance, leave, overtime, approvals, and notifications
- [x] 2.3 Add authentication and role-based authorization middleware for administrator, manager, and employee access rules

## 3. User onboarding and administration

- [x] 3.1 Implement administrator APIs to create, update, list, and deactivate users
- [x] 3.1a Improve administrator user management UI and workflows so new users, role updates, and list refresh behavior are reliable
- [x] 3.2 Implement one-time password setup token generation, password setup completion, and login endpoints
- [x] 3.3 Implement email delivery integration for password setup notifications and record outbound email logs
- [x] 3.4 Build frontend screens for administrator user management and new-user onboarding completion

## 4. Attendance workflows

- [x] 4.1 Implement backend attendance endpoints for clock-in, clock-out, and attendance history retrieval with invalid transition checks
- [x] 4.1a Add attendance policy storage and administrator APIs to configure standard work start and end times
- [x] 4.1b Add lateness evaluation to clock-in responses based on the configured work start time
- [x] 4.2 Build frontend employee attendance actions and history views
- [x] 4.2a Show late-arrival feedback in the employee attendance UI after clock-in
- [x] 4.3 Build manager-facing attendance history views scoped to direct reports
- [x] 4.3a Add administrator UI to maintain work start and end time windows

## 5. Leave and delegation workflows

- [x] 5.1 Implement backend leave type and leave balance validation logic for annual leave and compensatory leave
- [x] 5.2 Implement leave request submission, delegate validation, approval decision handling, and request history APIs
- [x] 5.3 Build frontend leave request forms, employee request history, and manager approval screens
- [x] 5.3a Refine leave request UI so it is clearly exposed and discoverable as a primary employee function

## 6. Overtime workflows

- [x] 6.1 Implement backend overtime request submission, approval decision handling, and request history APIs
- [x] 6.2 Build frontend overtime request forms, employee request history, and manager approval screens
- [x] 6.3 Expose approved overtime records for future compensatory leave policy integration
- [x] 6.2a Refine overtime request UI so it is clearly exposed and discoverable as a primary employee function

## 7. Verification and delivery readiness

- [x] 7.1 Add automated tests for authentication, authorization, attendance transitions, leave balance validation, and approval workflows
- [x] 7.2 Perform end-to-end manual verification of Docker startup, pgAdmin access, onboarding email flow, clock-in/out, leave approval, and overtime approval
- [x] 7.3 Document known gaps, open policy decisions, and next-phase enhancements for post-MVP planning
