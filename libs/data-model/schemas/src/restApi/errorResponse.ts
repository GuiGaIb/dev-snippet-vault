import z from 'zod';

export const errorResponseSchema = z.object({
  message: z.string().trim(),
  status: z.number().int().min(100).max(599),
  details: z.record(z.string(), z.unknown()).optional(),
});
