## 1. Request validation

- [x] 1.1 Import and use `createLanguageSchema` from `@models/schemas/language` in `createLanguage.ts` to validate the request body.
- [x] 1.2 Parse `req.body` with `safeParse`; on failure, call `next({ status: 400, message: <descriptive>, details: { issues } })`, where `<descriptive>` uses the first issue's path, received value, and message (e.g. `"name '' is invalid: ..."`).

## 2. Error classification

- [x] 2.1 Add an `isDuplicateNameError(error)` helper in `createLanguage.ts` that returns `true` when `error.code === 11000` and `error.keyPattern?.name === 1` (or `error.keyValue?.name` is set).
- [x] 2.2 In the `catch` around `languageService.createLanguage`, branch: duplicate-name → `next({ status: 400, message: "Language with name '<name>' already exists" })`; otherwise → `next({ status: 500, message: 'Internal server error', details: { cause: error.message ?? String(error) } })`.
- [x] 2.3 Keep the existing missing-`languageService` guard but harmonize its shape with the new classification (`status: 500`, `details.cause: 'Language service not initialized'`).

## 3. Tests

- [x] 3.1 Fix the existing duplicate-name test: first request expects HTTP `201` (not `200`) with a `languageSchema`-valid body; second request expects HTTP `200` with `errorResponseSchema`-valid body, `body.status === 400`, and `body.message === "Language with name '<name>' already exists"`.
- [x] 3.2 Add a test: missing `name` (body `{}`) → logical `400`, message references `name`.
- [x] 3.3 Add a test: empty `name` (`{ name: '' }`) → logical `400`, message references `name '' `.
- [x] 3.4 Add a test: `name` longer than 64 characters → logical `400`.
- [x] 3.5 Add a test: `name` wrong type (`{ name: 123 }`) → logical `400`.
- [x] 3.6 Add a test: `versions` with duplicate `versionId` → logical `400`, `details.issues` references the duplicate.
- [x] 3.7 Add a test: `versions` with duplicate `sortIdx` → logical `400`, `details.issues` references the duplicate.
- [x] 3.8 Add a test: malformed version entry (missing `versionId`) → logical `400`.
- [x] 3.9 Add a test: middleware mounted without `initLanguageService` → logical `500`, `details.cause` references the missing service.
- [x] 3.10 Add a test: unknown service failure (mock `languageService.createLanguage` to throw a non-duplicate error) → logical `500`, `message === 'Internal server error'`, `details.cause` equals the thrown message.
- [x] 3.11 Add a success-with-versions test asserting the returned `versions` match the submitted input.

## 4. Verification

- [x] 4.1 Run `nx test backend-api v1/middleware/languages/createLanguage`; all scenarios above pass.
- [x] 4.2 Run `nx lint backend-api` and fix any violations introduced.
- [x] 4.3 Run `nx typecheck backend-api` (or `nx build backend-api`) to confirm no type regressions.
