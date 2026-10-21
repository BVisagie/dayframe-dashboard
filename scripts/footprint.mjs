import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const css = await readFile('src/styles/app.scss', 'utf8');
const result = {
  bootstrap: '6.0.0-alpha.1',
  appCssBytes: Buffer.byteLength(css),
  appCssGzipBytes: gzipSync(css).length,
};
await mkdir('dist', { recursive: true });
await writeFile(
  'dist/css-footprint.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  `App CSS: ${result.appCssBytes} bytes (${result.appCssGzipBytes} gzip)`,
);
