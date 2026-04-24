import { describe, expect, it } from 'vitest';
import {
  extractMongoDuplicateKeyMeta,
  isMongoDuplicateKeyForField,
} from './mongoDuplicateKey.js';

describe('extractMongoDuplicateKeyMeta', () => {
  it('reads duplicate key metadata from a direct error', () => {
    const err = {
      code: 11000,
      keyPattern: { email: 1 },
      keyValue: { email: 'a@b.com' },
    };
    expect(extractMongoDuplicateKeyMeta(err)).toEqual({
      keyPattern: { email: 1 },
      keyValue: { email: 'a@b.com' },
    });
  });

  it('reads duplicate key metadata from error.cause', () => {
    const err = {
      code: 1,
      cause: {
        code: 11000,
        keyPattern: { name: 1 },
        keyValue: { name: 'x' },
      },
    };
    expect(extractMongoDuplicateKeyMeta(err)).toEqual({
      keyPattern: { name: 1 },
      keyValue: { name: 'x' },
    });
  });

  it('returns null when not a duplicate key error', () => {
    expect(extractMongoDuplicateKeyMeta(new Error('boom'))).toBeNull();
  });
});

describe('isMongoDuplicateKeyForField', () => {
  it('returns true when keyPattern matches the field', () => {
    expect(
      isMongoDuplicateKeyForField(
        { code: 11000, keyPattern: { slug: 1 }, keyValue: {} },
        'slug',
      ),
    ).toBe(true);
  });

  it('returns true when keyValue contains the field', () => {
    expect(
      isMongoDuplicateKeyForField(
        { code: 11000, keyValue: { sku: 'ABC' } },
        'sku',
      ),
    ).toBe(true);
  });

  it('returns false for a different field', () => {
    expect(
      isMongoDuplicateKeyForField(
        { code: 11000, keyPattern: { other: 1 } },
        'name',
      ),
    ).toBe(false);
  });
});
