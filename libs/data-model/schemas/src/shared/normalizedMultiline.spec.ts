import { ZodError } from 'zod';
import { getNormalizedMultilineSchema } from './normalizedMultiline.js';

describe('getNormalizedMultilineSchema', () => {
  it('throws if minLength is greater than maxLength', () => {
    expect(() =>
      getNormalizedMultilineSchema({ minLength: 5, maxLength: 3 }),
    ).toThrow();
  });

  it('throws if maxLength is less than minLength', () => {
    expect(() =>
      getNormalizedMultilineSchema({ minLength: 10, maxLength: 2 }),
    ).toThrow();
  });

  describe('created schema preprocessing', () => {
    it('trims outer whitespace from the full string before line normalization', () => {
      const schema = getNormalizedMultilineSchema({ indentWidth: 2 });
      expect(schema.parse('  hello    world')).toBe('hello world');
      expect(schema.parse('\t\tfoo \t bar')).toBe('foo bar');
      expect(schema.parse('\n  hello\n')).toBe('hello');
    });

    it('treats whitespace-only input as empty after outer trimming', () => {
      const schema = getNormalizedMultilineSchema();
      expect(schema.parse('   \n\t\t\n  \t  ')).toBe('');
    });

    it('floors indentation to a multiple of indentWidth on non-first lines (default 2)', () => {
      const schema = getNormalizedMultilineSchema();
      expect(schema.parse('x\n a')).toBe('x\na'); // 1 -> 0
      expect(schema.parse('x\n  b')).toBe('x\n  b'); // 2 -> 2
      expect(schema.parse('x\n   c')).toBe('x\n  c'); // 3 -> 2
      expect(schema.parse('x\n    d')).toBe('x\n    d'); // 4 -> 4
      expect(schema.parse('x\n     e')).toBe('x\n    e'); // 5 -> 4
    });

    it('handles indentWidth of 3 or 4 correctly', () => {
      const schema3 = getNormalizedMultilineSchema({ indentWidth: 3 });
      expect(schema3.parse('x\n  a')).toBe('x\na'); // 2 -> 0
      expect(schema3.parse('x\n   b')).toBe('x\n   b'); // 3 -> 3
      expect(schema3.parse('x\n    c')).toBe('x\n   c'); // 4 -> 3
      expect(schema3.parse('x\n      d')).toBe('x\n      d'); // 6 -> 6

      const schema4 = getNormalizedMultilineSchema({ indentWidth: 4 });
      expect(schema4.parse('x\n   a')).toBe('x\na'); // 3 -> 0
      expect(schema4.parse('x\n    b')).toBe('x\n    b'); // 4 -> 4
      expect(schema4.parse('x\n     c')).toBe('x\n    c'); // 5 -> 4
    });

    it('expands leading tabs to indentWidth spaces before flooring on non-first lines', () => {
      const schema2 = getNormalizedMultilineSchema({ indentWidth: 2 });
      expect(schema2.parse('x\n\ta')).toBe('x\n  a'); // 1 tab -> 2 spaces
      expect(schema2.parse('x\n\t\tb')).toBe('x\n    b'); // 2 tabs -> 4 spaces
      expect(schema2.parse('x\n\t c')).toBe('x\n  c'); // 1 tab + 1 space = 3 spaces -> 2 spaces
      expect(schema2.parse('x\n\t  d')).toBe('x\n    d'); // 1 tab + 2 spaces = 4 spaces -> 4 spaces

      const schema4 = getNormalizedMultilineSchema({ indentWidth: 4 });
      expect(schema4.parse('x\n\ta')).toBe('x\n    a'); // 1 tab -> 4 spaces
      expect(schema4.parse('x\n\t b')).toBe('x\n    b'); // 1 tab + 1 space = 5 spaces -> 4 spaces
    });

    it('normalizes carriage returns and collapses newlines to maxConsecutiveNewlines (default 2)', () => {
      const schema = getNormalizedMultilineSchema();
      // \r\n to \n
      expect(schema.parse('a\r\nb')).toBe('a\nb');
      // Collapses > 2 newlines
      expect(schema.parse('a\n\n\n\nb')).toBe('a\n\nb');
      expect(schema.parse('a\n\n\nb')).toBe('a\n\nb');
      // Keeps <= 2 newlines
      expect(schema.parse('a\n\nb')).toBe('a\n\nb');
      expect(schema.parse('a\nb')).toBe('a\nb');
    });

    it('respects a custom maxConsecutiveNewlines', () => {
      const schema1 = getNormalizedMultilineSchema({
        maxConsecutiveNewlines: 1,
      });
      expect(schema1.parse('a\n\n\nb')).toBe('a\nb');
      expect(schema1.parse('a\n\nb')).toBe('a\nb');
      expect(schema1.parse('a\nb')).toBe('a\nb');

      const schema3 = getNormalizedMultilineSchema({
        maxConsecutiveNewlines: 3,
      });
      expect(schema3.parse('a\n\n\n\n\nb')).toBe('a\n\n\nb');
      expect(schema3.parse('a\n\n\nb')).toBe('a\n\n\nb');
    });

    it('trims the first line fully and still preserves indentation on later lines', () => {
      const schema = getNormalizedMultilineSchema();
      expect(schema.parse('  a  ')).toBe('a');
      expect(schema.parse(' a\n    b \t ')).toBe('a\n    b');
    });
  });

  describe('created schema validation', () => {
    it('applies minLength constraint to the preprocessed string', () => {
      const schema = getNormalizedMultilineSchema({ minLength: 5 });
      // "a" has length 1 after outer trimming, throws
      expect(() => schema.parse('  a')).toThrow(ZodError);
      // "abcde" has length 5, passes
      expect(schema.parse('  abcde')).toBe('abcde');
      // newline-only content after trimming is empty, so it also fails
      expect(() => schema.parse('   \n\t  ')).toThrow(ZodError);
    });

    it('applies maxLength constraint to the preprocessed string', () => {
      const schema = getNormalizedMultilineSchema({ maxLength: 5 });
      // "abcde" has length 5, passes
      expect(schema.parse('  abcde')).toBe('abcde');
      // "abcdef" has length 6 after trimming/normalization, throws
      expect(() => schema.parse('  abcdef')).toThrow(ZodError);
      // second-line indentation still counts after preprocessing
      expect(() => schema.parse('x\n    abcde')).toThrow(ZodError);
    });

    it('returns a string', () => {
      const schema = getNormalizedMultilineSchema();
      expect(typeof schema.parse('x')).toBe('string');
    });

    it('works with default options when called with no arguments', () => {
      const schema = getNormalizedMultilineSchema();
      // outer trim removes the first-line indent before per-line normalization
      expect(schema.parse(' \ta ')).toBe('a');
    });

    it('requires meaningful content for minLength instead of allowing only blank lines', () => {
      const schema = getNormalizedMultilineSchema({ minLength: 1 });
      expect(() => schema.parse('\n')).toThrow(ZodError);
      expect(() => schema.parse('   \n\t  ')).toThrow(ZodError);
      expect(schema.parse('\n  x\n')).toBe('x');
    });
  });
});
