## Purpose

Define how leave requests, delegates, leave balances, and approval decisions are handled.

## ADDED Requirements

### Requirement: Employee can submit leave requests
The system SHALL allow employees to submit leave requests that include leave type, time range, reason, and delegate information.

#### Scenario: Employee submits annual leave request
- **WHEN** an authenticated employee submits a leave request with annual leave, a valid date range, and a delegate
- **THEN** the system stores the request in a pending approval state

#### Scenario: Employee submits compensatory leave request
- **WHEN** an authenticated employee submits a compensatory leave request within available balance
- **THEN** the system stores the request in a pending approval state

### Requirement: Leave balances are validated for constrained leave types
The system SHALL validate available balance before accepting annual leave or compensatory leave requests.

#### Scenario: Request exceeds annual leave balance
- **WHEN** an employee submits an annual leave request that exceeds the available balance
- **THEN** the system rejects the request and explains that the remaining balance is insufficient

#### Scenario: Request exceeds compensatory leave balance
- **WHEN** an employee submits a compensatory leave request that exceeds the available balance
- **THEN** the system rejects the request and explains that the remaining balance is insufficient

### Requirement: Leave requests require approver action
The system SHALL route submitted leave requests to an assigned approver and track the approval decision.

#### Scenario: Manager approves leave request
- **WHEN** the assigned approver approves a pending leave request
- **THEN** the system marks the request approved and records the approval decision with timestamp and approver identity

#### Scenario: Manager rejects leave request
- **WHEN** the assigned approver rejects a pending leave request
- **THEN** the system marks the request rejected and records the decision

### Requirement: Delegate assignment is required for leave coverage
The system SHALL require a delegate to be identified for leave requests that remove the employee from normal work coverage.

#### Scenario: Leave request omits delegate
- **WHEN** an employee submits a leave request without a delegate for a leave type that requires handoff coverage
- **THEN** the system rejects the request and asks the employee to provide a delegate

