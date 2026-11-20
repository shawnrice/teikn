import { createSeedResolver } from './resolve.js';
import type { KeyAliasIndex } from './token-keys.js';
import { ambiguousKeyMessage, buildKeyAliasIndex, resolveKey, tokenKey } from './token-keys.js';
import type { CompositeValue, Token } from './Token.js';
import { Color } from './TokenTypes/Color/index.js';
import { hasRefFields } from './TokenTypes/ref-guard.js';
import { isFirstClassValue } from './type-classifiers.js';

export type ValidationSeverity = 'error' | 'warning';

export type ValidationIssue = { severity: ValidationSeverity; token: string; message: string };

export type ValidationResult = { valid: boolean; issues: ValidationIssue[] };

const REF_PATTERN = /^\{([^}]+)\}$/;

const isComposite = (v: unknown): v is CompositeValue =>
  typeof v === 'object' && v !== null && !isFirstClassValue(v) && !Array.isArray(v);

const isRef = (value: unknown): value is string =>
  typeof value === 'string' && REF_PATTERN.test(value);

const COLOR_TYPES = new Set(['color']);
const COMPOSITE_TYPES = new Set(['typography', 'border', 'shadow', 'transition', 'gradient']);

const TYPOGRAPHY_FIELDS = new Set([
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
]);
const BORDER_FIELDS = new Set(['width', 'style', 'color']);
const SHADOW_FIELDS = new Set(['color', 'offsetX', 'offsetY', 'blur', 'spread']);
const TRANSITION_FIELDS = new Set(['duration', 'timingFunction']);

const validateCompositeShape = (type: string, value: CompositeValue): string | null => {
  const keys = new Set(Object.keys(value));
  const check = (expected: Set<string>, label: string) => {
    const missing = [...expected].filter(k => !keys.has(k));

    if (missing.length > 0) {
      return `${label} composite is missing fields: ${missing.join(', ')}`;
    }

    return null;
  };

  switch (type) {
    case 'typography':
      return check(TYPOGRAPHY_FIELDS, 'Typography');
    case 'border':
      return check(BORDER_FIELDS, 'Border');
    case 'shadow':
      return check(SHADOW_FIELDS, 'Shadow');
    case 'transition':
      return check(TRANSITION_FIELDS, 'Transition');
    default:
      return null;
  }
};

const checkRef = (
  refValue: string,
  tokenKeys: KeyAliasIndex,
  tokenName: string,
  missingDescription: string,
  labelPrefix: string,
  issue: (severity: ValidationSeverity, tokenName: string, message: string) => void,
): void => {
  const refName = refValue.match(REF_PATTERN)![1]!;
  const resolved = resolveKey(refName, tokenKeys);

  switch (resolved.status) {
    case 'ok':
      return;
    case 'missing':
      issue('error', tokenName, `${labelPrefix}${missingDescription}: {${refName}}`);

      return;
    case 'ambiguous':
      issue(
        'error',
        tokenName,
        `${labelPrefix}${ambiguousKeyMessage(refName, resolved.candidates)}`,
      );

      return;
  }
};

/** Applied to both `token.value` and each `token.modes[x]`. */
const validateValue = (
  value: unknown,
  token: Token,
  label: string,
  tokenKeys: KeyAliasIndex,
  issue: (severity: ValidationSeverity, tokenName: string, message: string) => void,
): void => {
  if (value === '') {
    issue('warning', token.name, `${label}Empty string value`);
  }

  if (
    COLOR_TYPES.has(token.type) &&
    typeof value === 'string' &&
    !isRef(value) &&
    !Color.tryParse(value)
  ) {
    issue('warning', token.name, `${label}Color value "${value}" could not be parsed`);
  }

  if (COMPOSITE_TYPES.has(token.type) && isComposite(value)) {
    const shapeError = validateCompositeShape(token.type, value as CompositeValue);

    if (shapeError) {
      issue('warning', token.name, `${label}${shapeError}`);
    }
  }

  // Walk the value the way `resolveReferences` does — arrays, nested plain
  // objects and wrapper fields — so every ref it would follow is checked here.
  // First-class wrappers (Typography, Border, BoxShadow, Gradient) carry their
  // fields behind private state; inspect them through the RefFields protocol so
  // per-field references get the same unresolved/ambiguous checks as plain
  // composites. Recurse into arrays and nested wrappers so refs buried inside a
  // gradient's stops (an array of `{ color, position }`) are still caught.
  const checkRefs = (field: string, fieldValue: unknown): void => {
    const at = (key: string): string => (field ? `${field}.${key}` : key);

    if (isRef(fieldValue)) {
      checkRef(
        fieldValue,
        tokenKeys,
        token.name,
        field ? `Unresolved reference in field "${field}"` : 'Unresolved reference',
        label,
        issue,
      );

      return;
    }

    if (Array.isArray(fieldValue)) {
      fieldValue.forEach(item => checkRefs(field, item));

      return;
    }

    if (hasRefFields(fieldValue)) {
      for (const [k, v] of Object.entries(fieldValue.__teikn_fields__())) {
        checkRefs(at(k), v);
      }

      return;
    }

    if (isComposite(fieldValue)) {
      for (const [k, v] of Object.entries(fieldValue as CompositeValue)) {
        checkRefs(at(k), v);
      }
    }
  };

  checkRefs('', value);
};

type CheckResolvesArgs = {
  tokens: Token[];
  modeNames: string[];
  issue: (severity: ValidationSeverity, tokenName: string, message: string) => void;
};

// A reference can exist and still not fit where it is used (a wrapper's color
// field pointing at a dimension). Only resolving shows that, and only once
// every reference is known to resolve.
const checkResolves = ({ tokens, modeNames, issue }: CheckResolvesArgs): void => {
  const resolve = createSeedResolver(tokens);

  for (const token of tokens) {
    for (const mode of [undefined, ...modeNames]) {
      const own =
        mode !== undefined && token.modes && Object.hasOwn(token.modes, mode)
          ? token.modes[mode]
          : undefined;

      const { error } = resolve(own ?? token.value, tokenKey(token), mode);

      if (error !== undefined) {
        issue('error', token.name, `${mode === undefined ? '' : `[mode "${mode}"] `}${error}`);
        break;
      }
    }
  }
};

/**
 * Validate a set of tokens for common issues.
 *
 * Checks:
 * - Required fields (name, value, type)
 * - Duplicate token names, and distinct tokens sharing a default output name (`type-name`)
 * - Color values are parseable
 * - References point to existing tokens
 * - No circular references
 * - Composite token shapes match expected fields
 * - Mode values pass the same checks as the main value
 *
 * @example
 * ```ts
 * const result = validate(myTokens);
 * if (!result.valid) {
 *   result.issues.forEach(i => console.error(`[${i.severity}] ${i.token}: ${i.message}`));
 * }
 * ```
 */
export const validate = (tokens: Token[]): ValidationResult => {
  const issues: ValidationIssue[] = [];
  const names = new Map<string, number>();
  const emitted = new Map<string, string>();
  const tokenMap = new Map<string, Token>();

  const issue = (severity: ValidationSeverity, token: string, message: string) => {
    issues.push({ severity, token, message });
  };

  // Build name index + check for required fields and duplicates
  for (const [i, token] of tokens.entries()) {
    const label = token.name || `[index ${i}]`;

    if (!token.name) {
      issue('error', label, 'Missing required field: name');
    }

    if (token.value === undefined || token.value === null) {
      issue('error', label, 'Missing required field: value');
    }

    if (!token.type) {
      issue('error', label, 'Missing required field: type');
    }

    if (token.name?.includes('.')) {
      issue(
        'error',
        label,
        `Token name must not contain "." — the dot is reserved as the group/name separator. ` +
          `Rename the token, or split the path into \`group\` + \`name\`.`,
      );
    }

    if (token.group?.includes('.')) {
      issue(
        'error',
        label,
        `Token group "${token.group}" must not contain "." — the dot is reserved as the group/name separator.`,
      );
    }

    if (token.name) {
      const qualifiedName = tokenKey(token);
      const count = (names.get(qualifiedName) ?? 0) + 1;
      names.set(qualifiedName, count);

      if (count === 2) {
        issue(
          'error',
          token.name,
          `Duplicate qualified token name "${qualifiedName}" — two tokens resolve to the same key. ` +
            `The resolver picks one non-deterministically; rename one of the tokens.`,
        );
      }

      // Generators emit `type-name` by default, so two keys can share one output name.
      const outputName = `${token.type}-${token.name}`;
      const prior = emitted.get(outputName);

      if (prior === undefined) {
        emitted.set(outputName, qualifiedName);
      } else if (prior !== qualifiedName) {
        issue(
          'error',
          token.name,
          `Duplicate output name "${outputName}" — tokens "${prior}" and "${qualifiedName}" are both emitted under it. ` +
            `Rename one of the tokens or change its type.`,
        );
      }

      tokenMap.set(qualifiedName, token);
    }
  }

  const tokenKeys = buildKeyAliasIndex([...tokenMap.keys()]);

  // Validate values (main + modes)
  for (const token of tokens) {
    if (!token.name || token.value === undefined) {
      continue;
    }

    validateValue(token.value, token, '', tokenKeys, issue);

    if (token.modes) {
      for (const [mode, modeValue] of Object.entries(token.modes)) {
        validateValue(modeValue, token, `[mode "${mode}"] `, tokenKeys, issue);
      }
    }
  }

  // Walks refs (follow the chain) and composites (visit each field). With a
  // `mode`, a referenced token is followed through its value for that mode,
  // exactly as the resolver does, so only cycles the resolver would hit count.
  const checkCircularValue = (
    value: unknown,
    originName: string,
    visited: Set<string>,
    mode?: string,
  ): boolean => {
    if (Array.isArray(value)) {
      return value.some(item => checkCircularValue(item, originName, visited, mode));
    }

    if (isComposite(value)) {
      for (const fieldValue of Object.values(value as CompositeValue)) {
        if (checkCircularValue(fieldValue, originName, visited, mode)) {
          return true;
        }
      }

      return false;
    }

    if (hasRefFields(value)) {
      for (const fieldValue of Object.values(value.__teikn_fields__())) {
        if (checkCircularValue(fieldValue, originName, visited, mode)) {
          return true;
        }
      }

      return false;
    }

    if (!isRef(value)) {
      return false;
    }

    const refName = value.match(REF_PATTERN)![1]!;
    const resolved = resolveKey(refName, tokenKeys);

    if (resolved.status !== 'ok') {
      return false;
    }

    if (visited.has(resolved.key)) {
      issue('error', originName, `Circular reference: ${[...visited, refName].join(' -> ')}`);

      return true;
    }

    // invariant: tokenKeys mirrors tokenMap
    const referenced = tokenMap.get(resolved.key)!;
    const next = new Set(visited);
    next.add(resolved.key);

    const modeValue =
      mode !== undefined && referenced.modes && Object.hasOwn(referenced.modes, mode)
        ? referenced.modes[mode]
        : undefined;

    return checkCircularValue(modeValue ?? referenced.value, originName, next, mode);
  };

  const modeNames = [...new Set(tokens.flatMap(t => Object.keys(t.modes ?? {})))];

  for (const token of tokens) {
    if (!token.name) {
      continue;
    }

    const visited = new Set([tokenKey(token)]);

    if (checkCircularValue(token.value, token.name, visited)) {
      continue;
    }

    // One report per token: stop at the first mode whose chain cycles.
    for (const mode of modeNames) {
      const own = token.modes && Object.hasOwn(token.modes, mode) ? token.modes[mode] : undefined;

      if (checkCircularValue(own ?? token.value, token.name, visited, mode)) {
        break;
      }
    }
  }

  if (issues.every(i => i.severity !== 'error')) {
    checkResolves({ tokens, modeNames, issue });
  }

  return { valid: issues.filter(i => i.severity === 'error').length === 0, issues };
};
