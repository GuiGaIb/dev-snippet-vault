/**
 * Language record.
 */
export interface TLanguage {
  /**
   * Unique identifier for the language record
   */
  id: string;

  /**
   * Language name
   */
  name: string;

  /**
   * List of registered language versions.
   *
   * Should enforce uniqueness across `versionId` AND `sortIdx`.
   */
  versions: TLanguageVersion[];
}

/**
 * Language version metadata.
 */
export type TLanguageVersion = {
  /**
   * Unique identifier for the version record
   */
  id: string;

  /**
   * Version identifier, unique among language versions.
   *
   * Single-line, max 64 characters.
   */
  versionId: string;

  /**
   * Version sorting index, unique among language versions.
   * Should be used as the main sorting criteria for language versions, from older
   * to newer versions ascending.
   *
   * Non-negative integer.
   */
  sortIdx: number;
};
