## ADDED Requirements

### Requirement: User can use dark mode

The system SHALL provide a user-facing dark mode for the web UI that can be toggled between light and dark themes.

#### Scenario: Manual toggle

- **WHEN** the user clicks the theme toggle in the UI
- **THEN** the interface switches to the selected theme immediately

#### Scenario: System preference on first load

- **WHEN** the user opens the application for the first time
- **THEN** the interface theme matches the system preference by default

### Requirement: User preference persists

The system SHALL persist the user's explicit theme choice across browser sessions using localStorage or an equivalent mechanism.

#### Scenario: Return visit

- **WHEN** the user revisits the application after explicitly choosing dark mode
- **THEN** the interface renders in dark mode without requiring another toggle

### Requirement: Theme maintains readable contrast

The system SHALL ensure that all core page colors and text combinations remain readable in both light and dark themes.

#### Scenario: Dark mode readability

- **WHEN** the interface is in dark mode
- **THEN** text and interactive elements meet WCAG contrast requirements against dark backgrounds
