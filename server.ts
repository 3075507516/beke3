import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import express, { type Request as ExpressRequest, type Response as ExpressResponse } from 'express';
import { createServer as createViteServer } from 'vite';
import { onRequest } from './functions/api/[[route]]';
import { getRuntimeEnv } from './server-env';

try {
  if (fs.existsSync(path.join(process.cwd(), '.env')) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch {
  // Ignore missing or unreadable .env
}

async function handleApiRequest(req: ExpressRequest, res: ExpressResponse) {
  try {
    const env = await getRuntimeEnv();
    const protoHeader = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
    const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').split(',')[0].trim();
    const requestUrl = `${protoHeader}://${hostHeader}${req.originalUrl}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) headers.append(key, item);
      } else {
        headers.set(key, value);
      }
    }
    if (!headers.has('cf-connecting-ip') && req.socket?.remoteAddress) {
      headers.set('cf-connecting-ip', req.socket.remoteAddress);
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const webRequest = new Request(requestUrl, {
      method: req.method,
      headers,
      ...(hasBody ? { body: Readable.toWeb(req) as any, duplex: 'half' } : {}),
    } as RequestInit);

    const webResponse: Response = await onRequest({ request: webRequest, env });

    res.status(webResponse.status);
    webResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    if (!webResponse.body || req.method === 'HEAD') {
      res.end();
      return;
    }

    const nodeStream = Readable.fromWeb(webResponse.body as any);
    nodeStream.on('error', () => {
      if (!res.headersSent) res.status(500);
      res.end();
    });
    nodeStream.pipe(res);
  } catch (error: any) {
    console.error('[server] API handler error:', error?.stack || error?.message || error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: '服务端 API 处理异常' });
    } else {
      res.end();
    }
  }
}

async function startServer() {
  await getRuntimeEnv();

  const app = express();
  app.disable('x-powered-by');

  // Route all /api and /api/* requests directly through the API handler with unparsed raw streams
  app.all(/^\/api(?:\/.*)?$/, (req, res) => {
    void handleApiRequest(req, res);
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { index: false }));
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`[fox3] Full-stack server listening on http://0.0.0.0:${port} (${isProduction ? 'production' : 'development'})`);
  });
}

void startServer();
