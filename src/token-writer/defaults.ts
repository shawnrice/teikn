import { ColorTransformPlugin } from '../Plugins/ColorTransformPlugin';
import { Plugin } from '../Plugins/Plugin';

export interface TeiknOptions {
  outDir: string;
  baseName?: string;

  plugins: Plugin[];
  // transformers:
}

export const defaults = {
  javascript: 'esm',

  plugins: [ColorTransformPlugin],
};
