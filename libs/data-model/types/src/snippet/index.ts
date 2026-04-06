/**
 * Snippet record.
 */
export type TSnippet = {
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
   * Optional description of the snippet.
   *
   * Multi-line description, max 1024 characters.
   */
  description?: string;

  /**
   * Language used in the snippet.
   *
   * Reference to a Language record by id.
   */
  language: string;

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
};

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
