import { errorResponseSchema } from '@models/schemas/restApi/errorResponse';
import type { ErrorResponse } from '@models/types/restApi';
import type { ErrorRequestHandler } from 'express';

/**
 * Express error handling middleware that intercepts errors and formats them into a standardized JSON response.
 *
 * If the headers have already been sent to the client, it delegates to the next error handler.
 * If the error matches the `errorResponseSchema`, it sends a 200 OK response with the parsed error data.
 * Otherwise, it passes the error down the middleware chain.
 *
 * @param err - The error object caught by Express.
 * @param _req - The Express request object (unused).
 * @param res - The Express response object.
 * @param next - The Express next middleware function.
 */
export const errorHandler: ErrorRequestHandler<any, ErrorResponse> = (
  err,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    return next(err);
  }

  const parsedError = errorResponseSchema.safeParse(err);

  if (parsedError.success) {
    return res.status(200).json(parsedError.data);
  }

  return next(err);
};
