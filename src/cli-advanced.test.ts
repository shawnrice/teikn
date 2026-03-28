import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ─── Helpers ─────────────────────────────────────────────────

const CLI = path.resolve(__dirname, "cli.ts");
const PROJECT_ROOT = path.resolve(__dirname, "..");

const run = (...args: string[]) => {
  const result = spawnSync("bun", ["run", CLI, ...args], {
    cwd: PROJECT_ROOT,
    encoding: "utf-8" as BufferEncoding,
    timeout: 10_000,
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? "",
    code: result.status ?? 1,
  };
};

const runInDir = (cwd: string, ...args: string[]) => {
  const result = spawnSync("bun", ["run", CLI, ...args], {
    cwd,
    encoding: "utf-8" as BufferEncoding,
    timeout: 10_000,
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? "",
    code: result.status ?? 1,
  };
};

const tmpDir = path.join(os.tmpdir(), `teikn-cli-adv-${Date.now()}`);

beforeAll(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── Config file loading ─────────────────────────────────────

describe("cli: config file", () => {
  const configDir = path.join(tmpDir, "config-test");
  const outDir = path.join(configDir, "out");

  beforeAll(() => {
    fs.mkdirSync(configDir, { recursive: true });

    // Create a minimal token file
    const tokensContent = `
export default [
  { name: "primary", type: "color", value: "#0066cc" },
  { name: "secondary", type: "color", value: "#cc6600" },
];
`;
    fs.writeFileSync(path.join(configDir, "tokens.ts"), tokensContent);

    // Create a config file
    const configContent = `
export default {
  input: "./tokens.ts",
  outDir: "./out",
  generators: ["Json"],
};
`;
    fs.writeFileSync(path.join(configDir, "teikn.config.ts"), configContent);
  });

  test("picks up teikn.config.ts when no arguments given", () => {
    const { stdout, code } = runInDir(configDir);
    expect(code).toBe(0);
    expect(stdout).toContain("Tokens generated successfully!");
    expect(stdout).toContain("teikn.config.ts");
    expect(fs.existsSync(path.join(outDir, "tokens.json"))).toBe(true);
  });

  test("config with string generator names resolves correctly", () => {
    const multiGenDir = path.join(tmpDir, "config-multi-gen");
    const multiOutDir = path.join(multiGenDir, "out");
    fs.mkdirSync(multiGenDir, { recursive: true });

    fs.writeFileSync(
      path.join(multiGenDir, "tokens.ts"),
      `export default [{ name: "space-sm", type: "spacing", value: "8px" }];`,
    );

    fs.writeFileSync(
      path.join(multiGenDir, "teikn.config.ts"),
      `export default { input: "./tokens.ts", outDir: "./out", generators: ["Json", "CssVars"] };`,
    );

    const { stdout, code } = runInDir(multiGenDir);
    expect(code).toBe(0);
    expect(stdout).toContain("Tokens generated successfully!");
    expect(fs.existsSync(path.join(multiOutDir, "tokens.json"))).toBe(true);
    expect(fs.existsSync(path.join(multiOutDir, "tokens.css"))).toBe(true);
  });

  test("config file with invalid input path exits with error", () => {
    const badDir = path.join(tmpDir, "config-bad-input");
    fs.mkdirSync(badDir, { recursive: true });

    fs.writeFileSync(
      path.join(badDir, "teikn.config.ts"),
      `export default { input: "./nonexistent-tokens.ts", outDir: "./out", generators: ["Json"] };`,
    );

    const { stderr, code } = runInDir(badDir);
    expect(code).not.toBe(0);
    expect(stderr).toContain("Input file not found");
  });
});

// ─── --plugins flag ──────────────────────────────────────────

describe("cli: --plugins flag", () => {
  const pluginOutDir = path.join(tmpDir, "plugin-out");
  const defaultOutDir = path.join(tmpDir, "plugin-default-out");

  test("StripTypePrefixPlugin strips type prefix from token names", () => {
    // Generate with default plugins (type prefix is built in)
    run("example/raw-tokens.ts", `--outDir=${defaultOutDir}`, '--generators="Json"');
    const defaultJson = JSON.parse(
      fs.readFileSync(path.join(defaultOutDir, "tokens.json"), "utf-8"),
    );
    const defaultKeys = Object.keys(defaultJson);
    // Default output has type-prefixed names like "colorPrimary"
    const hasPrefixed = defaultKeys.some((k) => k.startsWith("color"));
    expect(hasPrefixed).toBe(true);

    // Generate with StripTypePrefixPlugin
    const { stdout, code } = run(
      "example/raw-tokens.ts",
      `--outDir=${pluginOutDir}`,
      '--generators="Json"',
      '--plugins="StripTypePrefixPlugin"',
    );
    expect(code).toBe(0);
    expect(stdout).toContain("StripTypePrefixPlugin");

    const json = JSON.parse(fs.readFileSync(path.join(pluginOutDir, "tokens.json"), "utf-8"));
    const keys = Object.keys(json);
    // StripTypePrefixPlugin removes the type prefix, so "colorPrimary" becomes "primary"
    const hasUnprefixed = keys.some((k) => k === "primary");
    expect(hasUnprefixed).toBe(true);
  });
});

// ─── --generators flag with multiple generators ──────────────

describe("cli: multiple generators", () => {
  const multiOutDir = path.join(tmpDir, "multi-gen-out");

  test("generates CssVars, Json, and EsModule output files", () => {
    const { stdout, code } = run(
      "example/raw-tokens.ts",
      `--outDir=${multiOutDir}`,
      '--generators="CssVars,Json,EsModule"',
    );
    expect(code).toBe(0);
    expect(stdout).toContain("Tokens generated successfully!");

    expect(fs.existsSync(path.join(multiOutDir, "tokens.css"))).toBe(true);
    expect(fs.existsSync(path.join(multiOutDir, "tokens.json"))).toBe(true);
    expect(fs.existsSync(path.join(multiOutDir, "tokens.mjs"))).toBe(true);
  });
});

// ─── JSON token file input ───────────────────────────────────

describe("cli: JSON input", () => {
  const jsonOutDir = path.join(tmpDir, "json-input-out");
  const jsonTokenPath = path.join(tmpDir, "test-tokens.json");

  beforeAll(() => {
    const tokens = [
      { name: "primary", type: "color", value: "#0066cc" },
      { name: "secondary", type: "color", value: "#cc6600" },
    ];
    fs.writeFileSync(jsonTokenPath, JSON.stringify(tokens));
  });

  test("generates output from a .json token file", () => {
    const { stdout, code } = run(jsonTokenPath, `--outDir=${jsonOutDir}`, '--generators="Json"');
    expect(code).toBe(0);
    expect(stdout).toContain("Tokens generated successfully!");

    const json = JSON.parse(fs.readFileSync(path.join(jsonOutDir, "tokens.json"), "utf-8"));
    // Keys are type-prefixed and camelCased by the Json generator
    expect(json).toHaveProperty("colorPrimary");
    expect(json).toHaveProperty("colorSecondary");
  });
});

// ─── Token file with default export ──────────────────────────

describe("cli: default export", () => {
  const defOutDir = path.join(tmpDir, "default-export-out");
  const tokenFile = path.join(tmpDir, "default-export-tokens.ts");

  beforeAll(() => {
    fs.writeFileSync(
      tokenFile,
      `export default [
  { name: "radius-sm", type: "borderRadius", value: "4px" },
  { name: "radius-lg", type: "borderRadius", value: "12px" },
];`,
    );
  });

  test("handles default export token file", () => {
    const { stdout, code } = run(tokenFile, `--outDir=${defOutDir}`, '--generators="Json"');
    expect(code).toBe(0);
    expect(stdout).toContain("Tokens generated successfully!");

    const json = JSON.parse(fs.readFileSync(path.join(defOutDir, "tokens.json"), "utf-8"));
    // Keys are type-prefixed and camelCased by the Json generator
    expect(json).toHaveProperty("borderRadiusRadiusSm");
  });
});

// ─── Token file with named `tokens` export ───────────────────

describe("cli: named tokens export", () => {
  const namedOutDir = path.join(tmpDir, "named-export-out");
  const tokenFile = path.join(tmpDir, "named-export-tokens.ts");

  beforeAll(() => {
    fs.writeFileSync(
      tokenFile,
      `export const tokens = [
  { name: "space-sm", type: "spacing", value: "4px" },
  { name: "space-md", type: "spacing", value: "8px" },
];`,
    );
  });

  test("handles named `tokens` export", () => {
    const { stdout, code } = run(tokenFile, `--outDir=${namedOutDir}`, '--generators="Json"');
    expect(code).toBe(0);
    expect(stdout).toContain("Tokens generated successfully!");

    const json = JSON.parse(fs.readFileSync(path.join(namedOutDir, "tokens.json"), "utf-8"));
    // Keys are type-prefixed and camelCased by the Json generator
    expect(json).toHaveProperty("spacingSpaceSm");
  });
});

// ─── Invalid generator name ─────────────────────────────────

describe("cli: invalid generator name", () => {
  const fallbackOutDir = path.join(tmpDir, "fallback-gen-out");

  test("falls back to Json for unknown generator names", () => {
    const { stdout, code } = run(
      "example/raw-tokens.ts",
      `--outDir=${fallbackOutDir}`,
      '--generators="NonexistentGenerator"',
    );
    expect(code).toBe(0);
    // getGenerators() falls back to Json when no valid generators match
    expect(fs.existsSync(path.join(fallbackOutDir, "tokens.json"))).toBe(true);
  });
});
