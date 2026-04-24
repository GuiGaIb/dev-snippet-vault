# Nx in this monorepo

This workspace uses [Nx](https://nx.dev) to manage multiple TypeScript projects, shared tooling, and consistent lint and test targets. Use this page to understand **how projects relate to each other** and **how TypeScript is layered** so imports and boundaries stay predictable.

## Projects and tags

Each Nx project has a `project.json` (or is inferred by Nx plugins) and carries **tags** that describe where it runs. Tags drive ESLint’s module-boundary rules (see below).

| Tag               | Meaning                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `platform:shared` | Code that any other project may depend on (pure TS, no Node- or browser-only APIs unless clearly isolated). |
| `platform:node`   | Node.js–targeted libraries or tools (e.g. backend DAO, CLI helpers under `tools/`).                         |
| `platform:ngx`    | Reserved for future Angular apps or libraries.                                                              |

Assign tags that match the runtime. If you are unsure, prefer `platform:shared` only when the code truly has no Node or Angular coupling.

## Module boundaries

Boundaries are enforced by ESLint’s [`@nx/enforce-module-boundaries`](https://nx.dev/nx-api/eslint-plugin/documents/enforce-module-boundaries) rule in [`eslint.config.mjs`](../eslint.config.mjs). A project may only import from projects whose tags are allowed for its own tag.

| Source tag        | May depend on tags                 |
| ----------------- | ---------------------------------- |
| `platform:shared` | `platform:shared` only             |
| `platform:node`   | `platform:node`, `platform:shared` |
| `platform:ngx`    | `platform:ngx`, `platform:shared`  |

The same block enables `enforceBuildableLibDependency` (see the [Nx rule docs](https://nx.dev/nx-api/eslint-plugin/documents/enforce-module-boundaries) for behavior).

If a boundary violation appears in the IDE or in `nx run <project>:lint`, fix the dependency direction or move shared code into a `platform:shared` library rather than disabling the rule.

## TypeScript configuration

### Root base config

[`tsconfig.base.json`](../tsconfig.base.json) sets workspace-wide compiler defaults (strictness, `paths` aliases such as `@backend/dao/*`, `@tools/mongodb-test-setup`, and so on). Individual projects do not re-declare these options at the project root unless there is a strong reason.

### Platform-specific layers

Platform TS configs extend `tsconfig.base.json` and adjust module resolution and `lib` / `types` for that environment:

| File                                              | Use for                                                       |
| ------------------------------------------------- | ------------------------------------------------------------- |
| [`tsconfig.shared.json`](../tsconfig.shared.json) | `platform:shared` projects.                                   |
| [`tsconfig.node.json`](../tsconfig.node.json)     | `platform:node` projects (Node types, `nodenext` resolution). |

Each project’s root [`tsconfig.json`](../libs/backend/dao/tsconfig.json) should extend **one** of these platform files and use project references to `tsconfig.lib.json` / `tsconfig.spec.json` as generated for that project. Avoid overriding `compilerOptions` in the project root `tsconfig.json`; keep overrides in the lib or spec configs when necessary.

Angular (`platform:ngx`) projects should follow the same pattern with a `tsconfig.ngx.json` once Angular packages exist in the repo.

### Path aliases

Import paths are defined under `compilerOptions.paths` in `tsconfig.base.json`. Add a new alias there when you introduce a library entry point, then consume it with stable imports (`@backend/zodProp`, `@tools/mongodb-test-setup`, etc.).
