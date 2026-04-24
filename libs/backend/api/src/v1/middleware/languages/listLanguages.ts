import { languageCursorSchema } from '@backend/dao/utils/languageCursorCodec';
import type { TLanguage } from '@models/types/language';
import type { PagedResponse } from '@models/types/restApi';
import type { RequestHandler } from 'express';
import z from 'zod';
import { formatFirstZodIssueMessage } from '../helpers/index.js';
import type { LanguageLocals } from './types.js';

export const listLanguagesRequestBodySchema = z.strictObject({
  ...languageCursorSchema.omit({ position: true }).shape,
  cursor: z.base64().optional(),
});

export type ListLanguagesRequestBody = z.output<
  typeof listLanguagesRequestBodySchema
>;
export type ListLanguagesRequestBodyInput = z.input<
  typeof listLanguagesRequestBodySchema
>;

export const listLanguages: RequestHandler<
  unknown,
  PagedResponse<TLanguage>,
  ListLanguagesRequestBodyInput,
  unknown,
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

  const parsed = listLanguagesRequestBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return next({
      status: 400,
      message: formatFirstZodIssueMessage(req.body ?? {}, parsed.error),
      details: {
        issues: parsed.error.issues,
      },
    });
  }

  try {
    const page = await languageService.listLanguages(
      parsed.data.cursor
        ? parsed.data.cursor
        : {
            limit: parsed.data.limit,
            sort: parsed.data.sort,
          },
    );
    res.status(200).json(page);
  } catch (error) {
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
