import { describe, expect, it } from 'vitest';
import z from 'zod';
import { ZodError } from 'zod';
import { formatFirstZodIssueMessage } from './zodValidation.js';

describe('formatFirstZodIssueMessage', () => {
  it('formats path and invalid value from the first issue', () => {
    const body = { items: [{ id: '' }] };
    const schema = z.object({
      items: z.array(z.object({ id: z.string().min(1) })),
    });
    const result = schema.safeParse(body);
    expect(result.success).toBe(false);
    if (result.success) return;
    const msg = formatFirstZodIssueMessage(body, result.error);
    expect(msg).toContain('items[0].id');
    expect(msg).toContain("''");
  });

  it('returns a generic message when there are no issues', () => {
    const err = new ZodError([]);
    expect(formatFirstZodIssueMessage({}, err)).toBe('Invalid request body');
  });
});
