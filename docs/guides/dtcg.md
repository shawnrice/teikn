# DTCG Interoperability

Import and export tokens in the W3C [Design Token Community Group](https://www.designtokens.org/)
format for use with tools like Style Dictionary and Tokens Studio.

```typescript
import { parseDtcg, serializeDtcg } from 'teikn';

// Import from DTCG
const tokens = parseDtcg(dtcgDocument, { separator: '.' });

// Export to DTCG
const dtcg = serializeDtcg(tokens, { hierarchical: true });
```

To emit a `.tokens.json` file as part of a normal build, add the `Dtcg` generator instead — see
[Generators](../api/generators.md).

Composed values (a `Transition` built from a shared `Duration`, a `BoxShadow` built from a shared
`Color`) serialize as DTCG aliases (`"{duration-fast}"`) rather than inlined values, so the
relationships survive a round trip. See [Composition recipes](../recipes/composition.md) for how
those references are formed.
