import { faker } from '@faker-js/faker';
import z from 'zod';
import {
  decodeLanguageCursor,
  encodeLanguageCursor,
  languageCursorLimitSchema,
  languageCursorPositionSchema,
  languageCursorSchema,
  languageCursorSortSchema,
} from './languageCursorCodec.js';

/*
  Script to run this test suite:
  nx test backend-dao utils/languageCursorCodec
*/

describe('languageCursorSortSchema', () => {
  it('defaults updatedAt to "desc"', () => {
    expect(languageCursorSortSchema.parse({})).toEqual({ updatedAt: 'desc' });
  });
});

describe('languageCursorPositionSchema', () => {
  it('requires id to be a valid object id string', () => {
    expect(() =>
      languageCursorPositionSchema.parse({
        id: 'invalid',
        updatedAt: new Date(),
        direction: 'after',
      }),
    ).toThrow();
  });

  it('coerces updatedAt to a Date', () => {
    const date = faker.date.anytime();
    const string = date.toISOString();
    const number = date.getTime();
    const id = faker.database.mongodbObjectId();
    const direction = faker.helpers.arrayElement(['after', 'before']);

    expect(
      languageCursorPositionSchema.parse({
        id,
        updatedAt: string,
        direction,
      }),
    ).toEqual({
      id,
      updatedAt: date,
      direction,
    });
    expect(
      languageCursorPositionSchema.parse({
        id,
        updatedAt: number,
        direction,
      }),
    ).toEqual({
      id,
      updatedAt: date,
      direction,
    });
    expect(
      languageCursorPositionSchema.parse({
        id,
        updatedAt: date,
        direction,
      }),
    ).toEqual({
      id,
      updatedAt: date,
      direction,
    });
  });
});

describe('languageCursorLimitSchema', () => {
  it('coerces the input to a number', () => {
    const number = faker.number.int({ min: 1, max: 100 });
    expect(languageCursorLimitSchema.parse(String(number))).toEqual(number);
  });
});

describe('languageCursorSchema', () => {
  it('defaults the sort option to { updatedAt: "desc" } and the limit to 10', () => {
    const cursor = languageCursorSchema.parse({});
    expect(cursor.sort).toEqual({ updatedAt: 'desc' });
    expect(cursor.limit).toEqual(10);
  });
});

describe('encodeLanguageCursor', () => {
  it('encodes a valid language cursor object to a base64 string', () => {
    const result = encodeLanguageCursor({
      sort: {
        updatedAt: 'desc',
      },
      limit: 10,
    });
    expect(z.base64().safeParse(result).success).toBe(true);
  });

  it('throws if the input is not a valid language cursor object', () => {
    expect(() =>
      encodeLanguageCursor({
        sort: {
          // @ts-expect-error - invalid sort option
          updatedAt: 'invalid',
        },
      }),
    ).toThrow('Invalid option: expected one of \\"asc\\"|\\"desc\\"');

    expect(() =>
      encodeLanguageCursor({
        limit: -1,
      }),
    ).toThrow('Too small: expected number to be >0');
  });
});

describe('decodeLanguageCursor', () => {
  it('decodes a valid base64 string to a language cursor object', () => {
    const cursor = languageCursorSchema.parse({
      sort: {
        updatedAt: faker.helpers.arrayElement(['asc', 'desc']),
      },
      limit: faker.number.int({ min: 1, max: 100 }),
    });
    const base64 = encodeLanguageCursor(cursor);

    expect(decodeLanguageCursor(base64)).toEqual(cursor);
  });

  it('throws if the input is not a valid base64 string', () => {
    expect(() => decodeLanguageCursor('invalid')).toThrow(
      'Invalid base64-encoded string',
    );
  });

  it('throws if the input decodes to an invalid language cursor object', () => {
    expect(() =>
      decodeLanguageCursor(
        encodeLanguageCursor({
          sort: {
            // @ts-expect-error - invalid sort option
            updatedAt: 'invalid',
          },
          limit: 1,
        }),
      ),
    ).toThrow('Invalid option: expected one of \\"asc\\"|\\"desc\\"');
  });

  it('round-trips a cursor with position through base64', () => {
    const cursor = languageCursorSchema.parse({
      sort: {
        updatedAt: faker.helpers.arrayElement(['asc', 'desc']),
      },
      limit: faker.number.int({ min: 1, max: 100 }),
      position:
        Math.random() > 0.5
          ? {
              id: faker.database.mongodbObjectId(),
              updatedAt: faker.date.anytime(),
              direction: faker.helpers.arrayElement(['after', 'before']),
            }
          : undefined,
    });
    const base64 = encodeLanguageCursor(cursor);
    const decoded = decodeLanguageCursor(base64);
    expect(decoded).toEqual(cursor);
    expect(encodeLanguageCursor(decoded)).toEqual(base64);
  });
});
