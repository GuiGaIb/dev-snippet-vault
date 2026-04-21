/**
 * Standard error envelope for REST-style API responses.
 */
export type ErrorResponse = {
  /** Human-readable error summary for clients. */
  message?: string;
  /** HTTP status code associated with this error, when applicable. */
  status?: number;
  /** Structured validation or domain details (field errors, codes, etc.). */
  details?: Record<string, unknown>;
};

/**
 * Paginated list response using opaque cursor strings rather than offsets.
 *
 * Cursors are typically base64-encoded payloads produced by the server; clients
 * pass `cursor.after` or `cursor.before` back unchanged to fetch the next or
 * previous page. When there is no further page in a direction, the corresponding
 * field is omitted.
 *
 * @typeParam T - Element type of the `data` array (e.g. a resource DTO).
 */
export type PagedResponse<T> = {
  /** Optional informational or warning message alongside the page. */
  message?: string;
  /** Items for this page, in the sort order defined by the listing endpoint. */
  data: T[];
  /**
   * Cursor handles for bidirectional pagination.
   * Omitted when the response is not paginated or no cursors apply (e.g. empty result).
   */
  cursor?: {
    /** Opaque cursor to request the page before the first item in `data`. */
    before?: string;
    /** Opaque cursor to request the page after the last item in `data`. */
    after?: string;
  };
};
