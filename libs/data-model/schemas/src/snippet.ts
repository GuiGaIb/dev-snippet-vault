import type {
  TSnippet,
  TSnippetDependency,
  TSnippetLanguageVersionRange,
} from '@models/types/snippet';
import z from 'zod';
import { getNormalizedLineSchema } from './shared/normalizedLine.js';
import { getNormalizedMultilineSchema } from './shared/normalizedMultiline.js';
import { objectIdLikeSchema } from './shared/objectIdLike.js';
import { timeStampsSchema } from './shared/timestamps.js';

export const snippetDependencySchema = z.object({
  name: getNormalizedLineSchema({
    minLength: 1,
    maxLength: 256,
  }),
  version: getNormalizedLineSchema({
    minLength: 1,
    maxLength: 256,
  }).optional(),
}) satisfies z.ZodType<TSnippetDependency>;

export const snippetLanguageVersionRangeSchema = z.object({
  from: objectIdLikeSchema,
  to: objectIdLikeSchema.optional(),
}) satisfies z.ZodType<TSnippetLanguageVersionRange>;

export const snippetSchema = z.object({
  ...timeStampsSchema.shape,
  id: objectIdLikeSchema,
  title: getNormalizedLineSchema({
    minLength: 1,
    maxLength: 128,
  }),
  description: getNormalizedMultilineSchema({
    maxLength: 1024,
  }).default(''),
  language: objectIdLikeSchema,
  languageVersionRange: snippetLanguageVersionRangeSchema.optional(),
  code: getNormalizedMultilineSchema({
    minLength: 1,
    maxLength: 65536,
  }),
  dependencies: z.array(snippetDependencySchema),
  tags: z
    .array(
      getNormalizedLineSchema({
        minLength: 1,
        maxLength: 64,
      }),
    )
    .transform((tags) =>
      // Lowercase and deduplicate
      Array.from(new Set([...tags.map((tag) => tag.toLowerCase())])),
    ),
}) satisfies z.ZodType<TSnippet>;

export type TSnippetInput = z.input<typeof snippetSchema>;
