import { checkNewCode, waitAfter } from '../code';

describe('which codes may be chosen', () => {
  it('takes four digits that are not easily guessed', () => {
    for (const code of ['2580', '1357', '0912', '4096', '1123', '9081']) expect(checkNewCode(code)).toBeNull();
  });

  it('refuses one digit four times', () => {
    for (const code of ['0000', '1111', '7777', '9999']) expect(checkNewCode(code)).toBe('repeated');
  });

  it('refuses straight runs up and down', () => {
    for (const code of ['0123', '1234', '6789', '9876', '3210', '5432']) expect(checkNewCode(code)).toBe('run');
  });

  it('refuses anything but four digits', () => {
    for (const code of ['', '123', '12345', '12a4', ' 1234', '١٢٣٤']) expect(checkNewCode(code)).toBe('format');
  });
});

describe('the wait after wrong tries', () => {
  it('costs nothing for two, then 30 seconds, 1, 2, 5, 15 and 30 minutes, and an hour from there', () => {
    const minutes = (n: number) => n * 60_000;
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 50].map(waitAfter)).toEqual([
      0,
      0,
      30_000,
      minutes(1),
      minutes(2),
      minutes(5),
      minutes(15),
      minutes(30),
      minutes(60),
      minutes(60),
      minutes(60),
    ]);
    expect(waitAfter(0)).toBe(0);
  });
});
