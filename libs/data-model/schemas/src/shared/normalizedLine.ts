import z from 'zod';

/**
 * Creates a Zod schema for a single-line string with optional min and max length
 * constraints.
 *
 * Additionally, strings parsed with this schema will be preprocessed to:
 * 1. Replace all whitespace characters with a single space
 * 2. Trim leading and trailing whitespace
 */
export const getNormalizedLineSchema = z
  .function({
    input: [
      z
        .object({
          /**
           * Optional minimum length of the string.
           */
          minLength: z.number().int().nonnegative().optional(),
          /**
           * Optional maximum length of the string.
           */
          maxLength: z.number().int().nonnegative().optional(),
        })
        .superRefine(({ maxLength = Infinity, minLength = 0 }, ctx) => {
          if (minLength > maxLength) {
            ctx.addIssue({
              code: 'too_big',
              input: minLength,
              maximum: maxLength,
              origin: 'number',
              path: ['minLength'],
              message: "'minLength' cannot be greater than 'maxLength'",
              continue: false,
            });
            return;
          }

          if (maxLength < minLength) {
            ctx.addIssue({
              code: 'too_small',
              input: maxLength,
              minimum: minLength,
              origin: 'number',
              path: ['maxLength'],
              message: "'maxLength' cannot be less than 'minLength'",
              continue: false,
            });
          }
        })
        .default(() => ({})),
    ],
  })
  .implement(({ maxLength, minLength } = {}) => {
    let schema = z.string();
    if (minLength !== undefined) schema = schema.min(minLength);
    if (maxLength !== undefined) schema = schema.max(maxLength);
    return z.preprocess(
      (x: string) =>
        typeof x === 'string' ? x.replace(/\s+/g, ' ').trim() : x,
      schema,
    );
  });
