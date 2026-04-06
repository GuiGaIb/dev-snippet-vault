import { Types } from 'mongoose';
import { objectIdHexRegex, objectIdStringSchema } from './objectIdString.js';

describe('objectIdHexRegex', () => {
  let validObjectId: string;

  beforeEach(() => {
    validObjectId = new Types.ObjectId().toString();
  });

  it('tests true for valid ObjectId strings', () => {
    expect(objectIdHexRegex.test(validObjectId)).toBe(true);
  });

  it('tests false for invalid length', () => {
    expect(objectIdHexRegex.test(validObjectId.slice(0, -1))).toBe(false); // 23 chars
    expect(objectIdHexRegex.test(validObjectId + '1')).toBe(false); // 25 chars
  });

  it('tests false for invalid characters', () => {
    const invalidHexChar = 'g';
    const invalidObjectId = validObjectId.replace(
      validObjectId[0],
      invalidHexChar,
    );
    expect(objectIdHexRegex.test(invalidObjectId)).toBe(false);
  });
});

describe('objectIdStringSchema', () => {
  let validObjectId: string;

  beforeEach(() => {
    validObjectId = new Types.ObjectId().toString();
  });

  it('parses valid ObjectId strings', () => {
    const result = objectIdStringSchema.parse(validObjectId);
    expect(result).toBe(validObjectId);
  });

  it('trims whitespace before parsing', () => {
    const paddedObjectId = ` ${validObjectId} `;
    const result = objectIdStringSchema.parse(paddedObjectId);
    expect(result).toBe(validObjectId);
  });

  it('converts to lowercase before parsing', () => {
    const uppercaseObjectId = validObjectId.toUpperCase();
    const result = objectIdStringSchema.parse(uppercaseObjectId);
    expect(result).toBe(validObjectId);
  });

  it('fails on invalid length', () => {
    expect(() =>
      objectIdStringSchema.parse(validObjectId.slice(0, -1)),
    ).toThrow();
  });

  it('fails on invalid characters', () => {
    expect(() =>
      objectIdStringSchema.parse(validObjectId.replace(validObjectId[0], 'g')),
    ).toThrow();
  });
});
