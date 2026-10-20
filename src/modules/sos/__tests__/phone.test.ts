import { formatPhone, normalizePhone } from '../contacts/phone';

describe('normalizePhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['098765-43210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['0091 98765 43210', '+919876543210'],
    ['(022) 2345 6789', '+912223456789'],
    ['+44 20 7946 0958', '+442079460958'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['', 'abc', '12345', '98765432', '+91 98765 4321x', '1234567890123456', '+1234567'])(
    'rejects %p',
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );
});

describe('formatPhone', () => {
  it('groups Indian numbers and leaves others as they are', () => {
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210');
    expect(formatPhone('+442079460958')).toBe('+442079460958');
  });
});
