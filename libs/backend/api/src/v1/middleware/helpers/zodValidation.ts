import type { ZodError } from 'zod';

function formatValidationPath(path: (string | number)[]): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') {
      return `${acc}[${segment}]`;
    }
    return acc === '' ? String(segment) : `${acc}.${segment}`;
  }, '');
}

function valueAtPath(input: unknown, path: (string | number)[]): unknown {
  let cur: unknown = input;
  for (const key of path) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      return undefined;
    }
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur;
}

function displayInvalidValue(raw: unknown): string {
  if (raw === undefined) return 'undefined';
  if (raw === null) return 'null';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw);
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}

function zodPathSegments(path: PropertyKey[]): (string | number)[] {
  return path.filter(
    (k): k is string | number => typeof k === 'string' || typeof k === 'number',
  );
}

/**
 * Builds a short, user-facing message from the first issue in a `ZodError`,
 * including the issue path and the invalid value read from `body`.
 */
export function formatFirstZodIssueMessage(
  body: unknown,
  error: ZodError,
): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid request body';
  const path = zodPathSegments(issue.path);
  const pathStr = path.length ? formatValidationPath(path) : 'body';
  const raw = valueAtPath(body, path);
  const valueDisplay = displayInvalidValue(raw);
  return `${pathStr} '${valueDisplay}' is invalid: ${issue.message}`;
}
