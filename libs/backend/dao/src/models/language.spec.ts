import type { TLanguage } from '@models/types/language';
import { setupTestServer } from '@tools/mongodb-test-setup';
import {
  getLanguageModel,
  type LanguageDoc,
  type LanguageModel,
} from './language.js';

describe('language model', () => {
  setupTestServer();

  let Languages: LanguageModel;

  beforeAll(async () => {
    Languages = getLanguageModel({
      schemaOptions: {
        autoCreate: true,
        // Ensure that indexes are created on the collection before tests
        autoIndex: true,
      },
    });
    // Ensure that indexes are created on the collection before tests
    await Languages.init();
  });

  beforeEach(async () => {
    await Languages.deleteMany({});
  });

  describe('indexes', () => {
    it('has a unique index on the "name" field named "name_1_unique"', async () => {
      await expect(Languages.collection.indexes()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: { name: 1 },
            name: 'name_1_unique',
            unique: true,
          }),
        ]),
      );
    });

    it('has a descending index on the "updatedAt" field named "updatedAt_desc"', async () => {
      await expect(Languages.collection.indexes()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: { updatedAt: -1 },
            name: 'updatedAt_desc',
          }),
        ]),
      );
    });
  });

  describe('document creation', () => {
    it('throws an error if creation is attempted with invalid data', async () => {
      await Promise.all([
        expect(async () =>
          Languages.create({
            name: '',
          }),
        ).rejects.toThrow('Path `name` is required'),
        expect(async () =>
          Languages.create({
            name: 'Long name exceeding the maximum length of 64 characters'.repeat(
              3,
            ),
          }),
        ).rejects.toThrow('Path `name` invalid'),
        expect(async () =>
          Languages.create({
            name: 'TypeScript',
            versions: [
              {
                versionId: '5.9.0',
                sortIdx: -1, // Negative sort index is invalid
              },
            ],
          }),
        ).rejects.toThrow('versions.0.sortIdx: Path `sortIdx` invalid'),
      ]);
    });

    it('enforces name uniqueness', async () => {
      const data: Partial<TLanguage> = {
        name: 'TypeScript',
      };

      await expect(Languages.create(data)).resolves.toMatchObject(data);
      await expect(async () => Languages.create(data)).rejects.toThrow(
        'E11000 duplicate key error collection: test.languages index: name_1_unique',
      );
    });

    it('enforces versionId and sortIdx uniqueness in versions array', async () => {
      await expect(async () =>
        Languages.create({
          name: 'TypeScript',
          // Duplicate versionId
          versions: [
            {
              versionId: '5.9.0',
              sortIdx: 0,
            },
            {
              versionId: '5.9.0',
              sortIdx: 1,
            },
          ],
        }),
      ).rejects.toThrow("Version ID '5.9.0' is not unique");

      await expect(async () =>
        Languages.create({
          name: 'TypeScript',
          // Duplicate sortIdx
          versions: [
            {
              versionId: '5.8.0',
              sortIdx: 0,
            },
            {
              versionId: '5.9.0',
              sortIdx: 0,
            },
          ],
        }),
      ).rejects.toThrow("Sort index '0' is not unique");
    });
  });

  describe('validation', () => {
    let doc!: LanguageDoc;

    beforeEach(async () => {
      doc = await Languages.create({
        name: 'TypeScript',
        versions: [
          {
            versionId: '5.9.0',
            sortIdx: 0,
          },
        ],
      });
    });

    it('validates the versions array before saving', async () => {
      await expect(async () =>
        doc
          .set('versions.1', {
            versionId: '5.9.0',
            sortIdx: 1,
          })
          .save(),
      ).rejects.toThrow("Version ID '5.9.0' is not unique");

      await expect(async () =>
        doc
          .set('versions.1', {
            versionId: '5.10.0',
            sortIdx: 0,
          })
          .save(),
      ).rejects.toThrow("Sort index '0' is not unique");
    });

    it('minimizes version sort indexes before saving', async () => {
      await expect(
        doc
          .set('versions.1', {
            versionId: '6.0.0',
            sortIdx: 3,
          })
          .save(),
      ).resolves.toMatchObject({
        versions: [
          {
            versionId: '5.9.0',
            sortIdx: 0,
          },
          {
            versionId: '6.0.0',
            sortIdx: 1,
          },
        ],
      });
    });
  });

  describe('query helpers', () => {
    let doc!: LanguageDoc;

    beforeEach(async () => {
      doc = await Languages.create({
        name: 'TypeScript',
        versions: [
          {
            versionId: '5.9.0',
            sortIdx: 0,
          },
        ],
      });
    });

    describe('byName', () => {
      it('trims the passed string before querying', async () => {
        await expect(
          Languages.findOne().byName(doc.name).exec(),
        ).resolves.toHaveLength(1);

        await expect(
          Languages.findOne()
            .byName(
              ' '.repeat(Math.floor(Math.random() * 3)) +
                doc.name +
                ' '.repeat(Math.floor(Math.random() * 3)),
            )
            .exec(),
        ).resolves.toHaveLength(1);
      });
    });
  });

  describe('static methods', () => {
    let doc!: LanguageDoc;

    beforeEach(async () => {
      doc = await Languages.create({
        name: 'TypeScript',
        versions: [
          {
            versionId: '5.9.0',
            sortIdx: 0,
          },
        ],
      });
    });

    describe('findOneByName', () => {
      it('returns null if no document is found', async () => {
        await expect(Languages.findOneByName('Python')).resolves.toBeNull();
      });

      it('returns the document if found', async () => {
        await expect(Languages.findOneByName(doc.name)).resolves.toMatchObject(
          doc.toJSON(),
        );
      });
    });
  });
});
