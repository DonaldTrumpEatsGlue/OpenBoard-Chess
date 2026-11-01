import { createReadStream } from 'node:fs';
import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { patchChessSource } from './src/custom-chess-patch.js';

const stockfishAssets = [
  'stockfish-19-single.js',
  'stockfish-19-single.wasm',
  'Copying.txt',
];

function stockfishAssetPath(fileName) {
  return resolve('node_modules/stockfish', fileName === 'Copying.txt' ? fileName : `bin/${fileName}`);
}

function stockfishFiles() {
  return {
    name: 'openboard-stockfish-files',
    configureServer(server) {
      server.middlewares.use('/stockfish', (request, response, next) => {
        const fileName = new URL(request.url, 'http://localhost').pathname.replace(/^\/+/, '');
        if (!stockfishAssets.includes(fileName)) {
          next();
          return;
        }

        response.setHeader('Content-Type', fileName.endsWith('.wasm')
          ? 'application/wasm'
          : fileName.endsWith('.js') ? 'text/javascript' : 'text/plain; charset=utf-8');
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        createReadStream(stockfishAssetPath(fileName))
          .on('error', next)
          .pipe(response);
      });
      server.middlewares.use('/vendor/chess.js', async (_request, response, next) => {
        try {
          const source = await readFile(resolve('node_modules/chess.js/chess.js'), 'utf8');
          response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          response.end(patchChessSource(source));
        } catch (error) {
          next(error);
        }
      });
    },
    async closeBundle() {
      const outputDirectory = resolve('dist/stockfish');
      await mkdir(outputDirectory, { recursive: true });
      await Promise.all(stockfishAssets.map((fileName) => copyFile(
        stockfishAssetPath(fileName),
        resolve(outputDirectory, fileName),
      )));

      const sourceScripts = resolve('src');
      const outputScripts = resolve('dist/src');
      const outputVendor = resolve('dist/vendor');
      await Promise.all([mkdir(outputScripts, { recursive: true }), mkdir(outputVendor, { recursive: true })]);
      await Promise.all([
        ...['main.js', 'piece-theme.js', 'piece-studio.js', 'sound-manifest.js'].map((fileName) => copyFile(
          resolve(sourceScripts, fileName),
          resolve(outputScripts, fileName),
        )),
        readFile(resolve('node_modules/chess.js/chess.js'), 'utf8')
          .then((source) => writeFile(resolve(outputVendor, 'chess.js'), patchChessSource(source))),
        copyFile(resolve('node_modules/chess.js/LICENSE'), resolve(outputVendor, 'chess-LICENSE')),
        cp(resolve('Audio'), resolve('dist/Audio'), { recursive: true }),
      ]);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [stockfishFiles()],
});
