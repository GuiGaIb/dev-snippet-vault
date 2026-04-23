## 1. Extract shared helpers

- [x] 1.1 Create `libs/backend/api/src/v1/middleware/helpers/` and add a helper module for formatting user-facing validation messages from a `ZodError` and request payload.
- [x] 1.2 Add a helper module for duplicate-key inspection that extracts duplicate-key metadata from direct Mongo errors and wrapped `cause` errors.
- [x] 1.3 Export the shared middleware helpers from the helpers directory using generic names and signatures that are not tied to the language routes.

## 2. Update route middleware

- [x] 2.1 Replace the inline helper block in `libs/backend/api/src/v1/middleware/languages/createLanguage.ts` with imports from `libs/backend/api/src/v1/middleware/helpers/`.
- [x] 2.2 Update `createLanguage.ts` to compose the shared helpers while preserving the existing `POST /languages` success, validation-error, duplicate-name, and generic-500 behavior.

## 3. Verify behavior

- [x] 3.1 Update or add tests as needed to prove the `createLanguage` refactor preserves the current route contract.
- [x] 3.2 Add focused helper tests if the extracted helper modules contain logic that is not already adequately covered by the existing middleware tests.
- [x] 3.3 Run `nx test backend-api v1/middleware/languages/createLanguage` and fix any regressions.
- [x] 3.4 Run `nx lint backend-api` and fix any violations introduced by the extraction.
- [x] 3.5 Run `pnpm exec tsc -p libs/backend/api/tsconfig.lib.json --noEmit` to verify the refactor remains type-safe.
