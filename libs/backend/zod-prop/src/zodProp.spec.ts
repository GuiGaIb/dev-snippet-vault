import { faker } from '@faker-js/faker';
import { getModelForClass, modelOptions, PropType } from '@typegoose/typegoose';
import z from 'zod';
import {
  computePropOptions,
  computeSetter,
  computeValidator,
  zodProp,
} from './zodProp.js';

describe('zodProp', () => {
  @modelOptions({
    options: {
      automaticName: false,
      customName: 'TestModel',
    },
  })
  class CTest {
    @zodProp(z.string().min(3), { type: String })
    str!: string;

    @zodProp(z.number(), { type: Number })
    num!: number;

    @zodProp(z.int(), { type: Number })
    int!: number;

    @zodProp(z.email().toLowerCase(), { type: String })
    email!: string;

    @zodProp(z.boolean().default(false), { type: Boolean })
    bool!: boolean;

    @zodProp(z.date(), { type: Date })
    date!: Date;

    @zodProp(z.string().optional(), { type: String })
    optionalStr?: string;

    @zodProp(z.string().nullable(), { type: String })
    nullableStr!: string | null;

    @zodProp(z.string().default(() => 'dynamic'), { type: String })
    dynamicDefault!: string;

    @zodProp(z.array(z.string()), { type: [String] }, PropType.ARRAY)
    strArr!: string[];

    @zodProp(
      z.array(z.number()).default([1, 2]),
      { type: [Number] },
      PropType.ARRAY,
    )
    numArr!: number[];

    @zodProp(
      z.array(z.boolean()).optional(),
      { type: [Boolean] },
      PropType.ARRAY,
    )
    boolArr?: boolean[];

    @zodProp(z.array(z.email()), { type: String }, PropType.ARRAY)
    emailArr!: string[];

    @zodProp(z.array(z.date()), { type: [Date] }, PropType.ARRAY)
    dateArr!: Date[];

    @zodProp(z.string().nullable().optional(), { type: String })
    nullableOptionalStr?: string | null;
  }
  const TestModel = getModelForClass(CTest);

  it('preserves Mongoose type coercion', () => {
    const doc = new TestModel({
      str: 123,
      num: '123.4',
      int: '123',
      date: new Date(),
    });
    expect(doc.str).toBe('123');
    expect(doc.num).toBe(123.4);
    expect(doc.int).toBe(123);
  });

  it("doesn't throw when assigning an invalid value", () => {
    const doc = new TestModel({ date: new Date() });

    expect(() => {
      doc.str = 123 as unknown as any;
    }).not.toThrow();
    expect(doc.str).toBe('123');
  });

  it('validates the path with the passed schema', async () => {
    const doc = new TestModel({
      str: '12',
      email: faker.internet.email(),
      int: faker.number.int(),
      num: faker.number.float(),
      date: new Date(),
    });
    await expect(doc.validate()).rejects.toThrow('Path "str" invalid');

    doc.str = '123';
    doc.email = faker.lorem.word();
    await expect(doc.validate()).rejects.toThrow('Path "email" invalid');

    doc.email = faker.internet.email();
    await expect(doc.validate()).resolves.not.toThrow();
  });

  it('applies transforms if the schema has a transform', () => {
    const email = 'TestEmail@example.com';
    const doc = new TestModel({
      email,
      date: new Date(),
    });
    expect(doc.email).toBe(email.toLowerCase());
  });

  it('applies defaults if the schema has a default', () => {
    const doc = new TestModel({ date: new Date() });
    expect(doc.bool).toBe(false);
  });

  it('supports Date type', () => {
    const date = new Date();
    const doc = new TestModel({ date });
    expect(doc.date).toEqual(date);
    expect(doc.date).toBeInstanceOf(Date);
  });

  it('handles optional fields correctly', async () => {
    const doc = new TestModel({
      str: 'valid',
      num: 1,
      int: 1,
      email: 'test@example.com',
      date: new Date(),
      // optionalStr is missing
    });
    await expect(doc.validate()).resolves.not.toThrow();
    expect(doc.optionalStr).toBeUndefined();
  });

  it('handles nullable fields correctly', async () => {
    const doc = new TestModel({
      str: 'valid',
      num: 1,
      int: 1,
      email: 'test@example.com',
      date: new Date(),
      nullableStr: null,
    });
    await expect(doc.validate()).resolves.not.toThrow();
    expect(doc.nullableStr).toBeNull();
  });

  it('handles dynamic defaults correctly', () => {
    const doc = new TestModel();
    expect(doc.dynamicDefault).toBe('dynamic');
  });

  it('formats validation errors nicely', async () => {
    const doc = new TestModel({
      str: '1', // Too short (min 3)
      num: 1,
      int: 1,
      email: 'test@example.com',
      date: new Date(),
    });

    try {
      await doc.validate();
      throw new Error('Should have thrown validation error');
    } catch (err: any) {
      expect(err.errors['str']).toBeDefined();
      const message = err.errors['str'].message;
      expect(message).toContain('Path "str" invalid:');
      expect(message).toContain(
        'Too small: expected string to have >=3 characters',
      );
    }
  });

  it('handles array fields correctly', async () => {
    const doc = new TestModel({
      str: 'valid',
      num: 1,
      int: 1,
      email: 'test@example.com',
      date: new Date(),
    });

    // Check default empty array behavior
    expect(doc.strArr).toEqual([]);
    expect(doc.strArr).toBeInstanceOf(Array);

    // Check default value for array
    expect(doc.numArr).toEqual([1, 2]);

    // Check optional array
    expect(doc.boolArr).toEqual([]); // Mongoose defaults arrays to [] even if optional
  });

  it('validates array fields', async () => {
    const doc = new TestModel({
      str: 'valid',
      num: 1,
      int: 1,
      email: 'test@example.com',
      date: new Date(),
      strArr: ['valid'],
      emailArr: ['test@example.com'],
    });
    await expect(doc.validate()).resolves.not.toThrow();

    doc.emailArr = ['invalid-email'];
    await expect(doc.validate()).rejects.toThrow('Path "emailArr" invalid');
  });

  it('handles Date[] array fields', () => {
    const d1 = new Date('2024-01-01');
    const d2 = new Date('2024-06-15');
    const doc = new TestModel({
      date: new Date(),
      dateArr: [d1, d2],
    });
    expect(doc.dateArr).toHaveLength(2);
    expect(doc.dateArr[0]).toEqual(d1);
    expect(doc.dateArr[1]).toEqual(d2);
    expect(doc.dateArr[0]).toBeInstanceOf(Date);
  });

  it('stores boolean array elements correctly', () => {
    const doc = new TestModel({
      date: new Date(),
      boolArr: [true, false, true],
    });
    expect(doc.boolArr).toEqual([true, false, true]);
    expect(doc.boolArr).toBeInstanceOf(Array);
  });

  it('handles nested nullable().optional() correctly', async () => {
    const base = {
      str: 'valid',
      num: 1,
      int: 1,
      email: 'test@example.com',
      date: new Date(),
    };

    const withUndefined = new TestModel({ ...base });
    await expect(withUndefined.validate()).resolves.not.toThrow();
    expect(withUndefined.nullableOptionalStr).toBeUndefined();

    const withNull = new TestModel({ ...base, nullableOptionalStr: null });
    await expect(withNull.validate()).resolves.not.toThrow();
    expect(withNull.nullableOptionalStr).toBeNull();

    const withValue = new TestModel({ ...base, nullableOptionalStr: 'hi' });
    await expect(withValue.validate()).resolves.not.toThrow();
    expect(withValue.nullableOptionalStr).toBe('hi');
  });

  it('setter keeps raw value when parse fails, deferring to validate()', async () => {
    const doc = new TestModel({
      str: 'valid',
      num: 1,
      int: 1,
      email: 'test@example.com',
      date: new Date(),
    });
    doc.str = 'ab';
    expect(doc.str).toBe('ab');
    await expect(doc.validate()).rejects.toThrow('Path "str" invalid');
  });

  it('defaults nullable fields to null', () => {
    const doc = new TestModel({ date: new Date() });
    expect(doc.nullableStr).toBeNull();
  });
});

describe('computePropOptions', () => {
  it('marks plain schemas as required with no default', () => {
    expect(computePropOptions(z.string())).toEqual({ required: true });
  });

  it('marks optional schemas as not required with no default', () => {
    const result = computePropOptions(z.string().optional());
    expect(result.required).toBe(false);
    expect(result.default).toBeUndefined();
  });

  it('marks nullable schemas as not required with null default', () => {
    const result = computePropOptions(z.string().nullable());
    expect(result.required).toBe(false);
    expect((result.default as () => unknown)()).toBeNull();
  });

  it('marks defaulted schemas as not required with the default value', () => {
    const result = computePropOptions(z.string().default('hello'));
    expect(result.required).toBe(false);
    expect((result.default as () => unknown)()).toBe('hello');
  });

  it('wraps default in a thunk for dynamic defaults', () => {
    let counter = 0;
    const result = computePropOptions(z.number().default(() => ++counter));
    const thunk = result.default as () => unknown;
    expect(thunk()).toBe(1);
    expect(thunk()).toBe(2);
  });

  it('classifies by outermost wrapper for nested combinations', () => {
    const nullableThenOptional = computePropOptions(
      z.string().nullable().optional(),
    );
    expect(nullableThenOptional.required).toBe(false);
    expect(nullableThenOptional.default).toBeUndefined();

    const optionalThenNullable = computePropOptions(
      z.string().optional().nullable(),
    );
    expect(optionalThenNullable.required).toBe(false);
    expect((optionalThenNullable.default as () => unknown)()).toBeNull();
  });
});

describe('computeValidator', () => {
  it('returns success for a valid value', () => {
    const { validator } = computeValidator(z.string().min(3));
    expect((validator as (v: unknown) => boolean)('abc')).toBe(true);
  });

  it('returns failure for an invalid value', () => {
    const { validator } = computeValidator(z.string().min(3));
    expect((validator as (v: unknown) => boolean)('ab')).toBe(false);
  });

  it('formats error messages with path and Zod details', () => {
    const { message } = computeValidator(z.string().min(3));
    const msg = (message as (p: { path: string; value: unknown }) => string)({
      path: 'name',
      value: 'ab',
    });
    expect(msg).toContain('Path "name" invalid:');
    expect(msg).toContain('Too small');
  });

  it('returns "Unknown error" when safeParse succeeds inside message', () => {
    const { message } = computeValidator(z.any());
    const msg = (message as (p: { path: string; value: unknown }) => string)({
      path: 'x',
      value: 'anything',
    });
    expect(msg).toContain('Unknown error');
  });
});

describe('computeSetter', () => {
  it('returns transformed value on successful parse', () => {
    const setter = computeSetter(z.email().toLowerCase())!;
    expect(setter('FOO@BAR.COM')).toBe('foo@bar.com');
  });

  it('returns raw value on failed parse (passthrough)', () => {
    const setter = computeSetter(z.string().min(3))!;
    const sentinel = { key: 'untouched' };
    expect(setter(sentinel)).toBe(sentinel);
  });

  it('returns parsed data for valid input without transforms', () => {
    const setter = computeSetter(z.string())!;
    expect(setter('hello')).toBe('hello');
  });
});
