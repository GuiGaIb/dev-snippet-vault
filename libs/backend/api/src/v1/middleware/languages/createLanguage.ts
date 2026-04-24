import {
  createLanguageSchema,
  type TCreateLanguageInput,
} from '@models/schemas/language';
import type { TLanguage } from '@models/types/language';
import type { RequestHandler } from 'express';
import {
  formatFirstZodIssueMessage,
  isMongoDuplicateKeyForField,
} from '../helpers/index.js';
import type { LanguageLocals } from './types.js';

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
      message: formatFirstZodIssueMessage(req.body, parsed.error),
      details: {
        issues: parsed.error.issues,
      },
    });
  }

  try {
    const languageDoc = await languageService.createLanguage(parsed.data);
    res.status(201).json(languageDoc.forClient());
  } catch (error) {
    if (isMongoDuplicateKeyForField(error, 'name')) {
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
