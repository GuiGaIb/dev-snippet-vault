import type { TCreateLanguageInput } from '@models/schemas/language';
import type { TLanguage } from '@models/types/language';
import type { PagedResponse } from '@models/types/restApi';
import type { SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import {
  getLanguageModel,
  type LanguageDoc,
  type LanguageModel,
} from '../models/language.js';
import {
  languageCursorCodec,
  languageCursorSchema,
  type LanguageCursor,
  type LanguageCursorInput,
} from '../utils/languageCursorCodec.js';

export class LanguageService implements ILanguageService {
  static async getInstance(options: LanguageServiceOptions = {}) {
    const Languages =
      options.Languages ?? getLanguageModel(options.LanguageModelOptions);

    if (options.initializeModels === true) {
      await Languages.init();
    }

    return new LanguageService(Languages);
  }

  static encodeLanguageCursor = languageCursorCodec.decode;

  static decodeLanguageCursor = languageCursorCodec.encode;

  protected constructor(public readonly Languages: LanguageModel) {}

  /**
   * Builds a Mongoose query for languages using keyset pagination over
   * `(updatedAt, _id)` per the decoded cursor.
   */
  buildLanguagesQuery(cursor: LanguageCursor) {
    const sortAsc = cursor.sort.updatedAt === 'asc';
    const direction = cursor.position?.direction;
    const filter: Record<string, unknown> = cursor.position
      ? keysetFilterForSort(
          sortAsc,
          {
            updatedAt: cursor.position.updatedAt,
            id: cursor.position.id,
          },
          cursor.position.direction,
        )
      : {};
    const sort = getMongoSort(sortAsc, direction);
    return this.Languages.find(filter)
      .sort(sort)
      .limit(cursor.limit + 1);

    function keysetFilterForSort(
      sortAsc: boolean,
      position: { updatedAt: Date; id: string },
      direction: 'after' | 'before',
    ): Record<string, unknown> {
      const oid = new Types.ObjectId(position.id);
      const u = position.updatedAt;

      if (direction === 'after') {
        if (sortAsc) {
          return {
            $or: [
              { updatedAt: { $gt: u } },
              { updatedAt: u, _id: { $gt: oid } },
            ],
          };
        }
        return {
          $or: [{ updatedAt: { $lt: u } }, { updatedAt: u, _id: { $lt: oid } }],
        };
      }

      if (sortAsc) {
        return {
          $or: [{ updatedAt: { $lt: u } }, { updatedAt: u, _id: { $lt: oid } }],
        };
      }
      return {
        $or: [{ updatedAt: { $gt: u } }, { updatedAt: u, _id: { $gt: oid } }],
      };
    }

    function getMongoSort(
      sortAsc: boolean,
      direction: 'after' | 'before' | undefined,
    ): { updatedAt: SortOrder; _id: SortOrder } {
      const invert = direction === 'before';
      const effectiveAsc = sortAsc !== invert;
      const order: SortOrder = effectiveAsc ? 1 : -1;
      return { updatedAt: order, _id: order };
    }
  }

  /**
   * Lists languages with cursor-based pagination.
   *
   * @param cursor - Opaque base64 cursor from a prior response, or a plain
   *   cursor object (e.g. first page with sort/limit only).
   */
  async listLanguages(
    cursor?: string | LanguageCursorInput,
  ): Promise<PagedResponse<TLanguage>> {
    const decoded = this.normalizeLanguageCursor(cursor);
    const query = this.buildLanguagesQuery(decoded);
    let docs = await query.exec();
    const hasMore = docs.length > decoded.limit;
    if (hasMore) {
      docs = docs.slice(0, decoded.limit);
    }
    if (decoded.position?.direction === 'before') {
      docs.reverse();
    }

    const incoming = decoded.position;
    const emitBefore =
      docs.length > 0 &&
      (incoming?.direction === 'after' ||
        (incoming?.direction === 'before' && hasMore));
    const emitAfter =
      docs.length > 0 && (hasMore || incoming?.direction === 'before');

    const sort = decoded.sort;
    const limit = decoded.limit;

    const pageCursor: NonNullable<PagedResponse<LanguageDoc>['cursor']> = {};
    if (emitBefore && docs[0]) {
      const first = docs[0];
      pageCursor.before = LanguageService.encodeLanguageCursor({
        sort,
        limit,
        position: {
          updatedAt: first.updatedAt,
          id: first.id,
          direction: 'before',
        },
      });
    }
    if (emitAfter && docs.length > 0) {
      const last = docs[docs.length - 1];
      pageCursor.after = LanguageService.encodeLanguageCursor({
        sort,
        limit,
        position: {
          updatedAt: last.updatedAt,
          id: last.id,
          direction: 'after',
        },
      });
    }

    const hasCursorKeys =
      pageCursor.before !== undefined || pageCursor.after !== undefined;

    return {
      data: docs.map((doc) => doc.forClient()),
      ...(hasCursorKeys ? { cursor: pageCursor } : {}),
    };
  }

  private normalizeLanguageCursor(
    cursor?: string | LanguageCursorInput,
  ): LanguageCursor {
    if (cursor === undefined || cursor === null) {
      return languageCursorSchema.parse({});
    }
    if (typeof cursor === 'string') {
      return LanguageService.decodeLanguageCursor(cursor) as LanguageCursor;
    }
    return languageCursorSchema.parse(cursor);
  }

  createLanguage(data: TCreateLanguageInput): Promise<LanguageDoc> {
    return this.Languages.create(data);
  }

  getLanguageById(id: string | Types.ObjectId): Promise<LanguageDoc | null> {
    return this.Languages.findById(id).exec();
  }

  getLanguageByName(name: string): Promise<LanguageDoc | null> {
    return this.Languages.findOneByName(name);
  }
}

/**
 * Options to initialize a {@link LanguageService} instance.
 *
 * **Language model initialization**
 *
 * The order of precedence to set the language model for the service is:
 *
 * 1. `Languages` option is provided
 * 2. `LanguageModelOptions` option is provided
 * 3. No options are provided, a new model will be instantitated no additional options using {@link getLanguageModel}.
 */
export interface LanguageServiceOptions {
  /**
   * Pre-initialized {@link LanguageModel} instance.
   *
   * If not provided
   */
  Languages?: LanguageModel;

  /**
   * Options to instantiate a new {@link LanguageModel} with {@link getLanguageModel}.
   *
   * If not provided a new model will be instantitated no additional options using
   * {@link getLanguageModel}.
   */
  LanguageModelOptions?: Parameters<typeof getLanguageModel>[0];

  /**
   * Whether to await for model initialization before returning the service
   * instance.
   *
   * @default false
   */
  initializeModels?: boolean;
}

interface ILanguageService {
  /**
   * Language model instance.
   */
  Languages: LanguageModel;
}
