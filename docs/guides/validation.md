# Validation

Validate tokens before generation to catch common issues.

```typescript
import { validate } from 'teikn';

const result = validate(allTokens);
// result.valid: boolean
// result.issues: { severity: 'error' | 'warning', token: string, message: string }[]

if (!result.valid) {
  for (const issue of result.issues) {
    console.error(`[${issue.severity}] ${issue.token}: ${issue.message}`);
  }
  process.exit(1);
}
```

Checks for:

- Missing required fields
- Duplicate names
- Unparseable colors
- Invalid references
- Circular references
- Composite token shape validation

Validation also runs inside modes and across theme layers, so a bad override or a circular reference
introduced by a theme is caught too.

For accessibility checks (contrast, minimum font size, touch targets, perceptual distance), see the
audit plugins in [Plugins](../api/plugins.md#audit-plugins-accessibility). Those report issues
without modifying tokens, the same shape `validate()` returns.
