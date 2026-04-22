import { describe, expect, test } from "bun:test";

import { buildKeyAliasIndex, resolveKey, tokenKey } from "./token-keys";

describe("tokenKey", () => {
  test("returns qualified key when group is present", () => {
    expect(tokenKey({ name: "primary", group: "color" })).toBe("color.primary");
  });

  test("returns bare name when group is missing", () => {
    expect(tokenKey({ name: "primary" })).toBe("primary");
  });

  test("returns empty string when name is missing", () => {
    expect(tokenKey({ name: "", group: "color" })).toBe("");
  });

  test("treats empty-string group as missing (returns bare name)", () => {
    expect(tokenKey({ name: "primary", group: "" })).toBe("primary");
  });
});

describe("buildKeyAliasIndex + resolveKey", () => {
  test("full qualified keys resolve directly", () => {
    const index = buildKeyAliasIndex(["color.primary", "size.primary"]);
    expect(resolveKey("color.primary", index)).toEqual({
      status: "ok",
      key: "color.primary",
      bare: "primary",
    });
  });

  test("unambiguous bare names resolve to their qualified key", () => {
    const index = buildKeyAliasIndex(["color.background", "spacing.sm"]);
    expect(resolveKey("background", index)).toEqual({
      status: "ok",
      key: "color.background",
      bare: "background",
    });
  });

  test("ambiguous bare names return ambiguous with candidates", () => {
    const index = buildKeyAliasIndex(["color.primary", "size.primary"]);
    const result = resolveKey("primary", index);
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.candidates.toSorted()).toEqual(["color.primary", "size.primary"]);
    }
  });

  test("missing keys return missing", () => {
    const index = buildKeyAliasIndex(["color.primary"]);
    expect(resolveKey("nonexistent", index)).toEqual({ status: "missing" });
  });

  test("duplicate input keys do not trigger false ambiguity", () => {
    // A defensive test against callers that (accidentally) pass a key twice —
    // previously this polluted the bare-name index, reporting `matches primary, primary`.
    const index = buildKeyAliasIndex(["color.primary", "color.primary"]);
    expect(resolveKey("primary", index)).toEqual({
      status: "ok",
      key: "color.primary",
      bare: "primary",
    });
  });

  test("empty keys are skipped", () => {
    const index = buildKeyAliasIndex(["", "color.primary", ""]);
    expect(resolveKey("primary", index).status).toBe("ok");
    expect(resolveKey("", index).status).toBe("missing");
  });

  test("empty input returns an empty index", () => {
    const index = buildKeyAliasIndex([]);
    expect(index.fullKeys.size).toBe(0);
    expect(index.uniqueBare.size).toBe(0);
    expect(index.ambiguousBare.size).toBe(0);
    expect(resolveKey("anything", index).status).toBe("missing");
  });
});
