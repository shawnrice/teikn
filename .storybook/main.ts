import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../example/dist/**/*.stories.tsx'],
  framework: '@storybook/react-vite',
  typescript: {
    reactDocgen: false,
  },
};

export default config;
