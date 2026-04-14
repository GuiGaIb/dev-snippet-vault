import type { TTimeStamps } from '@models/types/shared';
import z from 'zod';

export const coercedTimeStampSchema = z.coerce.date<string | number | Date>();

export type TCoercedTimeStampInput = z.input<typeof coercedTimeStampSchema>;

export const timeStampsSchema = z.object({
  createdAt: coercedTimeStampSchema,
  updatedAt: coercedTimeStampSchema,
}) satisfies z.ZodType<TTimeStamps>;

/**
 * Autofill `createdAt` and `updatedAt` properties if not provided.
 * - `createdAt` is parsed if provided, otherwise defaults to system time
 * - `updatedAt` is parsed if provided, otherwise defaults to `createdAt`
 *
 * If `createdAt` or `updatedAt` are `null`, they are treated as `undefined`. `zod.coerce.date().parse(null)` normally produces a date object at epoch 0,which is not the desired behavior.
 */
export function autofillTimeStamps<
  T extends {
    [key: PropertyKey]: unknown;
    createdAt?: TCoercedTimeStampInput;
    updatedAt?: TCoercedTimeStampInput;
  },
>(data: T): T & TTimeStamps {
  // Parse if provided, otherwise use system time
  const createdAt: Date = coercedTimeStampSchema.parse(
    data.createdAt ?? new Date(),
  );

  // Parse if provided, otherwise use creation time
  const updatedAt: Date = coercedTimeStampSchema.parse(
    data.updatedAt ?? createdAt,
  );

  return {
    ...data,
    createdAt,
    updatedAt,
  };
}
