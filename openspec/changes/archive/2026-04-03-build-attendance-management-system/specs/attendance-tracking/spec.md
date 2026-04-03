## ADDED Requirements

### Requirement: Employee can clock in and clock out
The system SHALL allow an authenticated employee to record the start and end of a working day.

#### Scenario: Employee clocks in
- **WHEN** an authenticated employee submits a clock-in action during the workday
- **THEN** the system records a timestamped attendance entry associated with that employee

#### Scenario: Employee clocks out
- **WHEN** an authenticated employee with an active workday submits a clock-out action
- **THEN** the system records a timestamped clock-out entry associated with that employee

### Requirement: Daily attendance uses first clock-in and last clock-out
The system SHALL treat the first clock-in of the day and the last clock-out of the day as the effective attendance bounds for that workday.

#### Scenario: Employee clocks in multiple times in one day
- **WHEN** an employee records more than one clock-in on the same day
- **THEN** the system keeps all raw records and uses the first clock-in as the effective start time

#### Scenario: Employee clocks out multiple times in one day
- **WHEN** an employee records more than one clock-out on the same day
- **THEN** the system keeps all raw records and uses the last clock-out as the effective end time

### Requirement: Administrator configures standard work time window
The system SHALL allow an administrator to define the expected start and end times used for attendance evaluation.

#### Scenario: Administrator updates work hours
- **WHEN** an administrator saves a new standard work start time and end time
- **THEN** the system stores the updated attendance policy for future clock-in evaluation

### Requirement: System flags late clock-in against configured start time
The system SHALL compare clock-in time with the configured work start time and indicate when the employee is late.

#### Scenario: Employee clocks in after the configured start time
- **WHEN** an employee clocks in later than the configured work start time
- **THEN** the system records the clock-in successfully and returns a lateness message or status indicator

#### Scenario: Employee clocks in within the configured start time
- **WHEN** an employee clocks in on or before the configured work start time
- **THEN** the system records the clock-in without a lateness warning

### Requirement: Attendance history is viewable
The system SHALL let employees and authorized managers review attendance history relevant to their scope.

#### Scenario: Employee views own attendance history
- **WHEN** an authenticated employee requests attendance history
- **THEN** the system returns only that employee's attendance records

#### Scenario: Manager views subordinate attendance history
- **WHEN** an authenticated manager requests attendance history for a direct report
- **THEN** the system returns attendance records for that subordinate

### Requirement: Invalid attendance transitions are prevented
The system SHALL reject clock actions that violate the minimum attendance requirements for a workday.

#### Scenario: Clock-out without same-day clock-in is rejected
- **WHEN** an employee submits a clock-out without any clock-in record on the same day
- **THEN** the system rejects the action and reports that the employee must clock in first
