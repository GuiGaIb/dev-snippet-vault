## Context

The `backend-api` project already defines route-level middleware such as `createLanguage`, `initLanguageService`, and `errorHandler`. `createLanguage.ts` currently contains several helper functions for formatting Zod issue paths and values and for classifying duplicate-name Mongo errors. Those helpers are generic to request validation and duplicate-key handling and are likely to be reused by additional middleware in the same project.

This change is scoped to the `backend-api` Nx project. Although the middleware interacts with `models-schemas` and `backend-dao`, the design goal is to improve code organization and reuse inside `libs/backend/api/src/v1/middleware/` without changing observable endpoint behavior.

## Goals / Non-Goals

**Goals:**

- Move reusable helper functions out of `createLanguage.ts` into `libs/backend/api/src/v1/middleware/helpers/`.
- Keep `createLanguage` behavior unchanged while making the middleware easier to read and maintain.
- Establish a helper layout and naming scheme that other backend API middleware can reuse.
- Keep helper APIs small and narrowly focused on validation-message formatting and duplicate-key classification.

**Non-Goals:**

- No changes to the `POST /languages` request or response contract.
- No changes to `LanguageService`, `createLanguageSchema`, or DAO/model logic.
- No new cross-project shared library; reuse remains within `backend-api`.
- No broad middleware framework or abstraction beyond extracting the current reusable functions.

## Decisions

### Create a local middleware helpers directory

Place extracted helpers under `libs/backend/api/src/v1/middleware/helpers/`, keeping them inside the `backend-api` project and close to their consumers.

- **Why:** The helpers are currently only relevant to backend API middleware. A local directory keeps the dependency direction simple and respects Nx project boundaries.
- **Alternative considered:** Move helpers into a new shared library. Rejected because the helpers have only one known consumer today and do not justify a new project boundary yet.

### Split helpers by concern instead of one large utility file

Group functions by behavior, such as one helper for turning a `ZodError` into a user-facing message and another for detecting duplicate-name Mongo errors.

- **Why:** The current helper block contains two separate concerns: validation formatting and persistence error classification. Separating them makes each helper easier to discover, test, and reuse independently.
- **Alternative considered:** Put all extracted functions into a single `helpers.ts`. Rejected because it would recreate the same mixed-concern structure in a new location.

### Prefer generic helpers over language-specific ones

Extract duplicate-key handling and validation-formatting logic with generic names and signatures so future middleware can reuse them beyond the language routes.

- **Why:** The current reuse target is broader than `createLanguage`, and generic helper APIs reduce the chance of repeating the same extraction work when other middleware needs equivalent behavior.
- **Alternative considered:** Keep helpers specialized to language-name collisions. Rejected because it would limit reuse and keep route-specific assumptions embedded in shared helper code.

### Keep `createLanguage` as the composition point

`createLanguage.ts` should continue to own request validation, service invocation, and error mapping, while delegating only the reusable low-level logic to the helper modules.

- **Why:** The middleware still defines the route contract. Extracting too much would make the control flow harder to follow and blur the line between route behavior and generic helper behavior.
- **Alternative considered:** Move all error handling into a single helper function that returns full `ErrorResponse` objects. Rejected because the route-level status/message decisions are part of the middleware contract and should remain visible there.

### Preserve behavior with focused tests

Update existing `createLanguage` tests only as needed to ensure the refactor does not change externally visible behavior. Add dedicated helper tests only if the extracted functions become non-trivial or if nearby testing patterns make them valuable.

- **Why:** This is a refactor-first change. The primary safety signal is that the existing middleware behavior remains intact.

## Risks / Trade-offs

- **Risk:** Extracted helper names or file placement may be too specific to `createLanguage` and limit reuse. → **Mitigation:** Use concern-based names that describe the behavior rather than the current route.
- **Risk:** Over-extraction could make `createLanguage.ts` harder to follow by scattering simple logic across too many files. → **Mitigation:** Extract only the reusable helpers from the current helper block and keep route orchestration inline.
- **Trade-off:** Keeping helpers inside `backend-api` avoids premature abstraction, but if the same behavior is later needed outside this project, another move may be required.

## Migration Plan

No deployment or data migration is required. Implement by adding the helper modules, updating `createLanguage.ts` imports, and verifying that the existing middleware tests still pass.

## Open Questions

None at this time.
