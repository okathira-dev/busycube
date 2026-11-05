import { meanCameraRgb } from "./brightness";

describe("camera RGB mean", () => {
  it("averages all RGB components equally, independently of alpha", () => {
    expect(meanCameraRgb(new Uint8ClampedArray([0, 255, 0, 0]))).toBe(85);
    expect(
      meanCameraRgb(new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 0])),
    ).toBe(127.5);
  });
  it("rejects missing or invalid pixel observations instead of producing black", () => {
    expect(meanCameraRgb([])).toBeUndefined();
    expect(meanCameraRgb([0, 0])).toBeUndefined();
    expect(meanCameraRgb([0, NaN, 0, 255])).toBeUndefined();
    expect(meanCameraRgb([256, 0, 0, 255])).toBeUndefined();
  });
});
