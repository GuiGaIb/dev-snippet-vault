import {
  createLanguageSchema,
  type TCreateLanguageInput,
} from '@models/schemas/language';
import type { TLanguage } from '@models/types/language';
import type { RequestHandler } from 'express';
import type { ZodError } from 'zod';
import type { LanguageLocals } from './types.js';

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

function firstZodIssueMessage(body: unknown, error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid request body';
  const path = zodPathSegments(issue.path);
  const pathStr = path.length ? formatValidationPath(path) : 'body';
  const raw = valueAtPath(body, path);
  const valueDisplay = displayInvalidValue(raw);
  return `${pathStr} '${valueDisplay}' is invalid: ${issue.message}`;
}

function duplicateMongoFields(error: unknown): {
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
} | null {
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

function isDuplicateNameError(error: unknown): boolean {
  const dup = duplicateMongoFields(error);
  if (!dup) return false;
  if (dup.keyPattern?.name === 1) return true;
  if (
    dup.keyValue &&
    Object.prototype.hasOwnProperty.call(dup.keyValue, 'name')
  ) {
    return true;
  }
  return false;
}

export const createLanguage: RequestHandler<
  any,
  TLanguage,
  TCreateLanguageInput,
  any,
  LanguageLocals['WithLanguageService']
> = async (req, res, next) => {
  const { languageService } = res.locals;
  if (!languageService) {
    return next({
      message: 'Internal server error',
      status: 500,
      details: {
        cause: 'Language service not initialized',
      },
    });
  }

  const parsed = createLanguageSchema.safeParse(req.body);
  if (!parsed.success) {
    return next({
      status: 400,
      message: firstZodIssueMessage(req.body, parsed.error),
      details: {
        issues: parsed.error.issues,
      },
    });
  }

  try {
    const languageDoc = await languageService.createLanguage(parsed.data);
    res.status(201).json(languageDoc.forClient());
  } catch (error) {
    if (isDuplicateNameError(error)) {
      return next({
        status: 400,
        message: `Language with name '${parsed.data.name}' already exists`,
      });
    }
    return next({
      status: 500,
      message: 'Internal server error',
      details: {
        cause:
          error instanceof Error ? error.message : String(error ?? 'unknown'),
      },
    });
  }
};
