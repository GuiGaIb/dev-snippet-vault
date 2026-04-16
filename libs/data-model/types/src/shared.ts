/**
 * Extracted from `zod/v4/core/util.d.cts`
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SomeObject = Record<PropertyKey, any>;

/**
 * Extracted from `zod/v4/core/util.d.cts`
 */
export type Identity<T> = T;

/**
 * Extracted from `zod/v4/core/util.d.cts`
 */
export type Flatten<T> = Identity<{
  [k in keyof T]: T[k];
}>;

/**
 * Extracted from `zod/v4/core/util.d.cts`
 */
export type Mapped<T> = {
  [k in keyof T]: T[k];
};

/**
 * Extracted from `zod/v4/core/util.d.cts`
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Extracted from `zod/v4/core/util.d.cts`
 */
export type Extend<A extends SomeObject, B extends SomeObject> = Flatten<
  keyof A & keyof B extends never
    ? A & B
    : {
        [K in keyof A as K extends keyof B ? never : K]: A[K];
      } & {
        [K in keyof B]: B[K];
      }
>;

/**
 * Makes the specified properties of a type required.
 *
 * Extracted from `zod/v4/core/util.d.cts`
 */
export type MakeRequired<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

/**
 * Makes the specified properties of a type partial.
 *
 * Extracted from `zod/v4/core/util.d.cts`
 */
export type MakePartial<T, K extends keyof T> = Omit<T, K> &
  InexactPartial<Pick<T, K>>;

/**
 * Extracted from `zod/v4/core/util.d.cts`
 */
export type InexactPartial<T> = {
  [P in keyof T]?: T[P] | undefined;
};

/**
 * Timestamp record.
 */
export type TTimeStamps = {
  /**
   * Timestamp of the record creation.
   */
  createdAt: Date;

  /**
   * Timestamp of the last record update.
   */
  updatedAt: Date;
};
