// Bundle le script de détection en IIFE et l'écrit comme chaîne TypeScript importable par la WebView.
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';

const result = await build({
  entryPoints: ['src/detection/entry.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2019',
  minify: true,
  write: false,
});

const code = result.outputFiles[0].text;
const header = '// Généré par scripts/build-injected.mjs — ne pas modifier à la main.\n';
await writeFile(
  'src/detection/injected.generated.ts',
  `${header}export const INJECTED_DETECTION = ${JSON.stringify(`${code}\ntrue;`)};\n`,
);
console.log(`injected.generated.ts : ${code.length} octets`);
