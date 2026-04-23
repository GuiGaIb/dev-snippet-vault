import { LanguageService } from '@backend/dao/services/language';
import { faker } from '@faker-js/faker';
import { deleteModel, getModelWithString } from '@typegoose/typegoose';
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import request from 'supertest';
import { vi } from 'vitest';
import { initLanguageService } from './initLanguageService.js';
import type { LanguageLocals } from './types.js';

/*
  Script to run this test suite:
  nx test backend-api v1/languages/middleware/initLanguageService
*/

describe('initLanguageService', () => {
  let modelName: string;
  let collection: string;
  let app: Express;

  beforeEach(() => {
    modelName = faker.lorem.word();
    collection = faker.lorem.word();
    setupApp();

    return () => {
      deleteModel(modelName);
    };
  });

  it('uses the initialization options from the request locals', async () => {
    app.get('/', (_req, res) => {
      res.json({
        modelName: res.locals.languageService.Languages.modelName,
        collection: res.locals.languageService.Languages.collection.name,
      });
    });
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      modelName,
      collection,
    });
  });

  it("doesn't overwrite the language service instance if it already exists in the response locals", async () => {
    const testModelName = `${modelName}-${faker.lorem.word()}`;
    app.get(
      '/',
      (
        _req,
        res: Response<any, LanguageLocals['WithLanguageService']>,
        next,
      ) => {
        res.locals.languageServiceOptions = {
          LanguageModelOptions: {
            options: {
              customName: testModelName,
            },
          },
        };
        next();
      },
      initLanguageService,
      (_req, res) => {
        res.json({
          modelName: res.locals.languageService.Languages.modelName,
        });
      },
    );
    const response = await request(app).get('/').expect(200);

    expect(response.body.modelName).toBe(modelName);
    expect(response.body.modelName).not.toBe(testModelName);
    expect(getModelWithString(testModelName)).toBeUndefined();

    deleteModel(testModelName);
  });

  it('sets the language service instance in the response locals', async () => {
    app.get(
      '/',
      (_req, res: Response<any, LanguageLocals['WithLanguageService']>) => {
        res.json({
          test: !!(
            res.locals.languageService &&
            res.locals.languageService instanceof LanguageService
          ),
        });
      },
    );
    const response = await request(app).get('/').expect(200);

    expect(response.body.test).toBe(true);
  });

  it('calls next with an error if LanguageService.getInstance throws', async () => {
    const error = new Error('Test error');
    const spy = vi
      .spyOn(LanguageService, 'getInstance')
      .mockRejectedValue(error);

    app.use((err: Error, _req: Request, res: Response) => {
      res.status(500).json({ message: err.message });
    });

    const response = await request(app).get('/').expect(500);

    expect(response.body.message).toBe('Test error');

    spy.mockRestore();
  });

  function setLanguageServiceOptions(m = modelName, c = collection) {
    return (
      _req: Request,
      res: Response<any, LanguageLocals['WithLanguageService']>,
      next: NextFunction,
    ) => {
      res.locals.languageServiceOptions = {
        LanguageModelOptions: {
          schemaOptions: {
            collection: c,
          },
          options: {
            customName: m,
          },
        },
      };
      next();
    };
  }

  function setupApp() {
    app = express().use(setLanguageServiceOptions(), initLanguageService);
  }
});
