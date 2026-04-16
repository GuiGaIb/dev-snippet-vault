import { Types } from 'mongoose';
import { ZodError } from 'zod';
import {
  snippetSchema as _snippetSchema,
  snippetDependencySchema,
} from './snippet.js';

describe('snippet schemas', () => {
  const snippetSchema = _snippetSchema.omit({
    createdAt: true,
    updatedAt: true,
  });

  describe('snippetDependencySchema', () => {
    it('accepts a dependency with name and version', () => {
      expect(
        snippetDependencySchema.parse({
          name: '  lodash  ',
          version: '  ^4.17  ',
        }),
      ).toEqual({ name: 'lodash', version: '^4.17' });
    });

    it('accepts a dependency without a version', () => {
      expect(snippetDependencySchema.parse({ name: 'lodash' })).toEqual({
        name: 'lodash',
      });
    });

    it('rejects an empty name', () => {
      expect(() => snippetDependencySchema.parse({ name: '   ' })).toThrow(
        ZodError,
      );
    });

    it('rejects an empty version when present', () => {
      expect(() =>
        snippetDependencySchema.parse({ name: 'lodash', version: '   ' }),
      ).toThrow(ZodError);
    });

    it('accepts dependency fields at the maximum allowed length', () => {
      expect(
        snippetDependencySchema.parse({
          name: 'n'.repeat(256),
          version: 'v'.repeat(256),
        }),
      ).toEqual({
        name: 'n'.repeat(256),
        version: 'v'.repeat(256),
      });
    });

    it('rejects dependency fields that exceed the maximum allowed length', () => {
      expect(() =>
        snippetDependencySchema.parse({
          name: 'n'.repeat(257),
        }),
      ).toThrow(ZodError);

      expect(() =>
        snippetDependencySchema.parse({
          name: 'lodash',
          version: 'v'.repeat(257),
        }),
      ).toThrow(ZodError);
    });
  });

  describe('snippetSchema', () => {
    let validId: string;

    beforeEach(() => {
      validId = new Types.ObjectId().toString();
    });

    function validSnippet(overrides: Record<string, unknown> = {}) {
      return {
        id: validId,
        title: 'Hello World',
        description: 'A valid description',
        code: 'console.log("hello")',
        language: validId,
        dependencies: [],
        tags: [],
        ...overrides,
      };
    }

    it('accepts a minimal valid snippet', () => {
      const result = snippetSchema.parse(validSnippet());
      expect(result).toEqual(
        expect.objectContaining({
          id: validId,
          title: 'Hello World',
          code: 'console.log("hello")',
          language: validId,
          dependencies: [],
          tags: [],
        }),
      );
    });

    it('accepts objectId-like objects for id and language and transforms them to strings', () => {
      const id = new Types.ObjectId();
      const language = new Types.ObjectId();

      const result = snippetSchema.parse(
        validSnippet({
          id,
          language,
        }),
      );

      expect(result.id).toBe(id.toString());
      expect(result.language).toBe(language.toString());
    });

    it('normalizes title whitespace', () => {
      const result = snippetSchema.parse(
        validSnippet({ title: '  Hello   World  ' }),
      );
      expect(result.title).toBe('Hello World');
    });

    it('accepts a title at the maximum allowed length and rejects one beyond it', () => {
      expect(
        snippetSchema.parse(validSnippet({ title: 't'.repeat(128) })).title,
      ).toBe('t'.repeat(128));

      expect(() =>
        snippetSchema.parse(validSnippet({ title: 't'.repeat(129) })),
      ).toThrow(ZodError);
    });

    it('normalizes multiline code content', () => {
      const result = snippetSchema.parse(
        validSnippet({ code: '  const  x = 1;\r\n  return  x;' }),
      );
      expect(result.code).toBe('const x = 1;\n  return x;');
    });

    it('preserves indentation and collapses excessive blank lines in multiline fields', () => {
      const result = snippetSchema.parse(
        validSnippet({
          description: '  first\n\n\n\n    second',
          code: '\tconst  x = 1;\n\n\n\n\treturn  x;',
        }),
      );

      expect(result.description).toBe('first\n\n    second');
      expect(result.code).toBe('const x = 1;\n\n  return x;');
    });

    it('accepts an optional description and normalizes it', () => {
      const result = snippetSchema.parse(
        validSnippet({ description: '  A   cool   snippet  ' }),
      );
      expect(result.description).toBe('A cool snippet');
    });

    it('rejects description when not provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { description, ...snippetWithoutDescription } = validSnippet();
      expect(() => snippetSchema.parse(snippetWithoutDescription)).toThrow(
        ZodError,
      );
    });

    it('rejects a description shorter than 5 characters after normalization', () => {
      expect(() =>
        snippetSchema.parse(validSnippet({ description: '  12  ' })),
      ).toThrow(ZodError);
    });

    it('accepts a description of exactly 5 characters', () => {
      const result = snippetSchema.parse(
        validSnippet({ description: '12345' }),
      );
      expect(result.description).toBe('12345');
    });

    it('accepts description and code at the maximum allowed length', () => {
      expect(
        snippetSchema.parse(validSnippet({ description: 'd'.repeat(1024) }))
          .description,
      ).toBe('d'.repeat(1024));

      expect(
        snippetSchema.parse(validSnippet({ code: 'c'.repeat(65536) })).code,
      ).toBe('c'.repeat(65536));
    });

    it('rejects description and code that exceed the maximum allowed length after preprocessing', () => {
      expect(() =>
        snippetSchema.parse(validSnippet({ description: 'd'.repeat(1025) })),
      ).toThrow(ZodError);

      expect(() =>
        snippetSchema.parse(validSnippet({ code: 'c'.repeat(65537) })),
      ).toThrow(ZodError);
    });

    it('rejects empty required fields', () => {
      expect(() => snippetSchema.parse(validSnippet({ title: '   ' }))).toThrow(
        ZodError,
      );
      expect(() => snippetSchema.parse(validSnippet({ code: '   ' }))).toThrow(
        ZodError,
      );
    });

    it('rejects invalid id and language references', () => {
      expect(() => snippetSchema.parse(validSnippet({ id: 'bad' }))).toThrow(
        ZodError,
      );
      expect(() =>
        snippetSchema.parse(validSnippet({ language: 'bad' })),
      ).toThrow(ZodError);
    });

    describe('dependencies', () => {
      it('accepts a list of dependencies', () => {
        const result = snippetSchema.parse(
          validSnippet({
            dependencies: [
              { name: ' lodash ', version: ' ^4.17 ' },
              { name: ' express ' },
            ],
          }),
        );
        expect(result.dependencies).toEqual([
          { name: 'lodash', version: '^4.17' },
          { name: 'express' },
        ]);
      });

      it('rejects an invalid dependency entry', () => {
        expect(() =>
          snippetSchema.parse(validSnippet({ dependencies: [{ name: '  ' }] })),
        ).toThrow(ZodError);
      });

      it('preserves dependency order', () => {
        const result = snippetSchema.parse(
          validSnippet({
            dependencies: [
              { name: 'react' },
              { name: 'vite' },
              { name: 'typescript' },
            ],
          }),
        );

        expect(result.dependencies.map(({ name }) => name)).toEqual([
          'react',
          'vite',
          'typescript',
        ]);
      });
    });

    describe('tags', () => {
      it('normalizes, lowercases, and deduplicates tags', () => {
        const result = snippetSchema.parse(
          validSnippet({ tags: ['  TypeScript  ', 'typescript', '  React  '] }),
        );
        expect(result.tags).toEqual(['typescript', 'react']);
      });

      it('preserves order of first occurrence during deduplication', () => {
        const result = snippetSchema.parse(
          validSnippet({ tags: ['React', 'Vue', 'react'] }),
        );
        expect(result.tags).toEqual(['react', 'vue']);
      });

      it('rejects empty tag strings', () => {
        expect(() =>
          snippetSchema.parse(validSnippet({ tags: ['valid', '   '] })),
        ).toThrow(ZodError);
      });

      it('deduplicates tags after normalization and case folding', () => {
        const result = snippetSchema.parse(
          validSnippet({
            tags: ['  Node JS  ', 'node js', 'NODE   JS', 'React'],
          }),
        );

        expect(result.tags).toEqual(['node js', 'react']);
      });

      it('accepts tags at the maximum allowed length and rejects tags beyond it', () => {
        expect(
          snippetSchema.parse(validSnippet({ tags: ['t'.repeat(64)] })).tags,
        ).toEqual(['t'.repeat(64)]);

        expect(() =>
          snippetSchema.parse(validSnippet({ tags: ['t'.repeat(65)] })),
        ).toThrow(ZodError);
      });
    });
  });
});
