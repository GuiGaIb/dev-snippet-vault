import type { Extend } from '@models/types/shared';
import { prop, PropType } from '@typegoose/typegoose';
import type {
  ArrayPropOptions,
  BasePropOptions,
  PropOptionsForNumber,
  PropOptionsForString,
} from '@typegoose/typegoose/lib/types.js';
import type { SchemaTypeOptions, ValidateOpts, ValidatorProps } from 'mongoose';
import z from 'zod';

/**
 * Decorator factory that bridges a Zod schema with Typegoose's `@prop()` for
 * a document path whose value is parsed and validated by the schema.
 *
 * **How it works:**
 * - **Setter** ({@link computeSetter}): On every assignment, the value is run
 *   through `schema.safeParse()`. If parsing succeeds (including any Zod
 *   transforms like `.toLowerCase()`), the transformed output is stored. If it
 *   fails, the raw value is kept so that `validate()` can report the error.
 * - **Validator** ({@link computeValidator}): On `validate()`, the stored value
 *   is checked via `schema.safeParse().success`. Failures produce a formatted
 *   message via `z.prettifyError`, prefixed with the failing path name.
 * - **Prop options** ({@link computePropOptions}): `required` is `false` for
 *   `ZodOptional`, `ZodDefault`, and `ZodNullable` schemas. A Mongoose
 *   `default` is derived from `ZodDefault`, or set to `null` for `ZodNullable`.
 *
 * `set` and `validate` are always computed from the schema — the type signature
 * enforces this with `set?: never` and `validate?: never`.
 *
 * Mongoose type coercion (e.g. `Number('123')`) runs **before** the Zod setter,
 * so both layers coexist.
 *
 * This overload targets schemas whose output type is a `string` primitive.
 * Works for optional, nullable, and defaulted schemas.
 */
export function zodProp<T extends string | null | undefined>(
  schema: z.ZodType<T>,
  options: Extend<
    PropOptionsForString,
    {
      type: typeof String;
      set?: never;
      validate?: never;
    }
  >,
): PropertyDecorator;

/**
 * {@link zodProp} overload for `string[]` output schemas.
 */
export function zodProp<T extends string[] | null | undefined>(
  schema: z.ZodType<T>,
  options: Extend<
    ArrayPropOptions,
    {
      type: typeof String | [typeof String];
      set?: never;
      validate?: never;
    }
  >,
  propType: PropType.ARRAY,
): PropertyDecorator;

/**
 * {@link zodProp} overload for `number` output schemas.
 */
export function zodProp<T extends number | null | undefined>(
  schema: z.ZodType<T>,
  options: Extend<
    PropOptionsForNumber,
    {
      type: typeof Number;
      set?: never;
      validate?: never;
    }
  >,
): PropertyDecorator;

/**
 * {@link zodProp} overload for `number[]` output schemas.
 */
export function zodProp<T extends number[] | null | undefined>(
  schema: z.ZodType<T>,
  options: Extend<
    ArrayPropOptions,
    {
      type: typeof Number | [typeof Number];
      set?: never;
      validate?: never;
    }
  >,
  propType: PropType.ARRAY,
): PropertyDecorator;

/**
 * {@link zodProp} overload for `boolean` output schemas.
 */
export function zodProp<T extends boolean | null | undefined>(
  schema: z.ZodType<T>,
  options: Extend<
    BasePropOptions,
    {
      type: typeof Boolean;
      set?: never;
      validate?: never;
    }
  >,
): PropertyDecorator;

/**
 * {@link zodProp} overload for `boolean[]` output schemas.
 */
export function zodProp<T extends boolean[] | null | undefined>(
  schema: z.ZodType<T>,
  options: Extend<
    ArrayPropOptions,
    {
      type: typeof Boolean | [typeof Boolean];
      set?: never;
      validate?: never;
    }
  >,
  propType: PropType.ARRAY,
): PropertyDecorator;

/**
 * {@link zodProp} overload for `Date` output schemas.
 */
export function zodProp<T extends Date | null | undefined>(
  schema: z.ZodType<T>,
  options: Extend<
    BasePropOptions,
    {
      type: typeof Date;
      set?: never;
      validate?: never;
    }
  >,
): PropertyDecorator;

/**
 * {@link zodProp} overload for `Date[]` output schemas.
 */
export function zodProp<T extends Date[] | null | undefined>(
  schema: z.ZodType<T>,
  options: Extend<
    ArrayPropOptions,
    {
      type: typeof Date | [typeof Date];
      set?: never;
      validate?: never;
    }
  >,
  propType: PropType.ARRAY,
): PropertyDecorator;

export function zodProp<
  T extends ZodPropPrimitive | ZodPropPrimitive[] | null | undefined,
>(
  schema: z.ZodType<T>,
  options: ZodPropOptions,
  propType?: PropType,
): PropertyDecorator {
  return prop(
    {
      ...computePropOptions(schema),
      ...options,
      validate: computeValidator(schema),
      set: computeSetter(schema),
    },
    propType,
  );
}

/**
 * Derives Mongoose {@link BasePropOptions} from a Zod schema's outermost wrapper:
 *
 * - `required` is `false` for `ZodOptional`, `ZodDefault`, or `ZodNullable`.
 * - `default` is a thunk returning the schema's default value for `ZodDefault`,
 *   or returning `null` for `ZodNullable`.
 *
 * Only inspects the outermost wrapper — nested combinations (e.g.
 * `z.string().nullable().optional()`) are classified by the outermost type.
 */
export function computePropOptions(schema: z.ZodType): BasePropOptions {
  const isZodOptional = schema instanceof z.ZodOptional;
  const isZodDefault = schema instanceof z.ZodDefault;
  const isZodNullable = schema instanceof z.ZodNullable;

  const computedPropOptions: BasePropOptions = {
    required: !(isZodOptional || isZodDefault || isZodNullable),
  };

  if (isZodDefault) {
    computedPropOptions.default = () => schema.def.defaultValue;
  } else if (isZodNullable) {
    computedPropOptions.default = () => null;
  }

  return computedPropOptions;
}

/**
 * Builds a Mongoose {@link ValidateOpts} object that validates values against
 * the given Zod schema.
 *
 * - `validator` returns `schema.safeParse(value).success`.
 * - `message` produces a human-readable error via `z.prettifyError`,
 *   prefixed with the failing path name.
 */
export function computeValidator(
  schema: z.ZodType,
): ValidateOpts<unknown, unknown> {
  return {
    validator: (value: unknown): boolean => schema.safeParse(value).success,
    message: (props: ValidatorProps) => {
      const error = schema.safeParse(props.value).error;
      const prettyError = error ? z.prettifyError(error) : 'Unknown error';
      return `Path "${props.path}" invalid:\n${prettyError
        .split('\n')
        .map((x) => ' '.repeat(2) + x.trim())
        .join('\n')}`;
    },
  };
}

/**
 * Builds a Mongoose setter that attempts to parse and transform values through
 * the Zod schema on every assignment.
 *
 * Returns `schema.safeParse(value).data` on success (applying any Zod
 * transforms), or the original `value` on failure — preserving the invalid
 * value for later validation reporting.
 */
export function computeSetter(
  schema: z.ZodType,
): SchemaTypeOptions<unknown>['set'] {
  return (value: unknown) => {
    return schema.safeParse(value).data ?? value;
  };
}

/**
 * Supported primitive types as output value of schemas passed to {@link zodProp}.
 */
export type ZodPropPrimitive = string | number | boolean | Date;

/**
 * Typegoose `@prop()` options accepted by {@link zodProp}, restricted to
 * supported primitive `type` constructors. `set` and `validate` are locked
 * out since they are always computed from the Zod schema.
 */
export type ZodPropOptions = Extend<
  NonNullable<Parameters<typeof prop>[0]>,
  {
    type:
      | typeof String
      | typeof Number
      | typeof Boolean
      | typeof Date
      | [typeof String]
      | [typeof Number]
      | [typeof Boolean]
      | [typeof Date];
    set?: never;
    validate?: never;
  }
>;
