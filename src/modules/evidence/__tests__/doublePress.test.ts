import { doublePress } from '../bodycam/doublePress';

describe('doublePress', () => {
  it('fires on two presses within the window, then needs two more', () => {
    const unlock = jest.fn();
    const press = doublePress(unlock, 1500);
    press(0);
    expect(unlock).not.toHaveBeenCalled();
    press(1400);
    expect(unlock).toHaveBeenCalledTimes(1);
    press(1500);
    expect(unlock).toHaveBeenCalledTimes(1);
    press(4000);
    press(5600);
    expect(unlock).toHaveBeenCalledTimes(1);
    press(6000);
    expect(unlock).toHaveBeenCalledTimes(2);
  });
});
