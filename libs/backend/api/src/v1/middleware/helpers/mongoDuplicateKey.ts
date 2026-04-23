export type MongoDuplicateKeyMeta = {
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
};

/**
 * Returns duplicate-key metadata when `error` or `error.cause` is a Mongo
 * duplicate key error (code `11000`), otherwise `null`.
 */
export function extractMongoDuplicateKeyMeta(
  error: unknown,
): MongoDuplicateKeyMeta | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as {
    code?: number;
    keyPattern?: Record<string, unknown>;
    keyValue?: Record<string, unknown>;
    cause?: unknown;
  };
  if (e.code === 11000) {
    return { keyPattern: e.keyPattern, keyValue: e.keyValue };
  }
  if (e.cause && typeof e.cause === 'object') {
    const c = e.cause as {
      code?: number;
      keyPattern?: Record<string, unknown>;
      keyValue?: Record<string, unknown>;
    };
    if (c.code === 11000) {
      return { keyPattern: c.keyPattern, keyValue: c.keyValue };
    }
  }
  return null;
}

/**
 * Returns whether the duplicate-key metadata targets a single indexed field
 * named `field` (e.g. a unique index on `{ name: 1 }`).
 */
export function isMongoDuplicateKeyForField(
  error: unknown,
  field: string,
): boolean {
  const dup = extractMongoDuplicateKeyMeta(error);
  if (!dup) return false;
  if (dup.keyPattern?.[field] === 1) return true;
  if (
    dup.keyValue &&
    Object.prototype.hasOwnProperty.call(dup.keyValue, field)
  ) {
    return true;
  }
  return false;
}
