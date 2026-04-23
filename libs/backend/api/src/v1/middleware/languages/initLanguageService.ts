import { LanguageService } from '@backend/dao/services/language';
import { errorResponseSchema } from '@models/schemas/restApi/errorResponse';
import type { ErrorResponse } from '@models/types/restApi';
import type { RequestHandler } from 'express';
import type { LanguageLocals } from './types.js';

export const initLanguageService: RequestHandler<
  any,
  any,
  any,
  any,
  LanguageLocals['WithLanguageService']
> = async (_req, res, next) => {
  if (!(res.locals.languageService instanceof LanguageService)) {
    try {
      res.locals.languageService = await LanguageService.getInstance(
        res.locals.languageServiceOptions,
      );
    } catch (error) {
      return next(
        errorResponseSchema.parse(<ErrorResponse>{
          message: 'Failed to initialize language service',
          status: 500,
          details: {
            error: String(error),
          },
        }),
      );
    }
  }
  next();
};
