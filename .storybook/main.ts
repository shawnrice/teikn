import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../example/dist/**/*.stories.tsx'],
  framework: '@storybook/react-vite',
  typescript: { reactDocgen: false },
  // Force Vite to pre-bundle React so a synthetic `default` export exists.
  // Without this, modules doing `import React from "react"` fail against
  // React's raw CJS entry ("does not provide an export named 'default'").
  viteFinal: async cfg => ({
    ...cfg,
    optimizeDeps: {
      ...cfg.optimizeDeps,
      include: [...(cfg.optimizeDeps?.include ?? []), 'react', 'react-dom', 'react/jsx-runtime'],
    },
  }),
};

export default config;
