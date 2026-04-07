import { Types } from 'mongoose';
import { ZodError } from 'zod';
import {
  extractVersionDuplicates,
  languageSchema,
  languageVersionSchema,
  minimizeVersionSortIdxs,
} from './language.js';

describe('language schemas', () => {
  describe('extractVersionDuplicates', () => {
    it('returns no duplicates for unique version ids and sort indexes', () => {
      expect(
        extractVersionDuplicates([
          { versionId: '1.0', sortIdx: 0 },
          { versionId: '2.0', sortIdx: 1 },
          { versionId: '3.0', sortIdx: 2 },
        ]),
      ).toEqual({
        versionIds: [],
        sortIdxs: [],
      });
    });

    it('returns every duplicate occurrence after the first', () => {
      expect(
        extractVersionDuplicates([
          { versionId: '1.0', sortIdx: 0 },
          { versionId: '1.0', sortIdx: 1 },
          { versionId: '2.0', sortIdx: 1 },
          { versionId: '1.0', sortIdx: 0 },
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
      expect(
        minimizeVersionSortIdxs([
          { versionId: '3.0', sortIdx: 10 },
          { versionId: '1.0', sortIdx: 2 },
          { versionId: '2.0', sortIdx: 4 },
        ]),
      ).toEqual([
        { versionId: '1.0', sortIdx: 0 },
        { versionId: '2.0', sortIdx: 1 },
        { versionId: '3.0', sortIdx: 2 },
      ]);
    });

    it('does not mutate the original array', () => {
      const versions = [
        { versionId: '2.0', sortIdx: 8 },
        { versionId: '1.0', sortIdx: 3 },
      ];

      const minimized = minimizeVersionSortIdxs(versions);

      expect(minimized).not.toBe(versions);
      expect(versions).toEqual([
        { versionId: '2.0', sortIdx: 8 },
        { versionId: '1.0', sortIdx: 3 },
      ]);
    });
  });

  describe('languageVersionSchema', () => {
    it('normalizes versionId and accepts a nonnegative integer sortIdx', () => {
      expect(
        languageVersionSchema.parse({
          versionId: '  ES   2023  ',
          sortIdx: 2,
        }),
      ).toEqual({
        versionId: 'ES 2023',
        sortIdx: 2,
      });
    });

    it('rejects invalid version metadata', () => {
      expect(() =>
        languageVersionSchema.parse({
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
      validId = new Types.ObjectId().toString();
    });

    it('normalizes the name, validates the id, and minimizes version sort indexes', () => {
      expect(
        languageSchema.parse({
          id: validId,
          name: '  TypeScript   ',
          versions: [
            { versionId: '  5.3  ', sortIdx: 8 },
            { versionId: '  4.9  ', sortIdx: 3 },
          ],
        }),
      ).toEqual({
        id: validId,
        name: 'TypeScript',
        versions: [
          { versionId: '4.9', sortIdx: 0 },
          { versionId: '5.3', sortIdx: 1 },
        ],
      });
    });

    it('rejects duplicate versionId values', () => {
      expect(() =>
        languageSchema.parse({
          id: validId,
          name: 'TypeScript',
          versions: [
            { versionId: '4.9', sortIdx: 0 },
            { versionId: '4.9', sortIdx: 1 },
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
            { versionId: '4.9', sortIdx: 0 },
            { versionId: '5.0', sortIdx: 0 },
          ],
        }),
      ).toThrow(ZodError);
    });

    it('reports duplicate issues on the duplicate entries', () => {
      const result = languageSchema.safeParse({
        id: validId,
        name: 'TypeScript',
        versions: [
          { versionId: '4.9', sortIdx: 0 },
          { versionId: '4.9', sortIdx: 1 },
          { versionId: '5.0', sortIdx: 1 },
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
