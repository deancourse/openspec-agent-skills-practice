## ADDED Requirements

### Requirement: Employee can submit a missed punch adjustment request
The system SHALL allow an authenticated employee to submit a missed punch adjustment request for a work date when the employee is missing a clock-in, missing a clock-out, or needs to replace an obviously incorrect effective bound.

#### Scenario: Employee submits a missing clock-in request
- **WHEN** an employee selects a work date with no effective clock-in and submits a replacement clock-in time with a reason
- **THEN** the system stores a missed punch adjustment request linked to that employee and work date

#### Scenario: Employee submits a missing clock-out request
- **WHEN** an employee selects a work date with no effective clock-out and submits a replacement clock-out time with a reason
- **THEN** the system stores a missed punch adjustment request linked to that employee and work date

### Requirement: Missed punch policy is configurable
The system SHALL allow an administrator to configure the policy used to evaluate missed punch adjustment requests.

#### Scenario: Administrator updates missed punch policy
- **WHEN** an administrator saves missed punch settings including submission deadline, approval mode, and monthly auto-approve allowance
- **THEN** the system stores the updated policy for future adjustment requests

### Requirement: System enforces flexible missed punch policy
The system SHALL evaluate each missed punch adjustment request against the configured policy before deciding whether it is auto-approved, routed for review, or rejected.

#### Scenario: Request qualifies for auto-approval allowance
- **WHEN** an employee submits an eligible request within the allowed deadline and still has remaining monthly auto-approve allowance
- **THEN** the system marks the request as approved without manager action and records that policy-based auto-approval was used

#### Scenario: Request requires approver review
- **WHEN** an employee submits a request that is within the allowed deadline but does not qualify for auto-approval
- **THEN** the system marks the request as pending and assigns it to the employee's approver or an administrator

#### Scenario: Request is outside the allowed deadline
- **WHEN** an employee submits a request after the configured deadline and no override privilege applies
- **THEN** the system rejects the request and reports that the submission window has expired

### Requirement: Approver can review missed punch requests
The system SHALL allow the assigned manager or an administrator to approve or reject a pending missed punch adjustment request.

#### Scenario: Manager approves a pending request
- **WHEN** the assigned manager approves a pending missed punch adjustment request with an optional comment
- **THEN** the system records the approval decision and marks the request as approved

#### Scenario: Manager rejects a pending request
- **WHEN** the assigned manager rejects a pending missed punch adjustment request with a comment
- **THEN** the system records the rejection reason and marks the request as rejected

### Requirement: Approved adjustments preserve an audit trail
The system SHALL preserve the original attendance events and keep a separate audit trail for any approved or rejected missed punch adjustment request.

#### Scenario: Approved request keeps original punch history
- **WHEN** a missed punch adjustment request is approved
- **THEN** the system keeps the original attendance records unchanged and stores the approved replacement time, approver identity, and decision timestamps separately

#### Scenario: Attendance history includes adjustment status
- **WHEN** an employee, manager, or administrator views missed punch requests within their allowed scope
- **THEN** the system returns each request with its requested time, status, reason, reviewer information, and decision comment
