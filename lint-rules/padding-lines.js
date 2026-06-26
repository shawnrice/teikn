// Enforces blank lines around blocks and before exit statements.
//
// Two rules in one:
// 1. Before exit statements: return, throw, standalone yield*
// 2. Around blocks: any statement after a closing `}` needs a blank line,
//    and block statements (if, for, while, switch, try) need one before them.
//
// Comments attached above the statement are treated as part of the unit —
// the blank line goes above the comment, not between comment and statement.
//
// Skips:
// - First/only statement in a block
// - Continuations: else, else if, catch, finally (same construct)
// - yield* as RHS of an assignment (const x = yield* Foo)

const findEffectiveStart = (sourceCode, node) => {
  let current = node;

  // eslint-disable-next-line no-constant-condition -- walk until break
  while (true) {
    const prev = sourceCode.getTokenBefore(current, { includeComments: true });

    if (!prev) {
      break;
    }

    const isComment = prev.type === 'Line' || prev.type === 'Block';
    const isAdjacent = current.loc.start.line - prev.loc.end.line <= 1;

    if (isComment && isAdjacent) {
      current = prev;
    } else {
      break;
    }
  }

  return current;
};

const hasBlankLineBefore = (sourceCode, effectiveStart) => {
  const tokenBefore = sourceCode.getTokenBefore(effectiveStart, { includeComments: true });

  if (!tokenBefore) {
    return true;
  }

  return effectiveStart.loc.start.line - tokenBefore.loc.end.line >= 2;
};

const isFirstStatementInBlock = node => {
  const { parent } = node;

  if (!parent) {
    return false;
  }

  if (parent.type === 'BlockStatement' || parent.type === 'Program') {
    return parent.body[0] === node;
  }

  if (parent.type === 'SwitchCase') {
    return parent.consequent[0] === node;
  }

  return false;
};

const isOnlyStatementInBlock = node => {
  const { parent } = node;

  if (!parent) {
    return false;
  }

  if (parent.type === 'BlockStatement') {
    return parent.body.length === 1;
  }

  if (parent.type === 'SwitchCase') {
    return parent.consequent.length === 1;
  }

  return false;
};

const isAfterOpeningBrace = (sourceCode, node) => {
  const tokenBefore = sourceCode.getTokenBefore(node, { includeComments: false });

  if (!tokenBefore) {
    return true;
  }

  return tokenBefore.value === '{' || tokenBefore.value === ':';
};

const getPrevCodeToken = (sourceCode, node) =>
  sourceCode.getTokenBefore(node, { includeComments: false });

const isAfterClosingBrace = (sourceCode, node) => {
  const prev = getPrevCodeToken(sourceCode, node);

  return prev?.value === '}';
};

// else, else if, catch, finally — continuations of the same block construct
const isBlockContinuation = node => {
  if (
    node.type === 'IfStatement' &&
    node.parent?.type === 'IfStatement' &&
    node.parent.alternate === node
  ) {
    return true;
  }

  return false;
};

const BLOCK_TYPES = new Set([
  'IfStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'SwitchStatement',
  'TryStatement',
]);

const EXIT_TYPES = new Set(['ReturnStatement', 'ThrowStatement']);

const rule = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    messages: {
      missingBlankLine: 'Expected blank line before {{type}}.',
      missingBlankLineAfterBlock: 'Expected blank line after block.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    const requireBlankBefore = (node, messageId, data) => {
      if (isFirstStatementInBlock(node)) {
        return;
      }

      if (isOnlyStatementInBlock(node)) {
        return;
      }

      if (isAfterOpeningBrace(sourceCode, node)) {
        return;
      }

      const effectiveStart = findEffectiveStart(sourceCode, node);

      if (hasBlankLineBefore(sourceCode, effectiveStart)) {
        return;
      }

      context.report({
        node,
        messageId,
        data,
        fix(fixer) {
          const tokenBefore = sourceCode.getTokenBefore(effectiveStart, { includeComments: true });

          return fixer.insertTextAfter(tokenBefore, '\n');
        },
      });
    };

    const checkStatement = node => {
      // Rule 1: after a closing brace, any statement needs a blank line
      // (except block continuations like else/catch/finally)
      if (isAfterClosingBrace(sourceCode, node) && !isBlockContinuation(node)) {
        requireBlankBefore(node, 'missingBlankLineAfterBlock', {});

        return;
      }

      // Rule 2: block statements need a blank line before them
      if (BLOCK_TYPES.has(node.type) && !isBlockContinuation(node)) {
        const label = node.type.replace('Statement', '').toLowerCase();
        requireBlankBefore(node, 'missingBlankLine', { type: label });

        return;
      }

      // Rule 3: exit statements need a blank line before them
      if (EXIT_TYPES.has(node.type)) {
        const label = node.type === 'ReturnStatement' ? 'return' : 'throw';
        requireBlankBefore(node, 'missingBlankLine', { type: label });

        return;
      }

      // Rule 4: standalone yield* expressions
      if (node.type === 'ExpressionStatement' && node.expression?.type === 'YieldExpression') {
        requireBlankBefore(node, 'missingBlankLine', { type: 'yield' });
      }
    };

    // Visit every statement inside block bodies
    return {
      'BlockStatement > *'(node) {
        checkStatement(node);
      },
      'SwitchCase > *'(node) {
        checkStatement(node);
      },
      'Program > *'(node) {
        checkStatement(node);
      },
    };
  },
};

const plugin = { meta: { name: 'padding-lines' }, rules: { 'before-exit': rule } };

// eslint-disable-next-line import/no-default-export -- oxlint jsPlugins API requires default export
export default plugin;
