import type { Extend, TTimeStamps } from './shared.js';

/**
 * Snippet record.
 */
export type TSnippet = Extend<
  {
    /**
     * Unique identifier for the snippet.
     */
    id: string;

    /**
     * Title of the snippet.
     *
     * Single line title, max 128 characters.
     */
    title: string;

    /**
     * Description of the snippet.
     *
     * Multi-line description, max 1024 characters. Can be empty.
     */
    description: string;

    /**
     * Language used in the snippet.
     *
     * Reference to a Language record by id.
     */
    language: string;

    /**
     * Language version range that the snippet is compatible with.
     *
     * See {@link TSnippetLanguageVersionRange} for more details.
     */
    languageVersionRange?: TSnippetLanguageVersionRange;

    /**
     * Code content of the snippet.
     *
     * Multi-line string, max 65536 characters.
     */
    code: string;

    /**
     * List of dependencies used in the snippet.
     *
     * See {@link TSnippetDependency} for more details.
     */
    dependencies: TSnippetDependency[];

    /**
     * List of tags.
     *
     * Can be used for querying/filtering.
     *
     * Single-line strings, max 64 characters each.
     */
    tags: string[];
  },
  TTimeStamps
>;

/**
 * Snippet dependency metadata
 */
export type TSnippetDependency = {
  /**
   * Name of the dependency.
   *
   * Single-line string, max 256 characters.
   */
  name: string;

  /**
   * Optional version of the dependency.
   *
   * Should be a version number, range, or tag.
   *
   * Single-line string, max 256 characters.
   */
  version?: string;
};

/**
 * Language version range specification.
 *
 * Used to specify the range of language versions that a snippet is compatible with.
 */
export type TSnippetLanguageVersionRange = {
  /**
   * Starting version of the range.
   *
   * Should be a valid reference to a language version id (`TLanguageVersion['id']`).
   */
  from: string;

  /**
   * Optional ending version of the range.
   *
   * Should be a valid reference to a language version id (`TLanguageVersion['id']`).
   *
   * If not provided, the range is considered as an exact version specification.
   */
  to?: string;
};
