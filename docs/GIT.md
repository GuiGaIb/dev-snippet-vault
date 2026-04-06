# Git Usage Guidelines

## Branching

Name branches `<type>/<short-description>`, using the same **type** vocabulary as commits (`chore`, `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`). Prefer kebab-case in the description (e.g. `feat/snippet-search`, `fix/root`).

## Commit hooks

Husky runs:

- **`pre-commit`** — [lint-staged](https://github.com/okonet/lint-staged) runs Prettier (`--write`) on staged `*.{js,ts,jsx,tsx,json,md,html,css,scss}`; then `nx affected -t lint --uncommitted` runs each project’s `lint` target for the set **affected by** uncommitted files.
- **`commit-msg`** — [Commitlint](https://github.com/conventional-changelog/commitlint) checks the message against [`commitlint.config.ts`](../commitlint.config.ts).

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`.

- **type** — Must be one of the allowed values in `commitlint.config.ts` (includes `style` for formatting-only changes).
- **scope** — Required. Kebab-case; `/` is allowed for nested scopes. Use `root` when the change is not tied to a specific Nx project.
- **First line** — The whole header (`type`, `scope`, and description) is limited to **50 characters** (`header-max-length`).

For rule details (scope casing, enums, length), see [`commitlint.config.ts`](../commitlint.config.ts).
