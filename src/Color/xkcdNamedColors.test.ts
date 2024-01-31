import { closest, xkcdColors } from './xkcdNamedColors';

describe('xkcdColors', () => {
  test('closest works', () => {
    // rewrite this test so that we brute-force by calculating the distance to each color
    expect(closest('#0000ff')).toEqual({
      coords: [8, 4, 249],
      d2: 116,
      hex: '#0804f9',
      name: 'primary blue',
    });
  });
});
