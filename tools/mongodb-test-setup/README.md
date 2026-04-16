# mongodb-test-setup

Internal Nx library for Node test suites that need a real MongoDB instance backed by `mongodb-memory-server` and connected through Mongoose's default connection.

This library exists to remove repeated test bootstrapping from backend specs. Instead of each spec file creating and tearing down its own in-memory MongoDB instance, a test can call one helper and get:

- a fresh in-memory MongoDB server
- a Mongoose default connection
- automatic teardown after the suite finishes

This is a workspace-internal utility. Treat it like shared test infrastructure for the monorepo, not like a publishable package.

## Import

Use the workspace alias defined in `tsconfig.base.json`:

```ts
import { setupTestServer } from '@tools/mongodb-test-setup';
```

## Primary Use Case

Use this library in model- or DAO-level tests that need real database behavior, for example:

- schema validation
- unique indexes
- Mongoose middleware
- query helpers
- static methods

It is especially useful when mocking MongoDB would hide behavior that the test is specifically trying to verify.

## Example

This is the intended usage pattern inside a spec file:

```ts
import { setupTestServer } from '@tools/mongodb-test-setup';
import { getLanguageModel } from './language.js';

describe('language model', () => {
  setupTestServer();

  let Languages: ReturnType<typeof getLanguageModel>;

  beforeAll(async () => {
    Languages = getLanguageModel({
      schemaOptions: {
        autoCreate: true,
        autoIndex: true,
      },
    });

    await Languages.init();
  });

  beforeEach(async () => {
    await Languages.deleteMany({});
  });

  it('enforces name uniqueness', async () => {
    await Languages.create({ name: 'TypeScript' });

    await expect(Languages.create({ name: 'TypeScript' })).rejects.toThrow('E11000 duplicate key error');
  });
});
```

For a real usage example in this workspace, see `libs/backend/dao/src/models/language.spec.ts`.

## Public API

### `setupTestServer(options?)`

Registers a `beforeAll` hook for the current test suite.

Behavior:

1. Starts a new `MongoMemoryServer` instance.
2. Connects Mongoose's default connection to that server.
3. Registers async teardown that disconnects Mongoose and stops the server after the suite completes.

Options:

- Accepts Mongoose connection options.
- `dbName` is required by the helper's type and defaults to `'test'`.

Example:

```ts
setupTestServer({
  dbName: 'language-model-spec',
});
```

## How It Works

Internally, `setupTestServer()` creates an in-memory MongoDB instance with:

```ts
storageEngine: 'wiredTiger';
```

That choice is intentional. This workspace uses MongoDB 7.x compatibility, so the default in-memory storage engine is not the right fit for these tests.

After the server starts, the helper dynamically imports `mongoose` and calls `mongoose.connect(server.getUri(), options)`. The cleanup step then:

- calls `mongoose.disconnect()`
- stops the memory server with `doCleanup: true`

This means each spec file that calls `setupTestServer()` gets its own database lifecycle without having to manually manage process startup or teardown.

## Test Authoring Notes

- Call `setupTestServer()` at suite scope, usually immediately inside `describe(...)`.
- Keep suite data isolated with `beforeEach(async () => Model.deleteMany({}))` or similar cleanup.
- If your test depends on indexes, explicitly initialize the model with `await Model.init()`.
- Prefer a dedicated `dbName` when that makes debugging easier, though the default `test` database is fine for most suites.

## Design Notes For Maintainers

The library currently exposes only `setupTestServer` from `src/index.ts`. The lower-level helpers in `src/lib/` exist to keep the implementation easy to test and evolve, but they are not part of the public workspace API yet.

If this utility grows, keep its scope narrow:

- it should stay Node-only
- it should stay focused on test infrastructure
- it should prefer real MongoDB behavior over mocking
- it should avoid becoming a generic application bootstrap layer

## Development

Run this library's tests with:

```bash
nx test mongodb-test-setup
```
