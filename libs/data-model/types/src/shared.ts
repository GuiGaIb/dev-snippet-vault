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
