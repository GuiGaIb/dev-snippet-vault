import { LanguageService } from '@backend/dao/services/language';
import { errorResponseSchema } from '@models/schemas/restApi/errorResponse';
import type { ErrorResponse } from '@models/types/restApi';
import type { RequestHandler } from 'express';
import type { LanguageLocals } from './types.js';

/**
 * Express middleware that initializes the `LanguageService` and attaches it to `res.locals`.
 *
 * If a valid `LanguageService` instance already exists on `res.locals.languageService`,
 * it skips initialization. Otherwise, it creates a new instance using the options
 * provided in `res.locals.languageServiceOptions`.
 *
 * If the initialization fails, it catches the error and forwards a standardized
 * 500 Internal Server Error response to the next error-handling middleware.
 *
 * @param _req - The Express request object (unused).
 * @param res - The Express response object, containing locals for service options and the service instance.
 * @param next - The Express next middleware function.
 */
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
