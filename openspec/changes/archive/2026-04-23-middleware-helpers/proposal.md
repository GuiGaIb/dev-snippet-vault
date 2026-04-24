## Why

The `createLanguage` middleware currently embeds reusable validation and Mongo error-classification helpers directly in the route file. That makes the middleware harder to scan, encourages copy-paste in future middleware, and hides shared backend API behavior that should live in a common helper layer.

## What Changes

- Extract reusable middleware helper functions from `libs/backend/api/src/v1/middleware/languages/createLanguage.ts` into `libs/backend/api/src/v1/middleware/helpers/`.
- Replace the in-file helper implementations in `createLanguage.ts` with imports from the new helpers directory.
- Define the backend API contract for shared middleware helper behavior so future middleware can reuse the same validation-message and duplicate-key handling semantics.
- Keep the runtime behavior of `createLanguage` unchanged; this change is a refactor and reuse improvement, not a feature change.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `backend-api`: Expand the backend API spec to cover shared middleware helper behavior used by route middleware such as `createLanguage`.

## Impact

- Code: `libs/backend/api/src/v1/middleware/languages/createLanguage.ts`, new files under `libs/backend/api/src/v1/middleware/helpers/`, and related tests.
- APIs: No intentional API behavior change for `POST /languages`; the refactor preserves existing request and error semantics.
- Dependencies: none added.
