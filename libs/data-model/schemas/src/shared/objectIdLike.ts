import z from 'zod';
import { objectIdHexRegex, objectIdStringSchema } from './objectIdString.js';

/**
 * Zod schema for a MongoDB ObjectId or a 24-character hexadecimal string that
 * matches {@link objectIdHexRegex}.
 *
 * Accepts both strings and objects with an `_id.toString()` method that returns
 * a string that matches {@link objectIdHexRegex}, making it compatible with
 * Mongoose ObjectIds, which have a convenience `_id.toString()` method.
 *
 * This is useful in Mongoose/Typegoose schemas where a path is an ObjectId or a
 * Ref to another document.
 */
export const objectIdLikeSchema = z.union([
  objectIdStringSchema,
  z
    .custom<WithIdGetter>()
    .refine(
      (x) => {
        try {
          return (
            typeof x?._id?.toString() === 'string' &&
            objectIdHexRegex.test(x._id.toString())
          );
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
          return false;
        }
      },
      {
        abort: true,
        error: 'Invalid ObjectId or ObjectId-like string',
      },
    )
    .transform((x) => x._id.toString()),
]) satisfies z.ZodType<string, string | WithIdGetter>;

type WithIdGetter = { _id: { toString: () => string } };
