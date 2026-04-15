import { zodProp } from '@backend/zodProp';
import {
  languageSchema,
  languageVersionSchema,
} from '@models/schemas/language';
import type { TLanguage, TLanguageVersion } from '@models/types/language';
import {
  getModelForClass,
  index,
  modelOptions,
  pre,
  prop,
  queryMethod,
  type ArraySubDocumentType,
  type DocumentType,
  type ReturnModelType,
  type types,
} from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses.js';
import type { IModelOptions } from '@typegoose/typegoose/lib/types.js';
import type { Types } from 'mongoose';

export class CLanguageVersion implements TLanguageVersion {
  declare id: string;

  @zodProp(languageVersionSchema.shape.versionId, { type: String })
  versionId!: string;

  @zodProp(languageVersionSchema.shape.sortIdx, { type: Number })
  sortIdx!: number;
}

@modelOptions({
  schemaOptions: {
    collection: 'languages',
  },
})
@queryMethod(byName)
@pre<LanguageDoc>(
  'save',
  /**
   * Minimize version sort indexes before saving if the document is new or
   * the versions array is modified.
   */
  function () {
    if (this.isNew || this.isModified('versions')) {
      minimizeVersionSortIdxs(this);
    }
  },
)
@pre<LanguageDoc>(
  'save',
  /**
   * If the document is new or the versions array is modified, parse the versions
   * array with the Zod schema to enforce validity through the refinement process.
   *
   * This should be done before minimizing version sort indexes to detect
   * duplicate sort indexes before minimizing them.
   *
   * See TS' [docs](https://www.typescriptlang.org/docs/handbook/decorators.html#decorator-composition)
   * for details on decorator evaluation order.
   *
   * > As such, the following steps are performed when evaluating multiple decorators on a single declaration in TypeScript:
   * >
   * > 1. The expressions for each decorator are evaluated top-to-bottom.
   * > 2. The results are then called as functions from bottom-to-top.
   */
  function () {
    if (this.isNew || this.isModified('versions')) {
      validateVersions(this);
    }
  },
)
@index({ name: 1 }, { unique: true, name: 'name_1_unique' })
export class CLanguage extends TimeStamps implements TLanguage {
  declare id: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  @zodProp(languageSchema.shape.name, { type: String })
  name!: string;

  @prop({ type: [CLanguageVersion], _id: true })
  versions!: Types.Array<ArraySubDocumentType<CLanguageVersion>>;

  static findOneByName(
    this: LanguageModel,
    name: string,
  ): Promise<LanguageDoc | null> {
    return this.find().byName(name).findOne().exec();
  }
}

export const getLanguageModel = (options?: IModelOptions): LanguageModel =>
  getModelForClass(CLanguage, options);

export type LanguageModel = ReturnModelType<
  typeof CLanguage,
  LanguageQueryHelpers
>;
export type LanguageDoc = DocumentType<CLanguage, LanguageQueryHelpers>;

/**
 * Minimizes version sort indexes by sorting the versions array and rewriting
 * the sort indexes to a compact sequential range starting at `0`.
 */
export function minimizeVersionSortIdxs(doc: LanguageDoc) {
  const sorted = doc.versions.toSorted((a, b) => a.sortIdx - b.sortIdx);
  for (let i = 0; i < sorted.length; i++) {
    doc.versions.find((v) => v.id === sorted[i].id)?.set('sortIdx', i);
  }
}

/**
 * Validates the versions array with the Zod schema.
 */
export function validateVersions(doc: LanguageDoc) {
  languageSchema.shape.versions.parse(doc.versions);
}

function byName(
  this: types.QueryHelperThis<typeof CLanguage, LanguageQueryHelpers>,
  name: string,
) {
  return this.find({ name: name.trim() });
}

interface LanguageQueryHelpers {
  byName: types.AsQueryMethod<typeof byName>;
}
