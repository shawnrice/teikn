# CLI

The `teikn` CLI runs a token file (or a config file) through the generators and plugins and writes
the output.

```bash
# Run with a config file (teikn.config.ts, teikn.config.js, or .teiknrc.js)
teikn

# Run with a token file and flags
teikn path/to/tokens.ts \
  --outDir=./dist \
  --generators="Scss,Json,JavaScript,CssVars,Html" \
  --plugins="ColorTransformPlugin,ScssQuoteValuePlugin"

# Watch mode
teikn --watch

# Dry run (show output without writing)
teikn --dry-run

# Validate tokens
teikn validate path/to/tokens.ts

# List available generators or plugins
teikn list generators
teikn list plugins
```

Generator and plugin names in `--generators` / `--plugins` match the class names documented in
[Generators](../api/generators.md) and [Plugins](../api/plugins.md).
