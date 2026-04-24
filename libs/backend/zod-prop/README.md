# backend-zod-prop

Internal Nx library that helps define Typegoose properties backed by a Zod schema.

Use `zodProp` when a model field needs:

- Zod-based validation
- Zod transforms on assignment
- Zod-driven defaults
- `optional()` / `nullable()` semantics derived from the schema

This keeps the field's parsing and validation rules in one place instead of splitting them across Zod, Typegoose, and custom Mongoose hooks.

## Import

Use the workspace alias:

```ts
import { zodProp } from '@backend/zodProp';
import { PropType } from '@typegoose/typegoose';
import z from 'zod';
```

## Example

```ts
import { PropType, modelOptions } from '@typegoose/typegoose';
import { zodProp } from '@backend/zodProp';
import z from 'zod';

@modelOptions({ schemaOptions: { collection: 'users' } })
class User {
  @zodProp(z.email().toLowerCase(), { type: String })
  email!: string;

  @zodProp(z.string().min(1).max(200), { type: String })
  displayName!: string;

  @zodProp(z.boolean().default(false), { type: Boolean })
  active!: boolean;

  @zodProp(z.string().optional(), { type: String })
  bio?: string;

  @zodProp(z.array(z.string().uuid()), { type: [String] }, PropType.ARRAY)
  tagIds!: string[];
}
```

Match the Zod output type to the Mongoose `type` you pass: `String`, `Number`, `Boolean`, `Date`, or arrays of those. The overloads enforce that relationship at compile time.

## Behavior

`zodProp` combines three behaviors around the same schema:

1. **Setter**

   On assignment, the incoming value is passed through `schema.safeParse()`.
   If parsing succeeds, the parsed value is stored, including any Zod transforms.
   If parsing fails, the raw value is kept so Mongoose validation can still report the failure later.

2. **Validator**

   During `document.validate()`, the stored value is checked with `safeParse`.
   Validation errors are formatted with `z.prettifyError()` and prefixed with the failing path name.

3. **Computed prop options**

   `required` and `default` are derived from the schema's outermost wrapper:
   - `optional()` => `required: false`
   - `default()` => `required: false` plus a Mongoose default
   - `nullable()` => `required: false` plus a default of `null`

## Important notes

- Mongoose coercion still applies before the Zod-backed setter. For example, a `Number` path may coerce `'123'` to `123` before Zod sees it.
- Do not pass custom `set` or `validate` options to `zodProp`. They are intentionally owned by the utility and excluded from `ZodPropOptions`.
- `computePropOptions()` only inspects the outermost Zod wrapper. Nested combinations like `nullable().optional()` behave according to whichever wrapper is outermost.

## Arrays

For array fields:

- use an array Zod schema such as `z.array(z.string())`
- pass `PropType.ARRAY` as the third argument
- use the matching Mongoose `type`, usually `[String]`, `[Number]`, `[Boolean]`, or `[Date]`

```ts
@zodProp(z.array(z.string().uuid()), { type: [String] }, PropType.ARRAY)
tagIds!: string[];
```

Array validation behavior can vary depending on how Mongoose applies validators to the path versus individual elements, so if you hit something unexpected, check `src/zodProp.spec.ts` before changing the utility.

## Design Choice: Explicit Types & Reflection

You might notice that `zodProp` requires you to explicitly pass the Mongoose `type` (e.g. `{ type: String }`) and `PropType.ARRAY` for arrays, rather than relying on Typegoose's ability to infer types via TypeScript's `emitDecoratorMetadata`.

This is a deliberate design choice:

- **Bundler compatibility:** Modern fast compilers and bundlers (like `esbuild`, `swc`, or Babel) often do not support emitting decorator metadata.
- **Decorator standards:** Typegoose heavily relies on legacy Stage 2 decorators (`experimentalDecorators: true`). Relying on reflection metadata can cause friction as the ecosystem moves toward TS 5.0+ Stage 3 decorators.

By enforcing explicit `type` definitions through the `zodProp` TypeScript overloads, we ensure the Mongoose schema is always built correctly regardless of the build toolchain, completely bypassing the need for `emitDecoratorMetadata`.

## Public API

| Export               | Role                                         |
| -------------------- | -------------------------------------------- |
| `zodProp`            | Main property decorator factory              |
| `computePropOptions` | Derives `required` / `default` from a schema |
| `computeValidator`   | Builds the Mongoose validator                |
| `computeSetter`      | Builds the Mongoose setter                   |
| `ZodPropPrimitive`   | Supported primitive output types             |
| `ZodPropOptions`     | Allowed Typegoose options for `zodProp`      |

In normal usage inside the monorepo, prefer `zodProp`. The helper exports are mainly useful for tests or advanced composition.

## Development

Run the library tests with:

```bash
nx test backend-zod-prop
```

The spec file at `src/zodProp.spec.ts` is the best source of truth for edge cases and current behavior.
