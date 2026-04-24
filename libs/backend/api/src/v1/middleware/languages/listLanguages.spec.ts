import type { LanguageModel } from '@backend/dao/models/language';
import { LanguageService } from '@backend/dao/services/language';
import { faker } from '@faker-js/faker';
import { languageSchema } from '@models/schemas/language';
import { errorResponseSchema } from '@models/schemas/restApi/errorResponse';
import { setupTestServer } from '@tools/mongodb-test-setup';
import express, { json, type Express } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../errorHandler.js';
import { initLanguageService } from './initLanguageService.js';
import { listLanguages } from './listLanguages.js';

/*
  Script to run this test suite:
  nx test backend-api v1/middleware/languages/listLanguages
*/

function expectLogicalError(
  status: number,
  body: Record<string, unknown>,
): void {
  expect(errorResponseSchema.safeParse(body).success).toBe(true);
  expect(body.status).toBe(status);
}

function uniqueLanguageName(prefix = 'lang'): string {
  return `${prefix}-${faker.string.nanoid(16)}`;
}

describe('listLanguages', () => {
  setupTestServer();

  let app: Express;
  let Languages: LanguageModel;
  let service: LanguageService;

  beforeAll(async () => {
    service = await LanguageService.getInstance({
      initializeModels: true,
    });
    Languages = service.Languages;
  });

  beforeEach(async () => {
    await Languages.deleteMany({});
    app = express().use(json(), initLanguageService);
    app.post('/', listLanguages);
    app.use(errorHandler);
  });

  it('responds with 200 and empty data when no languages exist', async () => {
    const response = await request(app).post('/').send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [] });
  });

  it('lists languages using service defaults', async () => {
    const names = [uniqueLanguageName('a'), uniqueLanguageName('b')];
    for (const name of names) {
      await service.createLanguage({ name });
    }

    const response = await request(app).post('/').send({});

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(2);
    for (const row of response.body.data) {
      expect(languageSchema.safeParse(row).success).toBe(true);
    }
    expect(
      response.body.data.map((d: { name: string }) => d.name).sort(),
    ).toEqual([...names].sort());
  });

  it('applies first-page limit and structured sort from request body', async () => {
    for (let i = 0; i < 5; i++) {
      await service.createLanguage({ name: uniqueLanguageName(`s-${i}`) });
    }

    const expected = await service.listLanguages({
      limit: 3,
      sort: { updatedAt: 'asc' },
    });

    const response = await request(app)
      .post('/')
      .send({
        limit: 3,
        sort: { updatedAt: 'asc' },
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(3);
    expect(response.body.data.map((d: { id: string }) => d.id)).toEqual(
      expected.data.map((d) => d.id),
    );
  });

  it('pages forward using opaque cursor from prior response', async () => {
    for (let i = 0; i < 7; i++) {
      await service.createLanguage({ name: uniqueLanguageName(`p-${i}`) });
    }

    const page1 = await request(app).post('/').send({ limit: 3 });
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(3);
    const after = page1.body.cursor?.after as string | undefined;
    expect(after).toBeTypeOf('string');

    const page2 = await request(app).post('/').send({ cursor: after });
    expect(page2.status).toBe(200);
    expect(page2.body.data).toHaveLength(3);
  });

  it('treats cursor as authoritative over limit and sort in the request body', async () => {
    for (let i = 0; i < 4; i++) {
      await service.createLanguage({ name: uniqueLanguageName(`c-${i}`) });
    }

    const page1 = await request(app).post('/').send({ limit: 2 });
    const after = page1.body.cursor?.after as string;
    expect(after).toBeDefined();

    const spy = vi.spyOn(LanguageService.prototype, 'listLanguages');

    await request(app)
      .post('/')
      .send({
        cursor: after,
        limit: 99,
        sort: { updatedAt: 'asc' },
      });

    expect(spy).toHaveBeenCalledWith(after);
    spy.mockRestore();
  });

  it('responds with logical 400 for invalid cursor', async () => {
    const response = await request(app).post('/').send({
      cursor: 'not-valid-base64!!!',
    });

    expect(response.status).toBe(200);
    expectLogicalError(400, response.body);
    expect(String(response.body.message)).toMatch(
      /Invalid base64-encoded string/,
    );
  });

  it('responds with logical 400 for invalid sort shape when cursor is absent', async () => {
    const response = await request(app).post('/').send({ sort: 'sideways' });

    expect(response.status).toBe(200);
    expectLogicalError(400, response.body);
    expect(String(response.body.message)).toMatch(/sort/i);
  });

  it('responds with logical 400 for invalid limit when cursor is absent', async () => {
    const response = await request(app).post('/').send({ limit: 0 });

    expect(response.status).toBe(200);
    expectLogicalError(400, response.body);
    expect(String(response.body.message)).toMatch(/limit/i);
  });

  it('responds with logical 500 when languageService is not initialized', async () => {
    const bareApp = express().use(json());
    bareApp.post('/', listLanguages);
    bareApp.use(errorHandler);

    const response = await request(bareApp).post('/').send({});

    expect(response.status).toBe(200);
    expectLogicalError(500, response.body);
    expect(response.body.details?.cause).toBe(
      'Language service not initialized',
    );
  });

  it('responds with logical 500 when listLanguages throws after successful body validation', async () => {
    const throwingApp = express().use(
      json(),
      initLanguageService,
      (_req, res, next) => {
        res.locals.languageService.listLanguages = async () => {
          throw new Error('unexpected list failure');
        };
        next();
      },
    );
    throwingApp.post('/', listLanguages);
    throwingApp.use(errorHandler);

    const response = await request(throwingApp).post('/').send({});

    expect(response.status).toBe(200);
    expectLogicalError(500, response.body);
    expect(response.body.message).toBe('Internal server error');
    expect(response.body.details?.cause).toBe('unexpected list failure');
  });
});
