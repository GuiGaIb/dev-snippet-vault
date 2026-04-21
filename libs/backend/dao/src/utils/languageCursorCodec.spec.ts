import { Types } from 'mongoose';
import {
  languageCursorCodec,
  type LanguageCursor,
} from './languageCursorCodec.js';

describe('languageCursorCodec', () => {
  describe('encode', () => {
    it('throws if the input is not a valid base64 string', () => {
      expect(() => languageCursorCodec.encode('invalid')).toThrow(
        'Invalid base64-encoded string',
      );
    });

    it('throws if the input is not a valid language cursor representation', () => {
      expect(() =>
        languageCursorCodec.encode(
          Buffer.from(JSON.stringify({ foo: 'bar' })).toString('base64'),
        ),
      ).toThrow('Unrecognized key: \\"foo\\"');

      expect(() =>
        languageCursorCodec.encode(
          Buffer.from(
            JSON.stringify({ sort: { updatedAt: 'invalid' } }),
          ).toString('base64'),
        ),
      ).toThrow('Invalid option: expected one of \\"asc\\"|\\"desc\\"');

      expect(() =>
        languageCursorCodec.encode(
          Buffer.from(
            JSON.stringify({ sort: { updatedAt: 'asc' }, limit: -1 }),
          ).toString('base64'),
        ),
      ).toThrow('Too small: expected number to be >0');

      expect(() =>
        languageCursorCodec.encode(
          Buffer.from(
            JSON.stringify({
              sort: { updatedAt: 'desc' },
              limit: 10,
              position: {
                updatedAt: new Date().toISOString(),
                id: 'not-a-valid-object-id',
                direction: 'after',
              },
            }),
          ).toString('base64'),
        ),
      ).toThrow('Invalid string: must match pattern /^[0-9a-fA-F]{24}$/');

      expect(() =>
        languageCursorCodec.encode(
          Buffer.from(
            JSON.stringify({
              sort: { updatedAt: 'desc' },
              limit: 10,
              position: {
                updatedAt: new Date().toISOString(),
                id: new Types.ObjectId().toString(),
                direction: 'sideways',
              },
            }),
          ).toString('base64'),
        ),
      ).toThrow();
    });

    it('returns a valid cursor object', () => {
      const cursor: LanguageCursor = {
        sort: {
          updatedAt: Math.random() > 0.5 ? 'asc' : 'desc',
        },
        limit: Math.floor(Math.random() * 100) + 1,
      };
      const decoded = languageCursorCodec.decode(cursor);
      const encoded = languageCursorCodec.encode(decoded);
      expect(encoded).toEqual(cursor);
    });
  });

  describe('decode', () => {
    it('throws if an invalid sort option is provided', () => {
      expect(() =>
        languageCursorCodec.decode({
          sort: {
            // @ts-expect-error - invalid sort option
            updatedAt: 'invalid',
          },
        }),
      ).toThrow('Invalid option: expected one of \\"asc\\"|\\"desc\\"');

      expect(() =>
        languageCursorCodec.decode({
          sort: {
            // @ts-expect-error - invalid sort key
            invalidSortKey: 'asc',
          },
        }),
      ).toThrow('Unrecognized key: \\"invalidSortKey\\"');
    });

    it('throws if an invalid limit is provided', () => {
      expect(() =>
        languageCursorCodec.decode({
          limit: -1,
        }),
      ).toThrow('Too small: expected number to be >0');

      expect(() =>
        languageCursorCodec.decode({
          limit: 101,
        }),
      ).toThrow('Too big: expected number to be <=100');
    });

    it('defaults the sort option to { updatedAt: "desc" } and the limit to 10', () => {
      const base64 = languageCursorCodec.decode(undefined);
      const cursor = languageCursorCodec.encode(base64);

      expect(cursor).toEqual({
        sort: {
          updatedAt: 'desc',
        },
        limit: 10,
      });
    });

    it('returns a valid cursor base64 representation', () => {
      const cursor: LanguageCursor = {
        sort: {
          updatedAt: Math.random() > 0.5 ? 'asc' : 'desc',
        },
        limit: Math.floor(Math.random() * 100) + 1,
      };
      const base64 = languageCursorCodec.decode(cursor);
      expect(base64).toEqual(
        Buffer.from(JSON.stringify(cursor)).toString('base64'),
      );
    });

    it('rejects an invalid position id via decode', () => {
      expect(() =>
        languageCursorCodec.decode({
          limit: 5,
          position: {
            updatedAt: new Date(),
            id: 'zzz',
            direction: 'after',
          },
        }),
      ).toThrow('Invalid string: must match pattern /^[0-9a-fA-F]{24}$/');
    });

    it('round-trips a cursor with position through base64', () => {
      const id = new Types.ObjectId().toString();
      const cursor: LanguageCursor = {
        sort: { updatedAt: 'desc' },
        limit: 7,
        position: {
          updatedAt: new Date('2024-06-01T12:00:00.000Z'),
          id,
          direction: 'before',
        },
      };
      const base64 = languageCursorCodec.decode(cursor);
      const roundTrip = languageCursorCodec.encode(base64);
      expect(roundTrip?.sort).toEqual(cursor.sort);
      expect(roundTrip?.limit).toBe(cursor.limit);
      expect(roundTrip?.position?.direction).toBe('before');
      expect(roundTrip?.position?.id).toBe(id);
      expect(roundTrip?.position?.updatedAt.getTime()).toBe(
        cursor.position!.updatedAt.getTime(),
      );
    });
  });
});
