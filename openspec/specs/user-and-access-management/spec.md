## Purpose

Define how users are onboarded, authenticated, assigned roles, and managed by administrators.

## ADDED Requirements

### Requirement: Role-based user access
The system SHALL authenticate users and authorize access based on assigned role, with at least administrator, manager, and employee roles.

#### Scenario: Administrator accesses user administration
- **WHEN** an authenticated administrator requests the user administration interface or API
- **THEN** the system grants access to user management functions

#### Scenario: Employee is blocked from user administration
- **WHEN** an authenticated employee requests an administrator-only user management function
- **THEN** the system denies access

### Requirement: Administrator manages user lifecycle
The system SHALL allow administrators to create, update, and deactivate user accounts while preserving historical business records.

#### Scenario: Administrator creates a user
- **WHEN** an administrator submits valid user profile, role, and approver information
- **THEN** the system creates the user account in a pending or active onboarding state

#### Scenario: Administrator deactivates a user with history
- **WHEN** an administrator deactivates a user who already has attendance or approval history
- **THEN** the system marks the account inactive without deleting historical records

### Requirement: Administrator can assign and update user role permissions
The system SHALL allow administrators to assign or change a user's role so access rights match organizational responsibility.

#### Scenario: Administrator promotes a user to manager
- **WHEN** an administrator updates a user's role from employee to manager
- **THEN** the system saves the new role and the user gains manager-level access after the next authenticated request

#### Scenario: Administrator changes a manager back to employee
- **WHEN** an administrator changes a user's role to employee
- **THEN** the system removes manager-only access from subsequent requests

### Requirement: New users receive password setup onboarding
The system SHALL generate a one-time password setup flow for newly created users and notify them by email.

#### Scenario: Setup email is issued for a new account
- **WHEN** an administrator successfully creates a new user account with an email address
- **THEN** the system creates a time-bound setup token and sends a password setup email to that address

#### Scenario: User sets initial password
- **WHEN** a new user visits a valid setup link and submits a compliant password
- **THEN** the system activates credential-based login for that account and invalidates the setup token

