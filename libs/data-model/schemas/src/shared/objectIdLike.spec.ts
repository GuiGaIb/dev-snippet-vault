import { Types } from 'mongoose';
import { ZodError } from 'zod';
import { objectIdLikeSchema } from './objectIdLike.js';

describe('objectIdLike', () => {
  let validObjectId: string;

  beforeEach(() => {
    validObjectId = new Types.ObjectId().toString();
  });

  describe('objectIdLikeSchema', () => {
    it('accepts valid hex string', () => {
      expect(objectIdLikeSchema.parse(validObjectId)).toBe(validObjectId);
    });

    it('accepts object with _id.toString()', () => {
      const obj = { _id: { toString: () => validObjectId } };
      expect(objectIdLikeSchema.parse(obj)).toBe(validObjectId);
    });

    it('accepts Mongoose ObjectId objects', () => {
      const id = new Types.ObjectId();
      expect(objectIdLikeSchema.parse(id)).toBe(id.toString());
    });

    it('throws on invalid input', () => {
      expect(() => objectIdLikeSchema.parse('invalid')).toThrow(ZodError);
      expect(() => objectIdLikeSchema.parse({})).toThrow(ZodError);
      expect(() => objectIdLikeSchema.parse({ _id: 'not a function' })).toThrow(
        ZodError,
      );
    });
  });
});
