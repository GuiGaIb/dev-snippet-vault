import { faker } from '@faker-js/faker';
import { ZodError } from 'zod';
import {
  languageSchema as _languageSchema,
  extractVersionDuplicates,
  languageVersionSchema,
  minimizeVersionSortIdxs,
} from './language.js';

describe('language schemas', () => {
  const languageSchema = _languageSchema.omit({
    createdAt: true,
    updatedAt: true,
  });

  describe('extractVersionDuplicates', () => {
    it('returns no duplicates for unique version ids and sort indexes', () => {
      expect(
        extractVersionDuplicates([
          {
            id: faker.database.mongodbObjectId(),
            versionId: '1.0',
            sortIdx: 0,
          },
          {
            id: faker.database.mongodbObjectId(),
            versionId: '2.0',
            sortIdx: 1,
          },
          {
            id: faker.database.mongodbObjectId(),
            versionId: '3.0',
            sortIdx: 2,
          },
        ]),
      ).toEqual({
        versionIds: [],
        sortIdxs: [],
      });
    });

    it('returns every duplicate occurrence after the first', () => {
      expect(
        extractVersionDuplicates([
          {
            id: faker.database.mongodbObjectId(),
            versionId: '1.0',
            sortIdx: 0,
          },
          {
            id: faker.database.mongodbObjectId(),
            versionId: '1.0',
            sortIdx: 1,
          },
          {
            id: faker.database.mongodbObjectId(),
            versionId: '2.0',
            sortIdx: 1,
          },
          {
            id: faker.database.mongodbObjectId(),
            versionId: '1.0',
            sortIdx: 0,
          },
        ]),
      ).toEqual({
        versionIds: [
          [1, '1.0'],
          [3, '1.0'],
        ],
        sortIdxs: [
          [2, 1],
          [3, 0],
        ],
      });
    });
  });

  describe('minimizeVersionSortIdxs', () => {
    it('sorts by sortIdx ascending and renumbers indexes sequentially', () => {
      const id1 = faker.database.mongodbObjectId();
      const id2 = faker.database.mongodbObjectId();
      const id3 = faker.database.mongodbObjectId();
      const unsorted = [
        {
          id: id3,
          versionId: '3.0',
          sortIdx: 10,
        },
        {
          id: id1,
          versionId: '1.0',
          sortIdx: 2,
        },
        {
          id: id2,
          versionId: '2.0',
          sortIdx: 4,
        },
      ];

      expect(minimizeVersionSortIdxs(unsorted)).toEqual([
        { id: id1, versionId: '1.0', sortIdx: 0 },
        { id: id2, versionId: '2.0', sortIdx: 1 },
        { id: id3, versionId: '3.0', sortIdx: 2 },
      ]);
    });

    it('does not mutate the original array', () => {
      const versions = [
        { id: faker.database.mongodbObjectId(), versionId: '2.0', sortIdx: 8 },
        { id: faker.database.mongodbObjectId(), versionId: '1.0', sortIdx: 3 },
      ];

      const minimized = minimizeVersionSortIdxs(versions);
      expect(minimized).not.toBe(versions);
      expect(versions).toEqual(versions);
    });
  });

  describe('languageVersionSchema', () => {
    it('normalizes versionId and accepts a nonnegative integer sortIdx', () => {
      const id = faker.database.mongodbObjectId();
      expect(
        languageVersionSchema.parse({
          id,
          versionId: '  ES   2023  ',
          sortIdx: 2,
        }),
      ).toEqual({
        id,
        versionId: 'ES 2023',
        sortIdx: 2,
      });
    });

    it('rejects invalid version metadata', () => {
      expect(() =>
        languageVersionSchema.parse({
          id: faker.database.mongodbObjectId(),
          versionId: '   ',
          sortIdx: 0,
        }),
      ).toThrow(ZodError);

      expect(() =>
        languageVersionSchema.parse({
          versionId: 'ok',
          sortIdx: -1,
        }),
      ).toThrow(ZodError);

      expect(() =>
        languageVersionSchema.parse({
          versionId: 'ok',
          sortIdx: 1.5,
        }),
      ).toThrow(ZodError);
    });
  });

  describe('languageSchema', () => {
    let validId: string;

    beforeEach(() => {
      validId = faker.database.mongodbObjectId();
    });

    it('normalizes the name and validates the id', () => {
      const id1 = faker.database.mongodbObjectId();
      const id2 = faker.database.mongodbObjectId();
      expect(
        languageSchema.parse({
          id: validId,
          name: '  TypeScript   ',
          versions: [
            {
              id: id1,
              versionId: '  5.3  ',
              sortIdx: 8,
            },
            {
              id: id2,
              versionId: '  4.9  ',
              sortIdx: 3,
            },
          ],
        }),
      ).toEqual({
        id: validId,
        name: 'TypeScript',
        versions: [
          { id: id1, versionId: '5.3', sortIdx: 8 },
          { id: id2, versionId: '4.9', sortIdx: 3 },
        ],
      });
    });

    it('rejects duplicate versionId values', () => {
      expect(() =>
        languageSchema.parse({
          id: validId,
          name: 'TypeScript',
          versions: [
            {
              id: faker.database.mongodbObjectId(),
              versionId: '4.9',
              sortIdx: 0,
            },
            {
              id: faker.database.mongodbObjectId(),
              versionId: '4.9',
              sortIdx: 1,
            },
          ],
        }),
      ).toThrow(ZodError);
    });

    it('rejects duplicate sortIdx values', () => {
      expect(() =>
        languageSchema.parse({
          id: validId,
          name: 'TypeScript',
          versions: [
            {
              id: faker.database.mongodbObjectId(),
              versionId: '4.9',
              sortIdx: 0,
            },
            {
              id: faker.database.mongodbObjectId(),
              versionId: '5.0',
              sortIdx: 0,
            },
          ],
        }),
      ).toThrow(ZodError);
    });

    it('reports duplicate issues on the duplicate entries', () => {
      const result = languageSchema.safeParse({
        id: validId,
        name: 'TypeScript',
        versions: [
          {
            id: faker.database.mongodbObjectId(),
            versionId: '4.9',
            sortIdx: 0,
          },
          {
            id: faker.database.mongodbObjectId(),
            versionId: '4.9',
            sortIdx: 1,
          },
          {
            id: faker.database.mongodbObjectId(),
            versionId: '5.0',
            sortIdx: 1,
          },
        ],
      });

      expect(result.success).toBe(false);
      if (result.success) {
        throw new Error('Expected parse to fail');
      }

      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['versions', 1, 'versionId'],
            message: "Version ID '4.9' is not unique",
          }),
          expect.objectContaining({
            path: ['versions', 2, 'sortIdx'],
            message: "Sort index '1' is not unique",
          }),
        ]),
      );
    });
  });
});
