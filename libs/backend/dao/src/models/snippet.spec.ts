import { faker } from '@faker-js/faker';
import type { TLanguageVersion } from '@models/types/language';
import { setupTestServer } from '@tools/mongodb-test-setup';
import { isDocument } from '@typegoose/typegoose';
import { Types } from 'mongoose';
import {
  consoleDirSnippet,
  dotenvSnippet,
  helloWorldSnippet,
  seedDb,
  verticalAlignmentSnippet,
} from '../utils/seedDb.js';
import {
  getLanguageModel,
  type LanguageDoc,
  type LanguageModel,
} from './language.js';
import {
  CSnippetLanguageVersionRange,
  getSnippetModel,
  type SnippetDoc,
  type SnippetModel,
} from './snippet.js';

describe('Snippet model', () => {
  setupTestServer();

  let Languages: LanguageModel;
  let Snippets: SnippetModel;

  beforeAll(async () => {
    Languages = getLanguageModel({
      schemaOptions: {
        autoCreate: true,
        autoIndex: true,
      },
    });
    Snippets = getSnippetModel({
      schemaOptions: {
        autoCreate: true,
        autoIndex: true,
      },
    });

    await Promise.all([Languages.init(), Snippets.init()]);
  });

  describe('indexes', () => {
    it('has a compound text index named "title_description_text_index" with weights and language_override', async () => {
      await expect(Snippets.collection.indexes()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'title_description_text_index',
            weights: {
              title: 5,
              description: 1,
            },
            language_override: 'lang',
          }),
        ]),
      );
    });
  });

  describe('static methods', () => {
    describe('searchText', () => {
      beforeAll(async () => {
        await seedDb(Languages, Snippets);

        return async () =>
          await Promise.all([
            Languages.deleteMany({}),
            Snippets.deleteMany({}),
          ]);
      });

      it('returns snippets that match the search text', async () => {
        /*
          This should return three snippets with the dotenv snippet at the top.
          The word 'snippet' should match all snippets except the console.dir and
          the disable autocomplete snippet as they do not contain the word
          'snippet'.
        */
        let snippets = await Snippets.searchText(
          'dotenv variables snippet',
        ).exec();

        expect(snippets).toHaveLength(3);
        expect(snippets[0]).toMatchObject(dotenvSnippet);
        expect(snippets).toEqual(
          expect.arrayContaining([
            expect.objectContaining(dotenvSnippet),
            expect.objectContaining(verticalAlignmentSnippet),
            expect.objectContaining(helloWorldSnippet),
          ]),
        );

        /*
          This should only return the hello world snippet, as it is the only
          snippet that contains the word 'world'.
        */
        snippets = await Snippets.searchText('world');
        expect(snippets).toHaveLength(1);
        expect(snippets[0]).toMatchObject(helloWorldSnippet);

        /*
          This should return the hello world and the console.dir snippets, as they
          both contain the word 'print'.
        */
        snippets = await Snippets.searchText('print');
        expect(snippets).toHaveLength(2);
        expect(snippets).toEqual(
          expect.arrayContaining([
            expect.objectContaining(helloWorldSnippet),
            expect.objectContaining(consoleDirSnippet),
          ]),
        );
      });
    });
  });

  describe('references', () => {
    beforeEach(async () => {
      await cleanup();
    });

    it('references language documents in the language path', async () => {
      const [lang, snip] = await createMockLanguageAndSnippet();

      await snip.populate('language');

      expect(isDocument(snip.language)).toBe(true);
      expect(snip.language.toJSON()).toEqual(lang.toJSON());
    });

    describe('pre-validate hook', () => {
      it('throws an error if the language population fails', async () => {
        const [, snip] = await createMockLanguageAndSnippet();
        snip.set('language', new Types.ObjectId());

        await expect(snip.validate()).rejects.toThrow(
          '`language` path population failed',
        );
      });

      it('throws an error if the language version range is invalid', async () => {
        const lang = await Languages.create({
          name: faker.lorem.word(),
          versions: Array.from({ length: 3 }, (_, i) => ({
            sortIdx: i,
            versionId: `version-${i}`,
          })),
        });
        const snip = await Snippets.create({
          title: faker.lorem.sentence({ min: 3, max: 6 }),
          description: faker.lorem.paragraphs({ min: 1, max: 2 }),
          code: faker.lorem.paragraphs({ min: 1, max: 2 }),
          language: lang._id,
          languageVersionRange: {
            from: lang.versions[0]._id,
            to: lang.versions[1]._id,
          },
          dependencies: Array.from(
            { length: faker.number.int({ min: 0, max: 5 }) },
            () => ({
              name: faker.lorem.word(),
              version: faker.lorem.word(),
            }),
          ),
          tags: Array.from(
            { length: faker.number.int({ min: 0, max: 5 }) },
            () => faker.lorem.word(),
          ),
        });
        let otherOid = new Types.ObjectId();

        snip.set('languageVersionRange.from', otherOid);
        await expect(async () => snip.validate()).rejects.toThrow(
          `\`from\` version ${otherOid} not found in language ${lang.id}`,
        );

        otherOid = new Types.ObjectId();
        snip.set('languageVersionRange.from', lang.versions[0]._id);
        snip.set('languageVersionRange.to', otherOid);
        await expect(async () => snip.validate()).rejects.toThrow(
          `\`to\` version ${otherOid} not found in language ${lang.id}`,
        );

        snip.set('languageVersionRange.from', lang.versions[1]._id);
        snip.set('languageVersionRange.to', lang.versions[0]._id);
        await expect(async () => snip.validate()).rejects.toThrow(
          `\`from\` version ${lang.versions[1].sortIdx} is greater than \`to\` version ${lang.versions[0].sortIdx}`,
        );
      });
    });
  });

  function createMockLanguage() {
    return Languages.create({
      name: faker.lorem.word(),
      versions: Array.from(
        { length: faker.number.int({ min: 0, max: 5 }) },
        (_, i) =>
          <TLanguageVersion>{
            sortIdx: i,
            versionId: `version-${i}`,
          },
      ),
    });
  }

  function createMockSnippet(language: LanguageDoc) {
    return Snippets.create({
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.paragraphs({ min: 1, max: 2 }),
      code: faker.lorem.paragraphs({ min: 1, max: 2 }),
      language: language._id,
      languageVersionRange: getRandomLanguageVersionRange(),
      dependencies: Array.from(
        { length: faker.number.int({ min: 0, max: 5 }) },
        () => ({
          name: faker.lorem.word(),
          version: faker.lorem.word(),
        }),
      ),
      tags: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () =>
        faker.lorem.word(),
      ),
    });

    function getRandomLanguageVersionRange():
      | CSnippetLanguageVersionRange
      | undefined {
      if (language.versions.length === 0) {
        return undefined;
      }
      const fromIdx = faker.number.int({
        min: 0,
        max: language.versions.length - 1,
      });

      return {
        from: language.versions[fromIdx]._id,
        to:
          fromIdx <= language.versions.length - 2
            ? language.versions[fromIdx + 1]._id
            : undefined,
      };
    }
  }

  async function createMockLanguageAndSnippet(): Promise<
    [LanguageDoc, SnippetDoc]
  > {
    const lang = await createMockLanguage();
    const snip = await createMockSnippet(lang);
    return [lang, snip];
  }

  async function cleanup() {
    await Promise.all([Languages.deleteMany({}), Snippets.deleteMany({})]);
  }
});
