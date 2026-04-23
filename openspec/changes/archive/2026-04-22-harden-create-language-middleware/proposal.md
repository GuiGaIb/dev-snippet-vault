## Why

The `createLanguage` middleware currently returns HTTP `500` for every failure (including user-caused ones like duplicate names or invalid payloads), and its error messages are whatever the underlying error happens to expose. That is not production-grade: clients cannot distinguish between their own bad input and a real server fault, and the one existing test for the duplicate-name case fails. We need deterministic status codes, descriptive messages, and thorough test coverage before this endpoint is exposed.

## What Changes

- Classify failures in `createLanguage` and map them to the correct logical status via `next(ErrorResponse)`:
  - `400` for Zod validation failures on the request body (parsed with `createLanguageSchema`).
  - `400` for duplicate-name errors surfaced by the unique `name_1_unique` index (Mongo duplicate-key error, code `11000`).
  - `500` (unchanged) when the `languageService` local is missing.
  - `500` for any other unexpected error, with the original cause preserved in `details`.
- Produce descriptive, user-facing `message` strings:
  - Validation: `"name 'x' is invalid"` style, derived from the failing Zod issue(s).
  - Duplicate: `"Language with name 'x' already exists"`.
- Validate the request body up-front with Zod so downstream Mongoose never sees malformed input, and so validation errors are consistent with the shared `languageSchema`.
- Expand the test suite in `createLanguage.spec.ts` to cover: success, duplicate name, invalid `name` (empty / too long / wrong type), invalid `versions` (duplicate `versionId`, duplicate `sortIdx`, malformed entries), missing body, and the missing-service branch. Fix the existing duplicate-name test (its HTTP expectation is wrong today — `errorHandler` responds HTTP `200` with a body whose `status` is the logical code).

## Capabilities

### New Capabilities

- `backend-api-languages`: REST middleware for the `/languages` resource, starting with `POST /languages` (create). Owns request validation, service invocation, and error classification for language writes.

### Modified Capabilities

<!-- None: no prior specs exist. -->

## Impact

- Code: `libs/backend/api/src/v1/middleware/languages/createLanguage.ts`, `libs/backend/api/src/v1/middleware/languages/createLanguage.spec.ts`.
- Indirectly exercises: `libs/backend/dao/src/models/language.ts` (unique index), `libs/backend/dao/src/services/language.ts` (`createLanguage`), `libs/data-model/schemas/src/language.ts` (validation source of truth), `libs/backend/api/src/v1/middleware/errorHandler.ts` (response shape).
- APIs: `POST /languages` response contract becomes stable for 400/500 error paths.
- Dependencies: none added; reuses `zod`, `mongoose`, and existing `errorResponseSchema`.
