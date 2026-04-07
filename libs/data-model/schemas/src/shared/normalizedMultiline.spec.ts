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
    it('collapses inner whitespace but preserves spaces and tabs in leading indent', () => {
      const schema = getNormalizedMultilineSchema({ indentWidth: 2 });
      expect(schema.parse('  hello    world')).toBe('  hello world');
      expect(schema.parse('\t\tfoo \t bar')).toBe('    foo bar');
    });

    it('treats blank lines containing spaces or tabs as empty strings', () => {
      const schema = getNormalizedMultilineSchema();
      expect(schema.parse('   \n\t\t\n  \t  ')).toBe('\n\n');
    });

    it('floors leading indentation to a multiple of indentWidth (default 2)', () => {
      const schema = getNormalizedMultilineSchema();
      expect(schema.parse(' a')).toBe('a'); // 1 -> 0
      expect(schema.parse('  b')).toBe('  b'); // 2 -> 2
      expect(schema.parse('   c')).toBe('  c'); // 3 -> 2
      expect(schema.parse('    d')).toBe('    d'); // 4 -> 4
      expect(schema.parse('     e')).toBe('    e'); // 5 -> 4
    });

    it('handles indentWidth of 3 or 4 correctly', () => {
      const schema3 = getNormalizedMultilineSchema({ indentWidth: 3 });
      expect(schema3.parse('  a')).toBe('a'); // 2 -> 0
      expect(schema3.parse('   b')).toBe('   b'); // 3 -> 3
      expect(schema3.parse('    c')).toBe('   c'); // 4 -> 3
      expect(schema3.parse('      d')).toBe('      d'); // 6 -> 6

      const schema4 = getNormalizedMultilineSchema({ indentWidth: 4 });
      expect(schema4.parse('   a')).toBe('a'); // 3 -> 0
      expect(schema4.parse('    b')).toBe('    b'); // 4 -> 4
      expect(schema4.parse('     c')).toBe('    c'); // 5 -> 4
    });

    it('expands leading tabs to indentWidth spaces before flooring', () => {
      const schema2 = getNormalizedMultilineSchema({ indentWidth: 2 });
      expect(schema2.parse('\ta')).toBe('  a'); // 1 tab -> 2 spaces
      expect(schema2.parse('\t\tb')).toBe('    b'); // 2 tabs -> 4 spaces
      expect(schema2.parse('\t c')).toBe('  c'); // 1 tab + 1 space = 3 spaces -> 2 spaces
      expect(schema2.parse('\t  d')).toBe('    d'); // 1 tab + 2 spaces = 4 spaces -> 4 spaces

      const schema4 = getNormalizedMultilineSchema({ indentWidth: 4 });
      expect(schema4.parse('\ta')).toBe('    a'); // 1 tab -> 4 spaces
      expect(schema4.parse('\t b')).toBe('    b'); // 1 tab + 1 space = 5 spaces -> 4 spaces
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

    it('trims leading and trailing spaces from the inner content while keeping leading indent', () => {
      const schema = getNormalizedMultilineSchema();
      expect(schema.parse('  a  ')).toBe('  a');
      expect(schema.parse('    a \t ')).toBe('    a');
    });
  });

  describe('created schema validation', () => {
    it('applies minLength constraint to the preprocessed string', () => {
      const schema = getNormalizedMultilineSchema({ minLength: 5 });
      // "  a" has length 3, throws
      expect(() => schema.parse('  a')).toThrow(ZodError);
      // "  abc" has length 5, passes
      expect(schema.parse('  abc')).toBe('  abc');
      // " \ta" has width 3 -> floored 2 -> "  a" (length 3), throws
      expect(() => schema.parse(' \ta')).toThrow(ZodError);
    });

    it('applies maxLength constraint to the preprocessed string', () => {
      const schema = getNormalizedMultilineSchema({ maxLength: 5 });
      // "  abc" has length 5, passes
      expect(schema.parse('  abc')).toBe('  abc');
      // "  abcd" has length 6, throws
      expect(() => schema.parse('  abcd')).toThrow(ZodError);
      // "\t  abcd  " has length 6 after normalization ("  abcd"), throws
      expect(() => schema.parse('\t  abcd  ')).toThrow(ZodError);
    });

    it('returns a string', () => {
      const schema = getNormalizedMultilineSchema();
      expect(typeof schema.parse('x')).toBe('string');
    });

    it('works with default options when called with no arguments', () => {
      const schema = getNormalizedMultilineSchema();
      // " \ta " (space, tab) -> width 3 -> floored 2 -> "  a"
      expect(schema.parse(' \ta ')).toBe('  a');
    });
  });
});
