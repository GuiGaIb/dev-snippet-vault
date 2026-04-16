import { zodProp } from '@backend/zodProp';
import {
  snippetDependencySchema,
  snippetLanguageVersionRangeSchema,
  snippetSchema,
  type TSnippetInput,
} from '@models/schemas/snippet';
import type {
  TSnippet,
  TSnippetDependency,
  TSnippetLanguageVersionRange,
} from '@models/types/snippet';
import {
  getModelForClass,
  index,
  isDocument,
  modelOptions,
  pre,
  prop,
  PropType,
  queryMethod,
  type ArraySubDocumentType,
  type DocumentType,
  type Ref,
  type ReturnModelType,
  type SubDocumentType,
} from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses.js';
import type { IModelOptions } from '@typegoose/typegoose/lib/types.js';
import type { Types } from 'mongoose';
import { CLanguage } from './language.js';
import {
  byLanguage,
  byLanguageVersionRange,
  byTags,
  type SnippetQueryHelpers,
} from './snippet.queryHelpers.js';

export class CSnippetDependency implements TSnippetDependency {
  @zodProp(snippetDependencySchema.shape.name, { type: String })
  name!: TSnippetDependency['name'];

  @zodProp(snippetDependencySchema.shape.version, { type: String })
  version?: TSnippetDependency['version'];
}

export class CSnippetLanguageVersionRange implements TSnippetLanguageVersionRange {
  @zodProp(snippetLanguageVersionRangeSchema.shape.from, { type: String })
  from!: TSnippetLanguageVersionRange['from'];

  @zodProp(snippetLanguageVersionRangeSchema.shape.to, { type: String })
  to?: TSnippetLanguageVersionRange['to'];
}

@modelOptions({
  schemaOptions: {
    collection: 'snippets',
  },
})
@queryMethod(byLanguage)
@queryMethod(byTags)
@queryMethod(byLanguageVersionRange)
@index(
  /**
   * Compound text index on the title and description fields with custom weights.
   */
  { title: 'text', description: 'text' },
  {
    name: 'title_description_text_index',
    /**
     * Weights for the text index.
     *
     * Make title matches 5x more important than description matches.
     */
    weights: {
      title: 5,
      description: 1,
    },
    language_override: 'lang',
  },
)
@pre<SnippetDoc>('validate', async function () {
  await this.populate('language');
  if (!isDocument(this.language)) {
    throw new Error('`language` path population failed');
  }
  if (this.languageVersionRange) {
    const fromVersion = this.language.versions.find(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (v) => v.id === this.languageVersionRange!.from,
    );
    if (!fromVersion) {
      throw new Error(
        `\`from\` version ${this.languageVersionRange.from} not found in language ${this.language.id}`,
      );
    }
    if (this.languageVersionRange.to) {
      const toVersion = this.language.versions.find(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (v) => v.id === this.languageVersionRange!.to,
      );
      if (!toVersion) {
        throw new Error(
          `\`to\` version ${this.languageVersionRange.to} not found in language ${this.language.id}`,
        );
      }
      if (fromVersion.sortIdx > toVersion.sortIdx) {
        throw new Error(
          `\`from\` version ${fromVersion.sortIdx} is greater than \`to\` version ${toVersion.sortIdx}`,
        );
      }
    }
  }
})
export class CSnippet extends TimeStamps implements TSnippetInput {
  declare id: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  @zodProp(snippetSchema.shape.title, { type: String })
  title!: TSnippet['title'];

  @zodProp(snippetSchema.shape.description, { type: String })
  description!: TSnippet['description'];

  @prop({ ref: () => CLanguage, required: true })
  language!: Ref<CLanguage>;

  @prop({ type: () => CSnippetLanguageVersionRange, _id: false })
  languageVersionRange?: SubDocumentType<CSnippetLanguageVersionRange>;

  @zodProp(snippetSchema.shape.code, { type: String })
  code!: TSnippet['code'];

  @prop({ type: () => [CSnippetDependency], _id: false })
  dependencies!: Types.Array<ArraySubDocumentType<CSnippetDependency>>;

  @zodProp(snippetSchema.shape.tags, { type: [String] }, PropType.ARRAY)
  tags!: TSnippet['tags'];

  static searchText(this: SnippetModel, search: string) {
    return this.find({
      $text: {
        $search: search,
      },
    })
      .select({
        score: {
          $meta: 'textScore',
        },
      })
      .sort({ score: { $meta: 'textScore' } });
  }
}

export const getSnippetModel = (options?: IModelOptions): SnippetModel =>
  getModelForClass(CSnippet, options);

export type SnippetModel = ReturnModelType<
  typeof CSnippet,
  SnippetQueryHelpers
>;
export type SnippetDoc = DocumentType<CSnippet, SnippetQueryHelpers>;
