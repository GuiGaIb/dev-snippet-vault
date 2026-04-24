# Backend API Spec

## Languages Resource

### Requirement: Create language endpoint

The `POST /languages` middleware (`createLanguage`) SHALL create a new language document from a JSON request body and respond with the created resource serialized as a `TLanguage` via `LanguageDoc.forClient()`.

#### Scenario: Successful creation

- **WHEN** the client sends `POST /languages` with a body `{ name: <valid unique name> }` and the `languageService` local is present
- **THEN** the middleware persists a new language, responds with HTTP `201`, and the response body parses successfully against `languageSchema` with `body.name === <the submitted name>`

#### Scenario: Successful creation with versions

- **WHEN** the client sends `POST /languages` with a body `{ name: <valid name>, versions: [<valid, unique versions>] }`
- **THEN** the middleware persists the document, responds with HTTP `201`, and the response body's `versions` preserves the submitted `versionId` and `sortIdx` values while including generated ids for each persisted version entry

#### Scenario: Versions omitted

- **WHEN** the client sends `POST /languages` with a body `{ name: <valid unique name> }` and omits `versions`
- **THEN** the middleware treats `versions` as an empty array before invoking the service and responds with a valid `TLanguage`

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

### Requirement: Route middleware composes shared helpers without changing endpoint behavior

Route middleware in `backend-api` SHALL use the shared middleware helpers for generic validation-message formatting and duplicate-key inspection while preserving the route-specific request and response contract.

#### Scenario: Language creation uses shared validation helper

- **WHEN** `createLanguage` handles a request-body validation failure
- **THEN** it uses the shared validation helper to derive the descriptive error message and still returns the same logical `400` response contract defined for `POST /languages`

#### Scenario: Language creation uses shared duplicate-key helper

- **WHEN** `createLanguage` handles a duplicate-name persistence failure
- **THEN** it uses the shared duplicate-key helper to detect the duplicate-key condition and still returns the same logical `400` response contract defined for `POST /languages`

### Requirement: List languages endpoint

The `POST /languages/list` middleware (`listLanguages`) SHALL query the language collection and respond with a paginated list of languages using cursor-based pagination.

#### Scenario: Successful listing

- **WHEN** the client sends `POST /languages/list` with an empty body `{}`
- **THEN** the middleware responds with HTTP `200` and a `PagedResponse<TLanguage>` containing the first page of results using default sorting and limits

#### Scenario: Listing with limit and sort

- **WHEN** the client sends `POST /languages/list` with `limit` and `sort` parameters
- **THEN** the middleware applies the requested limit and sort order to the query and responds with HTTP `200` and a `PagedResponse<TLanguage>`

#### Scenario: Paging forward with cursor

- **WHEN** the client sends `POST /languages/list` with a valid `cursor` string obtained from a previous response
- **THEN** the middleware resumes the query from the cursor position and responds with HTTP `200` and the next page of results

#### Scenario: Cursor overrides limit and sort

- **WHEN** the client sends `POST /languages/list` with a `cursor`, `limit`, and `sort`
- **THEN** the middleware uses the cursor to fetch the next page, ignoring the `limit` and `sort` from the request body

### Requirement: Invalid list request yields logical 400

The middleware SHALL validate `req.body` against `listLanguagesRequestBodySchema` before invoking the service. On validation failure it SHALL forward an `ErrorResponse` with `status: 400`, a descriptive `message`, and `details.issues`.

#### Scenario: Invalid cursor format

- **WHEN** the client sends `POST /languages/list` with a `cursor` that is not valid base64
- **THEN** the response body has `status === 400` and `message` indicates the cursor is invalid

#### Scenario: Invalid sort shape

- **WHEN** the client sends `POST /languages/list` with an invalid `sort` payload
- **THEN** the response body has `status === 400` and `message` indicates the sort is invalid

#### Scenario: Invalid limit

- **WHEN** the client sends `POST /languages/list` with an invalid `limit` (e.g. 0)
- **THEN** the response body has `status === 400` and `message` indicates the limit is invalid

### Requirement: List endpoint handles service errors

The middleware SHALL handle missing service or unexpected service errors in the same manner as the create endpoint.

#### Scenario: Missing language service

- **WHEN** the middleware runs and `res.locals.languageService` is `undefined`
- **THEN** the response body has `status === 500` and `details.cause` references the missing language service

#### Scenario: Unexpected service error

- **WHEN** `languageService.listLanguages` throws an error
- **THEN** the response body has `status === 500`, `message === "Internal server error"`, and `details.cause` equals the original error message

## Middleware Infrastructure

### Requirement: Language service initializer provides a `LanguageService`

The `initLanguageService` middleware SHALL ensure a `LanguageService` instance is available at `res.locals.languageService` before downstream language middleware runs.

#### Scenario: Create service from locals options

- **WHEN** `res.locals.languageService` is not already a `LanguageService`
- **THEN** the middleware creates one using `res.locals.languageServiceOptions`, assigns it to `res.locals.languageService`, and continues the middleware chain

#### Scenario: Reuse existing service

- **WHEN** `res.locals.languageService` is already a `LanguageService`
- **THEN** the middleware MUST NOT replace it and MUST continue the middleware chain

#### Scenario: Initialization failure

- **WHEN** creating the `LanguageService` throws an error
- **THEN** the middleware forwards an `ErrorResponse` with `status === 500`, `message === "Failed to initialize language service"`, and `details.error` containing the thrown error as a string

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

### Requirement: Error handler serializes standardized API errors

The `errorHandler` middleware SHALL convert any error matching `errorResponseSchema` into a JSON response with HTTP status `200`, leaving the logical status in `body.status`.

#### Scenario: Standardized error response

- **WHEN** a prior middleware calls `next()` with an error object matching `errorResponseSchema`
- **THEN** the handler responds with HTTP `200` and the parsed error object as the response body

#### Scenario: Headers already sent

- **WHEN** the error handler is invoked after headers have already been sent
- **THEN** it delegates to the next error handler instead of attempting to write a response

#### Scenario: Non-standard error

- **WHEN** the error handler receives an error that does not match `errorResponseSchema`
- **THEN** it delegates to the next error handler without transforming the error
