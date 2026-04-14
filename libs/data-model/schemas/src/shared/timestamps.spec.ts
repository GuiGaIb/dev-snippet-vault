import { autofillTimeStamps } from './timestamps.js';

describe('autofillTimeStamps', () => {
  it('autofills createdAt and updatedAt properties if not provided', () => {
    const data = {
      foo: 'bar',
    };
    const result = autofillTimeStamps(data);

    expect(result).toEqual(
      expect.objectContaining({
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );

    expect(result.foo).toBe('bar');
    expect(result.updatedAt).toEqual(result.createdAt);
  });

  it('uses createdAt to set updatedAt if not provided', () => {
    const data = {
      createdAt: new Date(),
    };
    const result = autofillTimeStamps(data);
    expect(result.updatedAt).toEqual(result.createdAt);
  });

  it('preserves provided updatedAt if provided', () => {
    const data = {
      updatedAt: new Date(),
    };
    const result = autofillTimeStamps(data);

    expect(result).toEqual(
      expect.objectContaining({
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );
    expect(result.updatedAt).toEqual(data.updatedAt);
  });

  it('treats null `createdAt` and `updatedAt` values as undefined', () => {
    const result_1 = autofillTimeStamps({
      createdAt: null,
    } as any);

    expect(result_1.createdAt).toEqual(result_1.updatedAt);

    const result_2 = autofillTimeStamps({
      createdAt: new Date(),
      updatedAt: null,
    } as any);
    expect(result_2.updatedAt).toEqual(result_2.createdAt);
  });

  it('throws if either `createdAt` or `updatedAt` are invalid', () => {
    expect(() =>
      autofillTimeStamps({
        createdAt: 'invalid date string',
      }),
    ).toThrow();

    expect(() =>
      autofillTimeStamps({
        updatedAt: {},
      } as any),
    ).toThrow();

    expect(() =>
      autofillTimeStamps({
        createdAt: new Date(),
        updatedAt: [],
      } as any),
    ).toThrow();
  });
});
