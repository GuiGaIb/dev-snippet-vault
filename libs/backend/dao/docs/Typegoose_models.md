# Typegoose Models

This document describes the patterns, conventions, and constraints used to define Typegoose models in this project. These models bridge our TypeScript types, Zod schemas, and MongoDB collections.

## Schema to Typegoose Model Mapping

Our data layer is built on three pillars:

1. **TypeScript Types/Interfaces**: Declared in the `models-types` library.
2. **Zod Schemas**: Defined in the `models-schemas` library for runtime validation.
3. **Typegoose Models**: Defined in this library (`backend/dao`), utilizing the custom `@zodProp` decorator to bind Zod schemas directly to Mongoose schema paths.

## Naming Conventions

- **Model Classes**: Prefixed with `C` to avoid naming conflicts with type aliases (e.g., `CLanguage` for the `TLanguage` type).
- **Exported Types**: We export specific types for the Model and Document instances, suffixed with `Model` and `Doc` respectively (e.g., `SnippetModel`, `SnippetDoc`).
- **Factory Functions**: Models are instantiated via exported factory functions named `get<ModelName>Model` (e.g., `getSnippetModel`).

## Type Safety and Implementation

To ensure models accurately reflect our types and catch errors at compile-time, Typegoose classes use the `implements` keyword.

```ts
export class CLanguageVersion implements TLanguageVersion {
  // ...
}
```

_Note: The TypeScript compiler checks that the class implements the required properties, but optional properties might be missed. It is the developer's responsibility to ensure all schema properties are accounted for._

### Handling Document References (`Ref`)

When a model contains references to other documents, implementing the base type (e.g., `TSnippet`) will cause TypeScript errors. This is because the base type expects a `string` (the ID), while Typegoose uses `Ref<T>`.

To solve this, Zod schemas export an "Input" type (e.g., `TSnippetInput`) alongside the base type. The Input type uses `objectIdLikeSchema` (`z.ZodType<string, string | WithIdGetter>`), which is compatible with Typegoose's `Ref`.

**Correct Pattern:**

```ts
import { CLanguage } from './language.js';
import type { TSnippetInput } from '@models/schemas/snippet';

export class CSnippet extends TimeStamps implements TSnippetInput {
  @prop({ ref: () => CLanguage, required: true })
  language!: Ref<CLanguage>; // Works perfectly with TSnippetInput
}
```

## Common Model Patterns

### 1. Base Classes and Timestamps

Root document models should extend Typegoose's `TimeStamps` class and explicitly declare the `id`, `createdAt`, and `updatedAt` properties to ensure TypeScript knows about them without emitting them as class fields.

```ts
export class CLanguage extends TimeStamps implements TLanguage {
  declare id: string;
  declare createdAt: Date;
  declare updatedAt: Date;
  // ...
}
```

### 2. Properties and `@zodProp`

Instead of Typegoose's standard `@prop`, we use the custom `@zodProp` decorator to enforce Zod validation at the Mongoose level. Standard `@prop` is still used for references and subdocuments where `@zodProp` doesn't apply directly.

```ts
@zodProp(snippetSchema.shape.title, { type: String })
title!: TSnippet['title'];
```

### 3. Subdocuments

Subdocuments require specific typing to work correctly with Mongoose's array and subdocument methods:

- **Arrays of Subdocuments**: Use `Types.Array<ArraySubDocumentType<CSubDoc>>`.
- **Single Subdocuments**: Use `SubDocumentType<CSubDoc>`.
- **`_id` Configuration**: Explicitly define whether the subdocument should have an `_id` using `@prop({ _id: false })` or `true`.

```ts
// Array of subdocuments without _id
@prop({ type: () => [CSnippetDependency], _id: false })
dependencies!: Types.Array<ArraySubDocumentType<CSnippetDependency>>;

// Single subdocument without _id
@prop({ type: () => CSnippetLanguageVersionRange, _id: false })
languageVersionRange?: SubDocumentType<CSnippetLanguageVersionRange>;
```

### 4. Decorators for Configuration

Models heavily utilize Typegoose class decorators for MongoDB-level configuration:

- **`@modelOptions`**: Used to explicitly set the `collection` name.
- **`@index`**: Used for database indexes (e.g., compound text indexes with custom weights, unique constraints).
- **`@queryMethod`**: Used to attach custom query helpers for strongly-typed queries.
- **`@pre` / `@post`**: Used for Mongoose middleware (e.g., complex cross-field validation, populating references for validation, or sorting subdocuments before save).

**Example of Middleware Validation:**

```ts
@pre<SnippetDoc>('validate', async function () {
  // Complex validation logic, such as populating refs and checking
  // if a referenced version actually exists in the parent language document.
})
export class CSnippet {
  /* ... */
}
```

### 5. Exporting the Model

Every model file should export the Class, the Factory function, the Model type, and the Document type. Query helpers should be passed to the `ReturnModelType` and `DocumentType` generics.

```ts
export const getSnippetModel = (options?: IModelOptions): SnippetModel => getModelForClass(CSnippet, options);

export type SnippetModel = ReturnModelType<typeof CSnippet, SnippetQueryHelpers>;
export type SnippetDoc = DocumentType<CSnippet, SnippetQueryHelpers>;
```
