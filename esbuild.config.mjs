import { buildPlugin } from './src/shared/build.mjs';

let deployTargets = [];
try { ({ deployTargets = [] } = await import('./esbuild.local.mjs')); } catch { /* no local config */ }

await buildPlugin({
  name: 'Heading Linker',
  platform: 'browser',
  external: [
    'obsidian', 'electron',
    '@codemirror/state', '@codemirror/view', '@codemirror/language',
    '@lezer/common', '@lezer/highlight', '@lezer/lr',
  ],
  kind: 'prose',
  prefix: 'heading',
  deployTargets,
});
