import { objectIdStringSchema } from '@models/schemas/shared/objectIdString';
import z from 'zod';

export const languageCursorSortSchema = z.strictObject({
  updatedAt: z.enum(['asc', 'desc']).default('desc'),
});

export type LanguageCursorSort = z.output<typeof languageCursorSortSchema>;

export const languageCursorPositionSchema = z.strictObject({
  id: objectIdStringSchema,
  updatedAt: z.coerce.date<string | number | Date>(),
  direction: z.enum(['after', 'before']),
});

export type LanguageCursorPosition = z.output<
  typeof languageCursorPositionSchema
>;

export const languageCursorLimitSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(100);

export const languageCursorSchema = z.strictObject({
  sort: languageCursorSortSchema.prefault(() => ({})),
  limit: languageCursorLimitSchema.default(10),
  position: languageCursorPositionSchema.optional(),
});

export type LanguageCursor = z.output<typeof languageCursorSchema>;
export type LanguageCursorInput = z.input<typeof languageCursorSchema>;

export function encodeLanguageCursor(cursor: LanguageCursorInput): string {
  return Buffer.from(
    JSON.stringify(languageCursorSchema.parse(cursor)),
  ).toString('base64');
}

export function decodeLanguageCursor(cursor: string): LanguageCursor {
  return languageCursorSchema.parse(
    JSON.parse(Buffer.from(z.base64().parse(cursor), 'base64').toString()),
  );
}
