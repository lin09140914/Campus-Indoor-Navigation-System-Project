import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

// Bundle the renderer only. Floor drawings are requested at runtime.
const bundle = await build({
  entryPoints: ['src/viewer.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2022',
  legalComments: 'inline',
  write: false,
});
const [template, css, license] = await Promise.all([
  readFile('src/viewer.html', 'utf8'),
  readFile('src/viewer.css', 'utf8'),
  readFile('node_modules/three/LICENSE', 'utf8'),
]);
const script = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const page = template.replace('/*__CSS__*/', () => css)
  .replace('/*__SCRIPT__*/', () => '/*!\n' + license + '\n*/\n' + script);
await writeFile('viewer.html', page);
console.log('Built viewer.html');
