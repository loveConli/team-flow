## MODIFIED Requirements

### Requirement: Protected requests use one authentication boundary

The system SHALL route all protected requests through a single authentication boundary instead of scattering checks across route handlers and service helpers.

#### Scenario: Protected endpoint request

- **WHEN** a protected endpoint receives a request
- **THEN** the authentication boundary evaluates credentials and produces a stable auth decision before the route handler executes

### Requirement: Auth failures map consistently

The system SHALL map unauthorized and forbidden outcomes from the authentication boundary to consistent response formats across all protected routes.

#### Scenario: Missing credentials

- **WHEN** a protected request lacks valid credentials
- **THEN** the boundary returns an unauthorized decision and the route responds with the standard unauthorized format

#### Scenario: Insufficient permissions

- **WHEN** a protected request has valid credentials but insufficient permissions
- **THEN** the boundary returns a forbidden decision and the route responds with the standard forbidden format

### Requirement: Existing approved login behavior remains unchanged

The system SHALL preserve existing externally approved login and session behavior while moving request-level checks behind the new boundary.

#### Scenario: Successful login

- **WHEN** a user completes the existing login flow
- **THEN** session creation and token issuance behavior remains identical to the pre-refactor implementation
