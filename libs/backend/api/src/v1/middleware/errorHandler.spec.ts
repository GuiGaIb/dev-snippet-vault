/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { errorResponseSchema } from '@models/schemas/restApi/errorResponse';
import type { ErrorResponse } from '@models/types/restApi';
import express, { json, type ErrorRequestHandler, type Express } from 'express';
import request from 'supertest';
import { vi } from 'vitest';
import { errorHandler } from './errorHandler.js';

/*
  Script to run this test suite:
  nx test backend-api v1/middleware/errorHandler
*/

describe('errorHandler', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
  });

  it('passes to next error handler if the error cannot be parsed with errorResponseSchema', async () => {
    const message = faker.lorem.sentence();
    const spy = vi.fn<ErrorRequestHandler>((err, _req, res, _next) => {
      res.status(400).send(String(err));
    });
    app.get(
      '/',
      () => {
        throw new Error(message);
      },
      errorHandler,
      spy,
    );

    const response = await request(app).get('/');

    expect(response.status).toBe(400);
    expect(response.text).toBe(`Error: ${message}`);
    expect(spy).toHaveBeenCalled();
  });

  it('responds with a 200 status code if the error can be parsed with errorResponseSchema', async () => {
    app.use(json());
    app.post('/', (req, _res, next) => {
      next(req.body);
    });
    app.use(errorHandler);

    const payload = buildMockErrorResponse();
    const response = await request(app).post('/').send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(payload);
  });

  it('delegates to the next error handler if headers have already been sent', async () => {
    const payload = buildMockErrorResponse();
    const spy = vi.fn<ErrorRequestHandler>((_err, _req, res, _next) => {
      res.end();
    });

    app.use(json());
    app.post('/', (req, res, next) => {
      res.writeHead(200);
      res.flushHeaders();
      next(req.body);
    });
    app.use(errorHandler);
    app.use(spy);

    await request(app).post('/').send(payload);

    expect(spy).toHaveBeenCalled();
  });

  function buildMockErrorResponse(): ErrorResponse {
    return errorResponseSchema.parse({
      message: faker.lorem.sentence(),
      status: faker.number.int({ min: 100, max: 599 }),
      details: Array.from(
        { length: faker.number.int({ min: 1, max: 3 }) },
        () => faker.lorem.word(),
      ).reduce(
        (acc, word) => ({
          ...acc,
          [word]: faker.lorem.sentence(),
        }),
        {},
      ),
    });
  }
});
