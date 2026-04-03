## MODIFIED Requirements

### Requirement: Daily attendance uses first clock-in and last clock-out
The system SHALL treat the first clock-in of the day and the last clock-out of the day as the default effective attendance bounds for that workday, and SHALL allow approved missed punch adjustments to replace a missing or invalid effective bound without altering the raw attendance events.

#### Scenario: Employee clocks in multiple times in one day
- **WHEN** an employee records more than one clock-in on the same day
- **THEN** the system keeps all raw records and uses the first clock-in as the default effective start time

#### Scenario: Employee clocks out multiple times in one day
- **WHEN** an employee records more than one clock-out on the same day
- **THEN** the system keeps all raw records and uses the last clock-out as the default effective end time

#### Scenario: Approved adjustment fills a missing clock-in
- **WHEN** a workday has no raw clock-in record and the employee receives an approved replacement clock-in time
- **THEN** the system uses the approved replacement time as the effective start time for summaries and rule evaluation

#### Scenario: Approved adjustment fills a missing clock-out
- **WHEN** a workday has no raw clock-out record and the employee receives an approved replacement clock-out time
- **THEN** the system uses the approved replacement time as the effective end time for summaries and rule evaluation

### Requirement: System flags late clock-in against configured start time
The system SHALL compare the effective clock-in time with the configured work start time and indicate when the employee is late, regardless of whether the effective clock-in comes from a raw punch or an approved adjustment.

#### Scenario: Employee clocks in after the configured start time
- **WHEN** an employee's effective clock-in is later than the configured work start time
- **THEN** the system records or derives the attendance successfully and returns a lateness message or status indicator

#### Scenario: Employee clocks in within the configured start time
- **WHEN** an employee's effective clock-in is on or before the configured work start time
- **THEN** the system records or derives the attendance without a lateness warning

#### Scenario: Pending adjustment does not change lateness yet
- **WHEN** a workday has a pending missed punch adjustment request that would affect the effective clock-in
- **THEN** the system keeps the current lateness result based on approved data only and marks the day as having a pending adjustment

### Requirement: Attendance history is viewable
The system SHALL let employees and authorized managers review attendance history relevant to their scope, including whether each workday uses raw punches only, has a pending missed punch request, or has an approved adjustment.

#### Scenario: Employee views own attendance history
- **WHEN** an authenticated employee requests attendance history
- **THEN** the system returns only that employee's attendance records with effective bounds and missed punch status for each workday

#### Scenario: Manager views subordinate attendance history
- **WHEN** an authenticated manager requests attendance history for a direct report
- **THEN** the system returns attendance records for that subordinate with effective bounds and missed punch status for each workday
