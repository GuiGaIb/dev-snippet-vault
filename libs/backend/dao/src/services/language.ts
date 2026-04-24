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
  decodeLanguageCursor,
  encodeLanguageCursor,
  languageCursorSchema,
  type LanguageCursor,
  type LanguageCursorInput,
} from '../utils/languageCursorCodec.js';

/**
 * Service layer for creating and reading languages through the DAO model.
 *
 * Typical usage:
 *
 * - Call {@link LanguageService.getInstance} to obtain a service backed by the
 *   default language model.
 * - Use {@link listLanguages} for cursor-based pagination over the language
 *   collection.
 * - Use {@link createLanguage}, {@link getLanguageById}, or
 *   {@link getLanguageByName} for direct CRUD-style interactions.
 *
 * @example
 * ```ts
 * const service = await LanguageService.getInstance({
 *   initializeModels: true,
 * });
 *
 * const created = await service.createLanguage({ name: 'TypeScript' });
 * const fetched = await service.getLanguageById(created.id);
 * ```
 *
 * @example
 * ```ts
 * const service = await LanguageService.getInstance();
 *
 * const firstPage = await service.listLanguages({
 *   limit: 10,
 *   sort: { updatedAt: 'desc' },
 * });
 *
 * const nextPage = firstPage.cursor?.after
 *   ? await service.listLanguages(firstPage.cursor.after)
 *   : undefined;
 * ```
 */
export class LanguageService implements ILanguageService {
  /**
   * Creates a service instance using either an injected model or a model built
   * from the provided model options.
   *
   * When `initializeModels` is enabled, this also waits for Mongoose indexes to
   * be initialized before returning.
   *
   * @param options - Controls which language model instance backs the service.
   * @returns A ready-to-use {@link LanguageService}.
   */
  static async getInstance(options: LanguageServiceOptions = {}) {
    const Languages =
      options.Languages ?? getLanguageModel(options.LanguageModelOptions);

    if (options.initializeModels === true) {
      await Languages.init();
    }

    return new LanguageService(Languages);
  }

  /**
   * Creates a service bound to a specific language model instance.
   *
   * Prefer {@link LanguageService.getInstance} unless a prebuilt model is
   * already available.
   *
   * @param Languages - Backing Mongoose model used for all queries.
   */
  protected constructor(public readonly Languages: LanguageModel) {}

  /**
   * Builds the base Mongoose query used for keyset pagination over
   * `(updatedAt, _id)`.
   *
   * The returned query always requests `limit + 1` documents so callers can
   * detect whether another page exists without issuing a second query.
   *
   * @param cursor - Parsed pagination cursor describing sort order, page size,
   *   and optional anchor position.
   * @returns Configured Mongoose query ready to execute.
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

    /**
     * Builds the MongoDB filter that selects rows after or before the anchor
     * document for the requested sort direction.
     */
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

    /**
     * Computes the MongoDB sort tuple, inverting it when paging backward so the
     * query can still fetch a contiguous window around the anchor row.
     */
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
   * @returns A page of client-facing language objects plus navigation cursors
   *   when more data exists in either direction.
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
      pageCursor.before = encodeLanguageCursor({
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
      pageCursor.after = encodeLanguageCursor({
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

  /**
   * Normalizes incoming cursor input into the parsed internal cursor shape.
   *
   * This method accepts the three service entry cases: no cursor for the first
   * page, an opaque cursor string from a previous response, or a plain object
   * used to start a custom page sequence.
   *
   * @param cursor - Raw cursor input supplied by the caller.
   * @returns Parsed cursor with defaults applied.
   */
  private normalizeLanguageCursor(
    cursor?: string | LanguageCursorInput,
  ): LanguageCursor {
    if (cursor === undefined || cursor === null) {
      return languageCursorSchema.parse({});
    }
    if (typeof cursor === 'string') {
      return decodeLanguageCursor(cursor) as LanguageCursor;
    }
    return languageCursorSchema.parse(cursor);
  }

  /**
   * Persists a new language document.
   *
   * @param data - Language payload validated by the model schema on creation.
   * @returns The created Mongoose document.
   */
  createLanguage(data: TCreateLanguageInput): Promise<LanguageDoc> {
    return this.Languages.create(data);
  }

  /**
   * Looks up a language by its MongoDB identifier.
   *
   * @param id - String or ObjectId representation of the language id.
   * @returns The matching language document, or `null` when none exists.
   */
  getLanguageById(id: string | Types.ObjectId): Promise<LanguageDoc | null> {
    return this.Languages.findById(id).exec();
  }

  /**
   * Looks up a language by its unique name.
   *
   * @param name - Exact language name to search for.
   * @returns The matching language document, or `null` when none exists.
   */
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
