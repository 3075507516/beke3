const fs = require('fs');
const path = require('path');
const archiverModule = require('archiver');
const esbuild = require('esbuild');

const archiver = archiverModule.default || archiverModule;

const rootDir = path.resolve(__dirname, '..');
const distPath = path.join(rootDir, 'dist');
const zipPath = path.join(rootDir, 'dist-upload.zip');
const workerOutPath = path.join(distPath, '_worker.js');
const routesOutPath = path.join(distPath, '_routes.json');

async function buildPagesWorker() {
  const workerEntry = `
import { onRequest } from './functions/api/[[route]].ts';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return onRequest({
        request,
        env,
        params: {},
        waitUntil: typeof ctx?.waitUntil === 'function' ? ctx.waitUntil.bind(ctx) : () => {},
        next: () => (env?.ASSETS ? env.ASSETS.fetch(request) : new Response('Not Found', { status: 404 })),
        data: {},
      });
    }
    if (env?.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not Found', { status: 404 });
  },
};
`.trim();

  await esbuild.build({
    stdin: {
      contents: workerEntry,
      resolveDir: rootDir,
      sourcefile: '_worker-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    mainFields: ['browser', 'module', 'main'],
    minify: true,
    legalComments: 'none',
    external: ['cloudflare:*'],
    outfile: workerOutPath,
  });

  const compiledWorker = fs.readFileSync(workerOutPath, 'utf8');
  const forbiddenNodeImport = compiledWorker.match(/from\s*["']node:[^"']+["']|import\s*\(\s*["']node:[^"']+["']\s*\)/);
  if (forbiddenNodeImport) {
    throw new Error(`Cloudflare _worker.js contains disallowed Node builtin import: ${forbiddenNodeImport[0]}`);
  }

  const routesConfig = {
    version: 1,
    include: ['/api', '/api/*'],
    exclude: [],
  };
  fs.writeFileSync(routesOutPath, `${JSON.stringify(routesConfig, null, 2)}\n`, 'utf8');

  const workerKb = (fs.statSync(workerOutPath).size / 1024).toFixed(1);
  console.log(`[fox3 Packager] Built Cloudflare Pages Advanced Mode _worker.js (${workerKb} KiB) + _routes.json`);
}

function createDistZip() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    const output = fs.createWriteStream(zipPath);
    const archive = typeof archiver === 'function'
      ? archiver('zip', { zlib: { level: 9 } })
      : new archiverModule.ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => {
      const sizeMb = (archive.pointer() / (1024 * 1024)).toFixed(2);
      console.log(`[fox3 Packager] Successfully packed ${archive.pointer()} bytes (${sizeMb} MiB).`);
      console.log(`[fox3 Packager] Cloudflare Pages Direct Upload ready: ${distPath} & ${zipPath}`);
      resolve();
    });

    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(distPath, false);
    archive.finalize();
  });
}

async function main() {
  if (!fs.existsSync(distPath)) {
    console.error('Error: dist directory does not exist! Please run "npm run build" first.');
    process.exit(1);
  }

  await buildPagesWorker();
  await createDistZip();
}

main().catch((err) => {
  console.error('[fox3 Packager] Packaging failed:', err);
  process.exit(1);
});
