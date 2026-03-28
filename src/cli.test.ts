import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ─── Helpers ─────────────────────────────────────────────────

const CLI = path.resolve(__dirname, "cli.ts");

const run = (...args: string[]) => {
  const result = spawnSync("bun", ["run", CLI, ...args], {
    cwd: path.resolve(__dirname, ".."),
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

// ─── Built-in commands ───────────────────────────────────────

describe("cli: help", () => {
  test("prints usage info", () => {
    const { stdout, code } = run("help");
    expect(code).toBe(0);
    expect(stdout).toContain("Teikn");
    expect(stdout).toContain("Commands:");
    expect(stdout).toContain("Flags:");
  });
});

describe("cli: version", () => {
  test("prints version string", () => {
    const { stdout, code } = run("version");
    expect(code).toBe(0);
    expect(stdout).toMatch(/Teikn v\d+\.\d+\.\d+/);
  });
});

describe("cli: list", () => {
  test("list generators shows available generators", () => {
    const { stdout, code } = run("list", "generators");
    expect(code).toBe(0);
    expect(stdout).toContain("Available Generators:");
    expect(stdout).toContain("CssVars");
    expect(stdout).toContain("Scss");
    expect(stdout).toContain("Json");
    expect(stdout).toContain("EsModule");
  });

  test("list plugins shows available plugins", () => {
    const { stdout, code } = run("list", "plugins");
    expect(code).toBe(0);
    expect(stdout).toContain("Available Plugins:");
    expect(stdout).toContain("ColorTransformPlugin");
    expect(stdout).toContain("NameConventionPlugin");
  });

  test("list without argument prints error", () => {
    const { stderr, code } = run("list");
    // Exits with 0 but prints usage to stderr
    expect(stderr).toContain("generators | plugins");
  });
});

// ─── Validation ──────────────────────────────────────────────

describe("cli: validate", () => {
  test("validates example tokens successfully", () => {
    const { stdout, code } = run("validate", "example/raw-tokens.ts");
    expect(code).toBe(0);
    expect(stdout).toContain("No issues found");
  });

  test("exits with error for missing file", () => {
    const { stderr, code } = run("validate", "nonexistent.ts");
    expect(code).toBe(2);
    expect(stderr).toContain("validate");
  });
});

// ─── Token generation ────────────────────────────────────────

describe("cli: generate", () => {
  const tmpDir = path.join(os.tmpdir(), `teikn-cli-test-${Date.now()}`);

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("generates tokens from example file with default generator", () => {
    const outDir = path.join(tmpDir, "default-gen");
    const { stdout, code } = run("example/raw-tokens.ts", `--outDir=${outDir}`);
    expect(code).toBe(0);
    expect(stdout).toContain("Tokens generated successfully!");

    // Default generator is Json
    const jsonFile = path.join(outDir, "tokens.json");
    expect(fs.existsSync(jsonFile)).toBe(true);

    const json = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));
    expect(Object.keys(json).length).toBeGreaterThan(0);
  });

  test("generates with specific generators", () => {
    const outDir = path.join(tmpDir, "multi-gen");
    const { stdout, code } = run(
      "example/raw-tokens.ts",
      `--outDir=${outDir}`,
      '--generators="CssVars,Json"',
    );
    expect(code).toBe(0);
    expect(stdout).toContain("Tokens generated successfully!");

    expect(fs.existsSync(path.join(outDir, "tokens.css"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "tokens.json"))).toBe(true);
  });

  test("CSS output contains valid dimension values", () => {
    const outDir = path.join(tmpDir, "css-check");
    run("example/raw-tokens.ts", `--outDir=${outDir}`, '--generators="CssVars"');
    const css = fs.readFileSync(path.join(outDir, "tokens.css"), "utf-8");

    expect(css).toContain(":root {");
    expect(css).not.toContain("[object Object]");
    // No empty CSS values
    expect(css).not.toMatch(/--[\w-]+:\s*;/);
  });

  test("JSON output has correct token structure", () => {
    const outDir = path.join(tmpDir, "json-check");
    run("example/raw-tokens.ts", `--outDir=${outDir}`, '--generators="Json"');
    const json = JSON.parse(fs.readFileSync(path.join(outDir, "tokens.json"), "utf-8"));

    // Tokens should have value and type
    const firstKey = Object.keys(json)[0]!;
    expect(json[firstKey]).toHaveProperty("value");
    expect(json[firstKey]).toHaveProperty("type");

    // No values should be empty strings
    for (const [key, token] of Object.entries(json) as [string, any][]) {
      expect(token.value).not.toBe("");
      if (typeof token.value === "string") {
        expect(token.value).not.toBe("[object Object]");
      }
    }
  });

  test("--dry-run shows output without writing files", () => {
    const dryDir = path.join(tmpDir, "dry");
    const { stdout, code } = run("example/raw-tokens.ts", `--outDir=${dryDir}`, "--dry-run");
    expect(code).toBe(0);
    expect(stdout).toContain("Dry run");
    expect(fs.existsSync(dryDir)).toBe(false);
  });
});

// ─── Error handling ──────────────────────────────────────────

describe("cli: error handling", () => {
  test("exits with error for unsupported file extension", () => {
    const { stderr, code } = run("tokens.xyz");
    expect(code).not.toBe(0);
    expect(stderr).toContain("unsupported");
  });

  test("exits with error for nonexistent file", () => {
    const { stderr, code } = run("nonexistent-file.ts");
    expect(code).not.toBe(0);
  });

  test("no arguments shows usage", () => {
    const { stdout, code } = run();
    expect(code).toBe(2);
  });
});
