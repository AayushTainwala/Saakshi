import { canonicalize } from '../integrity/canonical';

describe('canonicalize (RFC 8785)', () => {
  it('sorts members by UTF-16 code units and drops whitespace', () => {
    expect(canonicalize({ b: 1, a: [true, null, 'x'], A: {} })).toBe('{"A":{},"a":[true,null,"x"],"b":1}');
    // RFC 8785 section 3.2.3: sorting by UTF-16 code units, not code points.
    expect(canonicalize({ '€': 1, '\r': 2, '😀': 3, 'ö': 4, '1': 5 })).toBe(
      '{"\\r":2,"1":5,"ö":4,"€":1,"😀":3}',
    );
  });

  it('serialises numbers as ECMAScript does', () => {
    expect(canonicalize([1e21, 1e-7, 333333333.33333329, -0, 19.076, 72.8777, 4.5])).toBe(
      '[1e+21,1e-7,333333333.3333333,0,19.076,72.8777,4.5]',
    );
  });

  it('escapes strings as JSON.stringify does', () => {
    expect(canonicalize('a"b\\c\n\u0001')).toBe('"a\\"b\\\\c\\n\\u0001"');
  });

  it('omits undefined members and rejects non-finite numbers', () => {
    expect(canonicalize({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(() => canonicalize({ a: NaN })).toThrow();
    expect(() => canonicalize(Infinity)).toThrow();
  });
});
