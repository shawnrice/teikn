import type {
  CompositeValue,
  Token,
} from './Token';
import { Color } from './TokenTypes/Color';
import { isFirstClassValue } from './type-classifiers';

export type ValidationSeverity = 'error' | 'warning';

export type ValidationIssue = {
  severity: ValidationSeverity;
  token: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

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

const tryParseColor = (value: string): boolean => {
  try {
    new Color(value);
    return true;
  } catch {
    return false;
  }
};

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

/**
 * Validate a single value (main or mode) for common issues.
 * Factored out so both token.value and token.modes[x] use the same checks.
 */
const validateValue = (
  value: unknown,
  token: Token,
  label: string,
  tokenMap: Map<string, Token>,
  issue: (severity: ValidationSeverity, tokenName: string, message: string) => void,
): void => {
  // Check color parseability
  if (COLOR_TYPES.has(token.type) && typeof value === 'string' && !isRef(value)) {
    if (!tryParseColor(value)) {
      issue('warning', token.name, `${label}Color value "${value}" could not be parsed`);
    }
  }

  // Check references
  if (isRef(value)) {
    const refName = value.match(REF_PATTERN)![1]!;
    if (!tokenMap.has(refName)) {
      issue('error', token.name, `${label}Unresolved reference: {${refName}}`);
    }
  }

  // Check composite shapes
  if (COMPOSITE_TYPES.has(token.type) && isComposite(value)) {
    const shapeError = validateCompositeShape(token.type, value as CompositeValue);
    if (shapeError) {
      issue('warning', token.name, `${label}${shapeError}`);
    }
  }

  // Check for references in composite values
  if (isComposite(value)) {
    for (const [field, fieldValue] of Object.entries(value as CompositeValue)) {
      if (isRef(fieldValue)) {
        const refName = (fieldValue as string).match(REF_PATTERN)![1]!;
        if (!tokenMap.has(refName)) {
          issue(
            'error',
            token.name,
            `${label}Unresolved reference in field "${field}": {${refName}}`,
          );
        }
      }
    }
  }
};

/**
 * Validate a set of tokens for common issues.
 *
 * Checks:
 * - Required fields (name, value, type)
 * - Duplicate token names
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

    if (token.name) {
      const qualifiedName = token.group ? `${token.group}/${token.name}` : token.name;
      const count = (names.get(qualifiedName) ?? 0) + 1;
      names.set(qualifiedName, count);
      if (count === 2) {
        issue('warning', token.name, 'Duplicate token name');
      }
      tokenMap.set(token.name, token);
    }
  }

  // Validate values (main + modes)
  for (const token of tokens) {
    if (!token.name || token.value === undefined) {
      continue;
    }

    validateValue(token.value, token, '', tokenMap, issue);

    if (token.modes) {
      for (const [mode, modeValue] of Object.entries(token.modes)) {
        validateValue(modeValue, token, `[mode "${mode}"] `, tokenMap, issue);
      }
    }
  }

  // Check for circular references
  const checkCircular = (name: string, visited: Set<string>): boolean => {
    const token = tokenMap.get(name);
    if (!token) {
      return false;
    }

    const value = token.value;
    if (!isRef(value)) {
      return false;
    }

    const refName = (value as string).match(REF_PATTERN)![1]!;
    if (visited.has(refName)) {
      issue('error', name, `Circular reference: ${[...visited, refName].join(' -> ')}`);
      return true;
    }

    visited.add(refName);
    return checkCircular(refName, visited);
  };

  for (const token of tokens) {
    if (token.name && isRef(token.value)) {
      checkCircular(token.name, new Set([token.name]));
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
};
