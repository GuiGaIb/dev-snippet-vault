## Context

The `createLanguage` middleware is part of the `backend-api` library (`libs/backend/api`, tag `platform:node`) and sits behind `initLanguageService`, which attaches a `LanguageService` to `res.locals`. Errors flow through the shared `errorHandler`, which accepts anything matching `errorResponseSchema` (`{ message, status, details? }`) and emits it as HTTP `200` with that object as the JSON body — HTTP status is always `200` on the wire; the _logical_ status lives in `body.status`. Successful responses keep their natural HTTP status (`201` for create).

Today `createLanguage`:

- Does not validate `req.body` with Zod; it forwards whatever arrives to `languageService.createLanguage`, which calls `Languages.create(data)`.
- Wraps any thrown error as `{ status: 500, message: error.message }`, so duplicate-name and validation failures are indistinguishable from real server faults.
- Has one failing test asserting the duplicate-name path returns a `400` logical status with a specific message.

The data model enforces `name` uniqueness via the `name_1_unique` index (`@index({ name: 1 }, { unique: true, name: 'name_1_unique' })`). Mongo surfaces this as a `MongoServerError` with `code === 11000`. Mongoose validation errors surface as `mongoose.Error.ValidationError`, but we want validation to happen at the API boundary with the shared Zod `languageSchema`, not inside Mongoose, so the contract matches the rest of the system.

## Goals / Non-Goals

**Goals:**

- Deterministic mapping of `createLanguage` failure modes to logical status codes and human-readable messages.
- Zod-first request validation, reusing `languageSchema` to avoid drift between write and read contracts.
- Full test coverage of the success path, each 400 branch, the 500 service-missing branch, and the generic 500 branch.
- Keep the middleware thin: classification logic lives in `createLanguage.ts`; no new modules unless reused elsewhere.

**Non-Goals:**

- No changes to `errorHandler`, `errorResponseSchema`, or the HTTP-200-wraps-logical-status convention.
- No changes to `LanguageService.createLanguage` or the `LanguageModel` definition.
- No authentication, rate limiting, or idempotency work — those belong to later changes.
- No other language endpoints (list, get, update, delete) are in scope here.

## Decisions

### Validate `req.body` with Zod at the middleware boundary

Use `createLanguageSchema` from `@models/schemas/language` to validate `req.body`. This schema enforces that `name` is required and `versions` is optional (defaulting to `[]`), while omitting `id` from version entries since they are generated automatically. Parse `req.body` with `safeParse` before calling the service.

- **Why**: `createLanguageSchema` is the single source of truth for language creation, including the version-duplicate superRefine and omitting the `id` field. Reusing it keeps server validation aligned with client-side expectations and future write contracts.
- **Alternative considered**: Rely on Mongoose schema validation. Rejected — Mongoose error shapes are inconsistent with the rest of the API boundary and would couple the middleware to DAO internals.
- **Alternative considered**: Write a fresh Zod schema. Rejected — duplicates rules and will drift.

### Map Zod issues to a descriptive message

On `safeParse` failure, take the first issue and build `"<path> '<received>' is invalid: <issue.message>"` (e.g. `"name '' is invalid: String must contain at least 1 character"`). The full `ZodError.issues` array is attached to `details.issues` so clients can render field-level feedback.

- **Why**: Matches the user-supplied example format `"name 'x' is invalid"` while retaining machine-readable detail for clients.
- **Alternative considered**: Return only the generic `"Invalid request body"`. Rejected — user explicitly asked for descriptive messages.

### Detect duplicate-name via Mongo error code `11000`

Catch errors from `languageService.createLanguage` and inspect `error.code === 11000` together with `error.keyPattern?.name` (or `error.message` fallback) to classify as duplicate name. Build the message using the `name` from the parsed body: `"Language with name '<name>' already exists"`. Logical status `400`.

- **Why**: The unique index is the authoritative source; `11000` is the stable, driver-level signal. Checking `keyPattern.name` prevents misclassifying a future unique index as a name collision.
- **Alternative considered**: Pre-check with `findOne({ name })` before insert. Rejected — race-prone and requires an extra round trip; the unique index must remain the final arbiter anyway.

### Classify unknown errors as `500` with cause preserved

Any error not matching the validation or duplicate-key patterns is forwarded as `{ status: 500, message: 'Internal server error', details: { cause: error.message } }`.

- **Why**: Avoids leaking internal error shapes while still giving operators a diagnostic hook via `details`.

### Respond `201 Created` on success

Keep the existing `res.status(201).json(languageDoc.forClient())` behavior; `201` is the correct HTTP status for resource creation and is not going through `errorHandler`.

## Risks / Trade-offs

- **Risk**: Zod `safeParse` runs on every request, including valid ones. **Mitigation**: negligible cost for a small object; the schema is already cached at module load.
- **Risk**: Relying on Mongo error code `11000` couples the middleware to the driver. **Mitigation**: isolated to a single `isDuplicateKeyError` helper inside `createLanguage.ts`; if the driver shape changes, the fix is local.
- **Risk**: Duplicate-name detection could misfire if a future unique index is added to the `Language` model. **Mitigation**: check `keyPattern.name === 1` (or `keyValue.name` presence) before classifying as a name duplicate; otherwise fall through to the generic 500 path.
- **Trade-off**: We don't pre-check existence, so two simultaneous creates with the same name will have one fail with `400` after the write. Acceptable — idempotency is a separate concern.

## Migration Plan

Not applicable — no persisted data or API consumers depend on the current 500-for-everything behavior (endpoint is not yet wired into a production router at the time of this change).
