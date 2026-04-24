import type { TLanguage } from '@models/types/language';
import type { LanguageModel } from '../models/language.js';
import type { SnippetModel } from '../models/snippet.js';

export async function seedDb(Languages: LanguageModel, Snippets: SnippetModel) {
  await Promise.all([
    Languages.create(<Partial<TLanguage>>{
      name: 'TypeScript',
      versions: [
        {
          sortIdx: 0,
          versionId: '1.0',
        },
        {
          sortIdx: 1,
          versionId: '1.1',
        },
        {
          sortIdx: 2,
          versionId: '1.3',
        },
        {
          sortIdx: 3,
          versionId: '1.4',
        },
        {
          sortIdx: 4,
          versionId: '1.5',
        },
        {
          sortIdx: 5,
          versionId: '1.6',
        },
        {
          sortIdx: 6,
          versionId: '1.7',
        },
        {
          sortIdx: 7,
          versionId: '1.8',
        },
        {
          sortIdx: 8,
          versionId: '2.0',
        },
        {
          sortIdx: 9,
          versionId: '2.1',
        },
        {
          sortIdx: 10,
          versionId: '2.2',
        },
        {
          sortIdx: 11,
          versionId: '2.3',
        },
        {
          sortIdx: 12,
          versionId: '2.4',
        },
        {
          sortIdx: 13,
          versionId: '2.5',
        },
        {
          sortIdx: 14,
          versionId: '2.6',
        },
        {
          sortIdx: 15,
          versionId: '2.7',
        },
        {
          sortIdx: 16,
          versionId: '2.8',
        },
        {
          sortIdx: 17,
          versionId: '2.9',
        },
        {
          sortIdx: 18,
          versionId: '3.0',
        },
        {
          sortIdx: 19,
          versionId: '3.1',
        },
        {
          sortIdx: 20,
          versionId: '3.2',
        },
        {
          sortIdx: 21,
          versionId: '3.3',
        },
        {
          sortIdx: 22,
          versionId: '3.4',
        },
        {
          sortIdx: 23,
          versionId: '3.5',
        },
        {
          sortIdx: 24,
          versionId: '3.6',
        },
        {
          sortIdx: 25,
          versionId: '3.7',
        },
        {
          sortIdx: 26,
          versionId: '3.8',
        },
        {
          sortIdx: 27,
          versionId: '3.9',
        },
        {
          sortIdx: 28,
          versionId: '4.0',
        },
        {
          sortIdx: 29,
          versionId: '4.1',
        },
        {
          sortIdx: 30,
          versionId: '4.2',
        },
        {
          sortIdx: 31,
          versionId: '4.3',
        },
        {
          sortIdx: 32,
          versionId: '4.4',
        },
        {
          sortIdx: 33,
          versionId: '4.5',
        },
        {
          sortIdx: 34,
          versionId: '4.6',
        },
        {
          sortIdx: 35,
          versionId: '4.7',
        },
        {
          sortIdx: 36,
          versionId: '4.8',
        },
        {
          sortIdx: 37,
          versionId: '4.9',
        },
        {
          sortIdx: 38,
          versionId: '5.0',
        },
        {
          sortIdx: 39,
          versionId: '5.1',
        },
        {
          sortIdx: 40,
          versionId: '5.2',
        },
        {
          sortIdx: 41,
          versionId: '5.3',
        },
        {
          sortIdx: 42,
          versionId: '5.4',
        },
        {
          sortIdx: 43,
          versionId: '5.5',
        },
        {
          sortIdx: 44,
          versionId: '5.6',
        },
        {
          sortIdx: 45,
          versionId: '5.7',
        },
        {
          sortIdx: 46,
          versionId: '5.8',
        },
        {
          sortIdx: 47,
          versionId: '5.9',
        },
        {
          sortIdx: 48,
          versionId: '6.0',
        },
      ],
    }).then((ts) =>
      Snippets.create([
        {
          ...helloWorldSnippet,
          language: ts._id,
          languageVersionRange: {
            from: ts.versions[0].id,
          },
        },
        {
          ...consoleDirSnippet,
          language: ts._id,
          languageVersionRange: {
            from: ts.versions[22].id, // 3.4
          },
        },
        {
          ...dotenvSnippet,
          language: ts._id,
          languageVersionRange: {
            from: ts.versions[28].id, // 4.0
          },
          // Dependencies are defined here instead of on `dotenvSnippet` so the
          // exported fixture stays a plain object for assertions. After save,
          // Mongoose represents `dependencies` as subdocuments; including them on
          // the export would make `expect.objectContaining(dotenvSnippet)` fail
          // against loaded docs even when the data matches.
          dependencies: [
            {
              name: 'dotenv',
              version: '^10.0.0',
            },
          ],
        },
      ]),
    ),
    Languages.create(<Partial<TLanguage>>{
      name: 'HTML',
      versions: [
        {
          sortIdx: 0,
          versionId: '1.0',
        },
        {
          sortIdx: 1,
          versionId: '2.0',
        },
        {
          sortIdx: 2,
          versionId: '3.0',
        },
        {
          sortIdx: 3,
          versionId: '4.0',
        },
        {
          sortIdx: 4,
          versionId: '5.0',
        },
        {
          sortIdx: 5,
          versionId: '6.0',
        },
      ],
    }).then((html) =>
      Snippets.create([
        {
          ...verticalAlignmentSnippet,
          language: html._id,
          languageVersionRange: {
            from: html.versions[3].id, // 4.0
          },
        },
        {
          ...disableAutocompleteSnippet,
          language: html._id,
          languageVersionRange: {
            from: html.versions[3].id, // 4.0
          },
        },
      ]),
    ),
  ]);
}

export const helloWorldSnippet = {
  title: 'Hello, world!',
  description:
    'The first script ever written with a simple print statement, the OG snippet.',
  code: 'console.log("Hello, world!");',
  tags: ['hello', 'world', 'esm', 'cjs'],
};

export const consoleDirSnippet = {
  title: 'Inspect deeply nested objects with the console',
  description:
    'Tired of logging objects to the console and not being able to see the nested properties? Try this out!\n\nThe dir method is a great way to inspect deeply nested objects by printing them in a tree-like structure with an alternative print method.',
  code: 'console.dir(object, { depth: null });',
  tags: ['console', 'dir', 'inspect', 'nested', 'objects'],
};

/** Shared fields for the dotenv snippet; `dependencies` are supplied only in `seedDb` (see there). */
export const dotenvSnippet = {
  title: 'Use dotenv to load environment variables',
  description:
    'How to use dotenv to load environment variables, all in a simple snippet.',
  code: 'import dotenv from "dotenv";\n\ndotenv.config();\n\nconsole.log(process.env.EXAMPLE_VARIABLE);',
  tags: ['dotenv', 'env', 'esm'],
};

export const verticalAlignmentSnippet = {
  title: 'Vertical Alignment in td elements',
  description: 'A simple vertical alignment snippet with inline styles.',
  code: '<table>\n  <tr>\n    <td style="vertical-align: top;">Top</td>\n    <td style="vertical-align: middle;">Middle</td>\n    <td style="vertical-align: bottom;">Bottom</td>\n  </tr>\n</table>',
  tags: ['alignment', 'table', 'td', 'style', 'inline'],
};

export const disableAutocompleteSnippet = {
  title: 'Disable autocomplete in input fields',
  description: 'How to disable autocomplete in specific input fields.',
  code: '<input type="text" autocomplete="off">',
  tags: ['autocomplete', 'input', 'forms'],
};
