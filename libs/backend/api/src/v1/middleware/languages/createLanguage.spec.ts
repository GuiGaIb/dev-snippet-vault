import type { LanguageModel } from '@backend/dao/models/language';
import { faker } from '@faker-js/faker';
import { languageSchema } from '@models/schemas/language';
import { errorResponseSchema } from '@models/schemas/restApi/errorResponse';
import { setupTestServer } from '@tools/mongodb-test-setup';
import express, { json, type Express } from 'express';
import request from 'supertest';
import { errorHandler } from '../errorHandler.js';
import { createLanguage } from './createLanguage.js';
import { initLanguageService } from './initLanguageService.js';

/*
  Script to run this test suite:
  nx test backend-api v1/middleware/languages/createLanguage
*/

function expectLogicalError(
  status: number,
  body: Record<string, unknown>,
): void {
  expect(errorResponseSchema.safeParse(body).success).toBe(true);
  expect(body.status).toBe(status);
}

describe('createLanguage', () => {
  setupTestServer();

  let app: Express;
  let Languages: LanguageModel | undefined;

  beforeEach(async () => {
    app = express().use(json(), initLanguageService, (_req, res, next) => {
      Languages = res.locals.languageService.Languages;
      next();
    });
    app.post('/', createLanguage);
    app.use(errorHandler);

    await Languages?.deleteMany({});
  });

  it('creates a language document and responds with status 201 and the created language as a TLanguage object', async () => {
    const name = faker.lorem.word();
    const response = await request(app).post('/').send({ name });

    expect(response.status).toBe(201);
    expect(languageSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.name).toBe(name);
  });

  it('responds with ErrorResponse 400 if the language already exists', async () => {
    const name = faker.lorem.word();
    const successResponse = await request(app).post('/').send({ name });

    expect(successResponse.status).toBe(201);
    expect(languageSchema.safeParse(successResponse.body).success).toBe(true);
    expect(successResponse.body.name).toBe(name);

    const errorResponse = await request(app).post('/').send({ name });
    expect(errorResponse.status).toBe(200);
    expectLogicalError(400, errorResponse.body);
    expect(errorResponse.body.message).toBe(
      `Language with name '${name}' already exists`,
    );
  });

  it('responds with logical 400 when name is missing', async () => {
    const response = await request(app).post('/').send({});

    expect(response.status).toBe(200);
    expectLogicalError(400, response.body);
    expect(String(response.body.message)).toContain('name');
  });

  it("responds with logical 400 when name is ''", async () => {
    const response = await request(app).post('/').send({ name: '' });

    expect(response.status).toBe(200);
    expectLogicalError(400, response.body);
    expect(String(response.body.message)).toMatch(/name/);
    expect(String(response.body.message)).toMatch(/''/);
  });

  it('responds with logical 400 when name exceeds max length', async () => {
    const name = 'a'.repeat(65);
    const response = await request(app).post('/').send({ name });

    expect(response.status).toBe(200);
    expectLogicalError(400, response.body);
    expect(String(response.body.message)).toContain('name');
  });

  it('responds with logical 400 when name has wrong type', async () => {
    const response = await request(app).post('/').send({ name: 123 });

    expect(response.status).toBe(200);
    expectLogicalError(400, response.body);
    expect(String(response.body.message)).toContain('name');
  });

  it('responds with logical 400 when versions contain duplicate versionId', async () => {
    const response = await request(app)
      .post('/')
      .send({
        name: faker.lorem.word(),
        versions: [
          { versionId: 'dup', sortIdx: 0 },
          { versionId: 'dup', sortIdx: 1 },
        ],
      });

    expect(response.status).toBe(200);
    expectLogicalError(400, response.body);
    const issues = response.body.details?.issues as
      | { message?: string }[]
      | undefined;
    expect(Array.isArray(issues)).toBe(true);
    expect(
      issues?.some((i) =>
        String(i.message).includes("Version ID 'dup' is not unique"),
      ),
    ).toBe(true);
  });

  it('responds with logical 400 when versions contain duplicate sortIdx', async () => {
    const response = await request(app)
      .post('/')
      .send({
        name: faker.lorem.word(),
        versions: [
          { versionId: 'a', sortIdx: 0 },
          { versionId: 'b', sortIdx: 0 },
        ],
      });

    expect(response.status).toBe(200);
    expectLogicalError(400, response.body);
    const issues = response.body.details?.issues as
      | { message?: string }[]
      | undefined;
    expect(Array.isArray(issues)).toBe(true);
    expect(
      issues?.some((i) =>
        String(i.message).includes("Sort index '0' is not unique"),
      ),
    ).toBe(true);
  });

  it('responds with logical 400 when a version entry is missing versionId', async () => {
    const response = await request(app)
      .post('/')
      .send({
        name: faker.lorem.word(),
        versions: [{ sortIdx: 0 }],
      });

    expect(response.status).toBe(200);
    expectLogicalError(400, response.body);
    expect(String(response.body.message)).toContain('versionId');
  });

  it('responds with logical 500 when languageService is not initialized', async () => {
    const bareApp = express().use(json());
    bareApp.post('/', createLanguage);
    bareApp.use(errorHandler);

    const response = await request(bareApp)
      .post('/')
      .send({ name: faker.lorem.word() });

    expect(response.status).toBe(200);
    expectLogicalError(500, response.body);
    expect(response.body.details?.cause).toBe(
      'Language service not initialized',
    );
  });

  it('responds with logical 500 when createLanguage throws a non-duplicate error', async () => {
    const throwingApp = express().use(
      json(),
      initLanguageService,
      (_req, res, next) => {
        Languages = res.locals.languageService.Languages;
        res.locals.languageService.createLanguage = async () => {
          throw new Error('unexpected persistence failure');
        };
        next();
      },
    );
    throwingApp.post('/', createLanguage);
    throwingApp.use(errorHandler);

    await Languages?.deleteMany({});

    const response = await request(throwingApp)
      .post('/')
      .send({ name: faker.lorem.word() });

    expect(response.status).toBe(200);
    expectLogicalError(500, response.body);
    expect(response.body.message).toBe('Internal server error');
    expect(response.body.details?.cause).toBe('unexpected persistence failure');
  });

  it('creates a language with versions and returns them with matching versionId and sortIdx', async () => {
    const name = faker.lorem.word();
    const versions = [
      { versionId: 'alpha', sortIdx: 0 },
      { versionId: 'beta', sortIdx: 1 },
    ];
    const response = await request(app).post('/').send({ name, versions });

    expect(response.status).toBe(201);
    const data = languageSchema.parse(response.body);
    expect(data.name).toBe(name);
    expect(
      data.versions.find(
        ({ versionId }) => versionId === versions[0].versionId,
      ),
    ).toMatchObject(versions[0]);
    expect(
      data.versions.find(
        ({ versionId }) => versionId === versions[1].versionId,
      ),
    ).toMatchObject(versions[1]);
  });
});
