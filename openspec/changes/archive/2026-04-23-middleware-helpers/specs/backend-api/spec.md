## ADDED Requirements

### Requirement: Middleware validation helpers format user-facing error messages

The `backend-api` project SHALL provide reusable middleware helpers that convert a `ZodError` and the original request payload into a descriptive, user-facing validation message suitable for an `ErrorResponse`.

#### Scenario: Nested validation path is formatted

- **WHEN** a middleware helper receives a `ZodError` issue whose path includes object keys and array indexes
- **THEN** it formats the path using dotted object segments and bracketed array indexes so the failing field can be identified in the resulting message

#### Scenario: Invalid value is included in the message

- **WHEN** a middleware helper receives a `ZodError` and the original request payload
- **THEN** it reads the invalid value from the issue path and includes that value in the generated validation message

#### Scenario: Missing issue falls back to a generic message

- **WHEN** a middleware helper is asked to format a `ZodError` with no issues
- **THEN** it returns `"Invalid request body"`

### Requirement: Middleware duplicate-key helpers detect duplicate-field persistence errors

The `backend-api` project SHALL provide reusable middleware helpers that inspect unknown persistence errors and identify duplicate-key failures in a field-agnostic way so route middleware can map them to route-specific `ErrorResponse` objects.

#### Scenario: Duplicate key detected from direct error

- **WHEN** a middleware helper receives an error with Mongo duplicate-key code `11000`
- **THEN** it extracts duplicate-key metadata from the error and makes that metadata available to the caller

#### Scenario: Duplicate key detected from wrapped cause

- **WHEN** a middleware helper receives an error whose `cause` contains Mongo duplicate-key code `11000`
- **THEN** it extracts duplicate-key metadata from the nested cause and makes that metadata available to the caller

#### Scenario: Duplicate key absent

- **WHEN** a middleware helper receives an error that is not a duplicate-key failure
- **THEN** it returns no duplicate-key metadata

### Requirement: Route middleware composes shared helpers without changing endpoint behavior

Route middleware in `backend-api` SHALL use the shared middleware helpers for generic validation-message formatting and duplicate-key inspection while preserving the route-specific request and response contract.

#### Scenario: Language creation uses shared validation helper

- **WHEN** `createLanguage` handles a request-body validation failure
- **THEN** it uses the shared validation helper to derive the descriptive error message and still returns the same logical `400` response contract defined for `POST /languages`

#### Scenario: Language creation uses shared duplicate-key helper

- **WHEN** `createLanguage` handles a duplicate-name persistence failure
- **THEN** it uses the shared duplicate-key helper to detect the duplicate-key condition and still returns the same logical `400` response contract defined for `POST /languages`
