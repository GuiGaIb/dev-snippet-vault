import z from 'zod';
import { getNormalizedLineSchema } from './normalizedLine.js';

describe('getNormalizedLineSchema', () => {
  it('throws if minLength is greater than maxLength', () => {
    expect(() =>
      getNormalizedLineSchema({ minLength: 5, maxLength: 3 }),
    ).toThrow(z.core.$ZodError);
  });

  it('throws if maxLength is less than minLength', () => {
    expect(() =>
      getNormalizedLineSchema({ minLength: 10, maxLength: 2 }),
    ).toThrow(z.core.$ZodError);
  });

  describe('created schema', () => {
    it('trims leading and trailing whitespace', () => {
      const schema = getNormalizedLineSchema();
      expect(schema.parse('  hello  ')).toBe('hello');
    });

    it('replaces all whitespace characters with a single space', () => {
      const schema = getNormalizedLineSchema();
      expect(schema.parse('a\t\n\rb')).toBe('a b');
      expect(schema.parse('one    two')).toBe('one two');
    });

    it('applies minLength constraint', () => {
      const schema = getNormalizedLineSchema({ minLength: 3 });
      expect(() => schema.parse('ab')).toThrow(z.core.$ZodError);
      expect(() => schema.parse('  ab  ')).toThrow(z.core.$ZodError);
      expect(schema.parse('  abc  ')).toBe('abc');
    });

    it('applies maxLength constraint', () => {
      const schema = getNormalizedLineSchema({ maxLength: 3 });
      expect(schema.parse('hi')).toBe('hi');
      expect(() => schema.parse('hello')).toThrow(z.core.$ZodError);
    });

    it('returns a string', () => {
      const schema = getNormalizedLineSchema();
      expect(typeof schema.parse('x')).toBe('string');
    });

    it('applies minLength and maxLength together', () => {
      const schema = getNormalizedLineSchema({ minLength: 2, maxLength: 4 });
      expect(schema.parse('  ok  ')).toBe('ok');
      expect(() => schema.parse('x')).toThrow(z.core.$ZodError);
      expect(() => schema.parse('abcde')).toThrow(z.core.$ZodError);
    });

    it('treats whitespace-only input as empty after normalization', () => {
      const schema = getNormalizedLineSchema({ minLength: 1 });
      expect(() => schema.parse('   \t\n  ')).toThrow(z.core.$ZodError);
    });

    it('works with default options when called with no arguments', () => {
      const schema = getNormalizedLineSchema();
      expect(schema.parse('  a  ')).toBe('a');
    });
  });
});
