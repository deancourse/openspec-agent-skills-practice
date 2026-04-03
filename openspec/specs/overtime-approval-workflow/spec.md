## Purpose

Define how overtime requests are created, approved, and preserved for later compensatory-leave or reporting use.

## ADDED Requirements

### Requirement: Employee can submit overtime requests
The system SHALL allow employees to submit overtime requests containing date, time range, and justification.

#### Scenario: Employee submits overtime request
- **WHEN** an authenticated employee submits an overtime request with a valid date, time range, and reason
- **THEN** the system stores the request in a pending approval state

### Requirement: Overtime requests require approver action
The system SHALL route overtime requests to the assigned approver and persist approval results.

#### Scenario: Manager approves overtime request
- **WHEN** the assigned approver approves a pending overtime request
- **THEN** the system marks the request approved and records the approval decision with timestamp and approver identity

#### Scenario: Manager rejects overtime request
- **WHEN** the assigned approver rejects a pending overtime request
- **THEN** the system marks the request rejected and records the decision

### Requirement: Overtime records remain available for downstream leave policies
The system SHALL retain approved overtime records so compensatory leave policies can reference them later.

#### Scenario: Approved overtime is queryable
- **WHEN** an approved overtime request exists for an employee
- **THEN** the system makes that approved overtime record available to authorized balance or reporting processes

