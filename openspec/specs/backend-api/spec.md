# Backend API Spec

## Languages Resource

### Requirement: Create language endpoint

The `POST /languages` middleware (`createLanguage`) SHALL create a new language document from a JSON request body and respond with the created resource serialized as a `TLanguage` via `LanguageDoc.forClient()`.

#### Scenario: Successful creation

- **WHEN** the client sends `POST /languages` with a body `{ name: <valid unique name> }` and the `languageService` local is present
- **THEN** the middleware persists a new language, responds with HTTP `201`, and the response body parses successfully against `languageSchema` with `body.name === <the submitted name>`

#### Scenario: Successful creation with versions

- **WHEN** the client sends `POST /languages` with a body `{ name: <valid name>, versions: [<valid, unique versions>] }`
- **THEN** the middleware persists the document, responds with HTTP `201`, and the response body's `versions` matches the submitted versions (order preserved as returned by the model)

### Requirement: Invalid request body yields logical 400

The middleware SHALL validate `req.body` against `createLanguageSchema` (fields `name` required, `versions` optional with default `[]`, omitting `id`) before invoking the service. On validation failure it SHALL forward an `ErrorResponse` with `status: 400`, a descriptive `message` identifying the offending field and value, and `details.issues` containing the full list of Zod issues.

#### Scenario: Missing name

- **WHEN** the client sends `POST /languages` with body `{}`
- **THEN** the response (via `errorHandler`) is HTTP `200` with a body matching `errorResponseSchema`, `body.status === 400`, and `body.message` describes that `name` is invalid

#### Scenario: Empty name string

- **WHEN** the client sends `POST /languages` with body `{ name: "" }`
- **THEN** the response body has `status === 400` and `message` references the invalid `name` value `''`

#### Scenario: Name exceeds max length

- **WHEN** the client sends `POST /languages` with a `name` longer than 64 characters
- **THEN** the response body has `status === 400` and `message` indicates the `name` is invalid

#### Scenario: Name wrong type

- **WHEN** the client sends `POST /languages` with body `{ name: 123 }`
- **THEN** the response body has `status === 400` and `message` indicates the `name` is invalid

#### Scenario: Duplicate versionId in versions

- **WHEN** the client sends `POST /languages` with `versions` containing two entries with the same `versionId`
- **THEN** the response body has `status === 400` and `message` / `details.issues` describe the duplicate `versionId`

#### Scenario: Duplicate sortIdx in versions

- **WHEN** the client sends `POST /languages` with `versions` containing two entries with the same `sortIdx`
- **THEN** the response body has `status === 400` and `message` / `details.issues` describe the duplicate `sortIdx`

#### Scenario: Malformed version entry

- **WHEN** the client sends `POST /languages` with a `versions` entry missing required fields (e.g. no `versionId`)
- **THEN** the response body has `status === 400` and `message` identifies the invalid version field

### Requirement: Duplicate language name yields logical 400

When the underlying insert fails because the unique `name` index is violated (MongoDB error code `11000` on the `name` key), the middleware SHALL forward an `ErrorResponse` with `status: 400` and `message` equal to `"Language with name '<name>' already exists"` (using the submitted `name`).

#### Scenario: Second create with same name

- **WHEN** the client sends `POST /languages` with `{ name: <X> }` after a prior successful `POST /languages` with `{ name: <X> }`
- **THEN** the second response is HTTP `200` with a body matching `errorResponseSchema`, `body.status === 400`, and `body.message === "Language with name '<X>' already exists"`

### Requirement: Missing language service yields logical 500

If `res.locals.languageService` is absent when the middleware runs, it SHALL forward an `ErrorResponse` with `status: 500`, a generic `message`, and `details.cause` indicating the service was not initialized.

#### Scenario: Middleware mounted without initLanguageService

- **WHEN** the middleware runs and `res.locals.languageService` is `undefined`
- **THEN** the response body has `status === 500` and `details.cause` references the missing language service

### Requirement: Unexpected service errors yield logical 500

Any error thrown by `languageService.createLanguage` that is not a recognized duplicate-key error SHALL be forwarded as an `ErrorResponse` with `status: 500`, a generic `message` (`"Internal server error"`), and `details.cause` set to the original error's message.

#### Scenario: Unknown failure from service

- **WHEN** `languageService.createLanguage` throws an error that is neither a Zod parse error nor a Mongo duplicate-key error
- **THEN** the response body has `status === 500`, `message === "Internal server error"`, and `details.cause` equals the original error message
