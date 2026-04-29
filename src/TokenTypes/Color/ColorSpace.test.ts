import { describe, expect, test } from "bun:test";

import { convert, convertWithIntermediates } from "./ColorSpace.js";

describe("convert", () => {
  test("same-space conversion returns original data", () => {
    const data: [number, number, number] = [255, 0, 0];
    const result = convert("rgb", "rgb", data);
    expect(result).toEqual(data);
  });

  test("rgb to hsl conversion works", () => {
    const result = convert("rgb", "hsl", [255, 0, 0]);
    expect(result[0]).toBeCloseTo(0); // hue
    expect(result[1]).toBeCloseTo(1); // saturation
    expect(result[2]).toBeCloseTo(0.5); // lightness
  });

  test("hsl to rgb conversion works", () => {
    const result = convert("hsl", "rgb", [0, 1, 0.5]);
    expect(result).toEqual([255, 0, 0]);
  });

  test("rgb to xyz conversion works", () => {
    const result = convert("rgb", "xyz", [255, 255, 255]);
    expect(result[1]).toBeCloseTo(1.0, 1); // Y ≈ 1 for white
  });

  test("rgb to lab multi-hop conversion works", () => {
    const result = convert("rgb", "lab", [255, 255, 255]);
    expect(result[0]).toBeCloseTo(100, 0); // L ≈ 100 for white
  });

  test("rgb to lch multi-hop conversion works", () => {
    const result = convert("rgb", "lch", [255, 0, 0]);
    expect(result[0]).toBeGreaterThan(0); // L > 0 for red
    expect(result[1]).toBeGreaterThan(0); // C > 0 for saturated red
  });
});

describe("convertWithIntermediates", () => {
  test("same-space returns record with only that space", () => {
    const data: [number, number, number] = [255, 0, 0];
    const result = convertWithIntermediates("rgb", "rgb", data);
    expect(result.rgb).toEqual(data);
    expect(result.hsl).toBeUndefined();
    expect(result.xyz).toBeUndefined();
  });

  test("rgb to xyz includes both spaces", () => {
    const data: [number, number, number] = [255, 0, 0];
    const result = convertWithIntermediates("rgb", "xyz", data);
    expect(result.rgb).toBeDefined();
    expect(result.xyz).toBeDefined();
  });

  test("rgb to lab includes xyz intermediate", () => {
    const data: [number, number, number] = [255, 0, 0];
    const result = convertWithIntermediates("rgb", "lab", data);
    expect(result.rgb).toBeDefined();
    expect(result.xyz).toBeDefined();
    expect(result.lab).toBeDefined();
  });

  test("hsl to lch includes all intermediates", () => {
    const data: [number, number, number] = [0, 1, 0.5]; // pure red in HSL
    const result = convertWithIntermediates("hsl", "lch", data);
    expect(result.hsl).toBeDefined();
    expect(result.rgb).toBeDefined();
    expect(result.xyz).toBeDefined();
    expect(result.lab).toBeDefined();
    expect(result.lch).toBeDefined();
  });

  test("intermediate values are numerically consistent with convert", () => {
    const data: [number, number, number] = [100, 150, 200];
    const intermediates = convertWithIntermediates("rgb", "lch", data);
    const directXyz = convert("rgb", "xyz", data);
    const directLab = convert("rgb", "lab", data);
    const directLch = convert("rgb", "lch", data);

    directXyz.forEach((v, i) => expect(intermediates.xyz![i]).toBeCloseTo(v, 10));
    directLab.forEach((v, i) => expect(intermediates.lab![i]).toBeCloseTo(v, 10));
    directLch.forEach((v, i) => expect(intermediates.lch![i]).toBeCloseTo(v, 10));
  });

  test("lch to rgb includes all reverse intermediates", () => {
    const data: [number, number, number] = [50, 30, 200];
    const result = convertWithIntermediates("lch", "rgb", data);
    expect(result.lch).toBeDefined();
    expect(result.lab).toBeDefined();
    expect(result.xyz).toBeDefined();
    expect(result.rgb).toBeDefined();
  });

  test("lab to hsl includes all intermediates in the path", () => {
    const data: [number, number, number] = [50, 20, -30];
    const result = convertWithIntermediates("lab", "hsl", data);
    expect(result.lab).toBeDefined();
    expect(result.xyz).toBeDefined();
    expect(result.rgb).toBeDefined();
    expect(result.hsl).toBeDefined();
  });
});
