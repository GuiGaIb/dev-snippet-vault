import { objectIdStringSchema } from '@models/schemas/shared/objectIdString';
import z from 'zod';

export const languageCursorSchema = z.strictObject({
  /**
   * Sort options.
   */
  sort: z
    .strictObject({
      /**
       * Sort by updatedAt field.
       */
      updatedAt: z.enum(['asc', 'desc']).default('desc'),
    })
    .prefault(() => ({})),
  /**
   * Limit the number of languages to return.
   * Must be a positive integer less than or equal to 100.
   *
   * @default 10
   */
  limit: z.int().positive().max(100).default(10),
  /**
   * Pagination anchor. Omitted on the first page.
   */
  position: z
    .strictObject({
      updatedAt: z.coerce.date<Date>(),
      id: objectIdStringSchema,
      direction: z.enum(['after', 'before']),
    })
    .optional(),
});

/**
 * Codec for encoding and decoding language cursor objects.
 *
 * Direction is reversed because defaults and prefaults are only applied in the
 * "forward" direction.
 *
 * @see https://zod.dev/codecs?id=defaults-and-prefaults
 */
export const languageCursorCodec = z.codec(
  languageCursorSchema.prefault(() => ({})),
  z.base64(),
  {
    encode: (value) => JSON.parse(Buffer.from(value, 'base64').toString()),
    decode: (value) => Buffer.from(JSON.stringify(value)).toString('base64'),
  },
);

export type LanguageCursor = z.output<typeof languageCursorSchema>;
export type LanguageCursorInput = z.input<typeof languageCursorSchema>;
