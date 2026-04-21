import { faker } from '@faker-js/faker';
import { setupTestServer } from '@tools/mongodb-test-setup';
import { deleteModel, getModelWithString, isModel } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import {
  DEFAULT_LANGUAGE_COLLECTION,
  DEFAULT_LANGUAGE_MODEL_NAME,
  getLanguageModel,
} from '../models/language.js';
import { languageCursorSchema } from '../utils/languageCursorCodec.js';
import { LanguageService } from './language.js';

/*
  Script to run this test suite:
  `nx test backend-dao services/language`
*/
describe('LanguageService', () => {
  setupTestServer();

  describe('static methods', () => {
    describe('getInstance', () => {
      let customName: string;

      beforeEach(() => {
        customName = faker.lorem.word();

        return async () => {
          for (const name of mongoose.modelNames()) {
            // Clear documents from the model collection
            await getModelWithString(name)?.deleteMany({});

            // Clear models from both Mongoose connection and Typegoose constructors cache
            deleteModel(name);
          }
        };
      });

      it('uses the provided language model if provided', async () => {
        const Languages = getLanguageModel({
          options: {
            customName,
          },
        });
        const service = await LanguageService.getInstance({
          Languages,
        });

        expect(isModel(service.Languages)).toBe(true);
        expect(service.Languages.modelName).toBe(customName);
        expect(
          (<mongoose.Schema>service.Languages.schema).options,
        ).toMatchObject(<mongoose.SchemaOptions>{
          collection: DEFAULT_LANGUAGE_COLLECTION,
        });
      });

      it('uses the provided language model options if provided', async () => {
        const collection = faker.lorem.word();
        const service = await LanguageService.getInstance({
          LanguageModelOptions: {
            schemaOptions: {
              autoIndex: false,
              collection,
            },
            options: {
              customName,
            },
          },
        });

        expect(isModel(service.Languages)).toBe(true);
        expect(service.Languages.modelName).toBe(customName);
        expect(
          (<mongoose.Schema>service.Languages.schema).options,
        ).toMatchObject(<mongoose.SchemaOptions>{
          autoIndex: false,
          collection,
        });
      });

      it('instantiates a new model if no model options are provided', async () => {
        const service = await LanguageService.getInstance();

        expect(isModel(service.Languages)).toBe(true);
        expect(service.Languages.modelName).toBe(DEFAULT_LANGUAGE_MODEL_NAME);
        expect(
          (<mongoose.Schema>service.Languages.schema).options,
        ).toMatchObject(<mongoose.SchemaOptions>{
          collection: DEFAULT_LANGUAGE_COLLECTION,
        });
      });

      it('awaits model intialization if the `initializeModels` option is `true`', async () => {
        const collection = faker.lorem.word();
        const dbName = mongoose.connection.db?.databaseName;

        /*
          Should throw MongoServerError: ns does not exist: <dbName>.<collection> because
          the collection has not been created yet.
        */
        await expect(() =>
          LanguageService.getInstance({
            LanguageModelOptions: {
              schemaOptions: {
                collection,
              },
              options: {
                customName: faker.lorem.word(),
              },
            },
          })
            .then((service) => service.Languages.collection.indexes())
            .then(({ length }) => length),
        ).rejects.toThrow(`ns does not exist: ${dbName}.${collection}`);

        await expect(
          LanguageService.getInstance({
            initializeModels: true,
          })
            .then((service) => service.Languages.collection.indexes())
            .then(({ length }) => length),
        ).resolves.toBeGreaterThan(1);
      });
    });
  });

  describe('instance methods', () => {
    describe('listLanguages', () => {
      let service: LanguageService;

      beforeAll(async () => {
        service = await LanguageService.getInstance({
          initializeModels: true,
        });
      });

      beforeEach(async () => {
        await service.Languages.deleteMany({});
      });

      it('returns the first page in updatedAt desc order with only `after` set', async () => {
        for (let i = 0; i < 25; i++) {
          await service.createLanguage({
            name: `Lang-${i.toString().padStart(2, '0')}`,
          });
        }

        const expected = await service.Languages.find()
          .sort({ updatedAt: -1, _id: -1 })
          .lean()
          .then((docs) => docs.map((d) => String(d._id)));

        const page = await service.listLanguages();

        expect(page.data).toHaveLength(10);
        expect(page.data.map((d) => d.id)).toEqual(expected.slice(0, 10));
        expect(page.cursor?.before).toBeUndefined();
        expect(page.cursor?.after).toBeDefined();
      });

      it('walks forward without gaps or duplicates until the last page has no `after`', async () => {
        for (let i = 0; i < 25; i++) {
          await service.createLanguage({
            name: `Lang-${i.toString().padStart(2, '0')}`,
          });
        }

        const expected = await service.Languages.find()
          .sort({ updatedAt: -1, _id: -1 })
          .lean()
          .then((docs) => docs.map((d) => String(d._id)));

        const seen = new Set<string>();
        let after: string | undefined;
        let pageIdx = 0;

        do {
          const page = await service.listLanguages(
            after === undefined
              ? { limit: 10, sort: { updatedAt: 'desc' } }
              : after,
          );
          for (const d of page.data) {
            expect(seen.has(d.id)).toBe(false);
            seen.add(d.id);
          }
          expect(page.data.map((d) => d.id)).toEqual(
            expected.slice(pageIdx * 10, pageIdx * 10 + page.data.length),
          );
          pageIdx += 1;
          after = page.cursor?.after;
        } while (after !== undefined);

        expect(seen.size).toBe(25);
      });

      it('returns the previous page when using `before` from a later page', async () => {
        for (let i = 0; i < 12; i++) {
          await service.createLanguage({ name: `Lang-${i}` });
        }

        const page1 = await service.listLanguages({
          limit: 5,
          sort: { updatedAt: 'desc' },
        });
        const page2 = await service.listLanguages(page1.cursor!.after!);
        const back = await service.listLanguages(page2.cursor!.before!);

        expect(back.data.map((d) => d.id)).toEqual(page1.data.map((d) => d.id));
      });

      it('does not emit `before` when paging backward from the global first window', async () => {
        for (let i = 0; i < 3; i++) {
          await service.createLanguage({ name: `Only-${i}` });
        }

        const expected = await service.Languages.find()
          .sort({ updatedAt: -1, _id: -1 })
          .lean()
          .then((docs) => docs.map((d) => String(d._id)));

        const page1 = await service.listLanguages({
          limit: 2,
          sort: { updatedAt: 'desc' },
        });

        const firstId = expected[0];
        const beforeFirst = LanguageService.encodeLanguageCursor({
          sort: { updatedAt: 'desc' },
          limit: 2,
          position: {
            updatedAt: page1.data[0].updatedAt,
            id: firstId,
            direction: 'before',
          },
        });

        const atStart = await service.listLanguages(beforeFirst);

        expect(atStart.data).toHaveLength(0);
        expect(atStart.cursor?.before).toBeUndefined();
      });

      it('uses _id as tiebreaker when updatedAt matches', async () => {
        const t = new Date('2018-05-05T00:00:00.000Z');
        for (let i = 0; i < 5; i++) {
          await service.createLanguage({ name: `Tie-${i}` });
        }
        await service.Languages.updateMany({}, { $set: { updatedAt: t } });

        const expected = await service.Languages.find()
          .sort({ updatedAt: -1, _id: -1 })
          .lean()
          .then((docs) => docs.map((d) => String(d._id)));

        const page = await service.listLanguages({
          limit: 3,
          sort: { updatedAt: 'desc' },
        });

        expect(page.data.map((d) => d.id)).toEqual(expected.slice(0, 3));
      });

      it('respects an explicit limit in the cursor input', async () => {
        for (let i = 0; i < 12; i++) {
          await service.createLanguage({ name: `Lim-${i}` });
        }

        const page = await service.listLanguages({
          limit: 5,
          sort: { updatedAt: 'desc' },
        });

        expect(page.data).toHaveLength(5);
      });

      it('throws on an invalid opaque cursor string', async () => {
        await expect(
          service.listLanguages('not-valid-base64!!!'),
        ).rejects.toThrow();
      });

      it('throws when limit exceeds 100 in cursor input', async () => {
        await expect(
          service.listLanguages({ limit: 101, sort: { updatedAt: 'desc' } }),
        ).rejects.toThrow();
      });
    });

    describe('buildLanguagesQuery', () => {
      let service: LanguageService;

      beforeAll(async () => {
        service = await LanguageService.getInstance({
          initializeModels: true,
        });
      });

      beforeEach(async () => {
        await service.Languages.deleteMany({});
      });

      it('fetches at most limit + 1 documents for lookahead', async () => {
        for (let i = 0; i < 6; i++) {
          await service.createLanguage({ name: `Q-${i}` });
        }

        const decoded = languageCursorSchema.parse({
          limit: 3,
          sort: { updatedAt: 'desc' },
        });
        const rows = await service.buildLanguagesQuery(decoded).exec();

        expect(rows.length).toBe(4);
      });
    });
  });
});
