// Cloudflare Pages Functions API Handler
// Routes: /api/*

interface Env {
  DB?: any;      // Cloudflare D1 Database binding
  R2_BUCKET?: any; // Cloudflare R2 Bucket binding
  KV?: any;     // Cloudflare KV Namespace binding
}

export const onRequest = async (context: any) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');

  // CORS Headers
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Health check & bindings status
  if (path === '/status' || path === '') {
    return new Response(JSON.stringify({
      status: 'ok',
      version: '3.0.0',
      cloudServices: {
        d1: Boolean(env.DB),
        r2: Boolean(env.R2_BUCKET),
        kv: Boolean(env.KV),
      },
      timestamp: Date.now(),
    }), {
      headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
    });
  }

  // Cloudflare R2 Upload Handler
  if (path === '/upload' && request.method === 'POST') {
    if (!env.R2_BUCKET) {
      return new Response(JSON.stringify({
        success: false,
        fallbackToLocal: true,
        message: 'R2 binding not configured on this host. Use fallback storage.',
      }), {
        status: 200,
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file uploaded' }), {
          status: 400,
          headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
        });
      }

      const key = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      await env.R2_BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
      });

      const publicUrl = `/api/files/${key}`;
      return new Response(JSON.stringify({
        success: true,
        key,
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type
      }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'R2 upload failed' }), {
        status: 500,
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
  }

  // Cloudflare R2 File Access
  if (path.startsWith('/files/')) {
    const key = path.replace('/files/', '');
    if (!env.R2_BUCKET) {
      return new Response('R2 not enabled', { status: 404 });
    }
    const object = await env.R2_BUCKET.get(key);
    if (!object) {
      return new Response('File not found', { status: 404 });
    }
    const responseHeaders = new Headers(headers);
    object.writeHttpMetadata(responseHeaders);
    responseHeaders.set('etag', object.httpEtag);
    return new Response(object.body, { headers: responseHeaders });
  }

  // D1 Database query proxy
  if (path === '/d1/query' && request.method === 'POST') {
    if (!env.DB) {
      return new Response(JSON.stringify({ success: false, fallbackToLocal: true }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
    try {
      const { sql, params = [] } = await request.json() as any;
      const stmt = env.DB.prepare(sql).bind(...params);
      const result = await stmt.all();
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
  }

  // KV Cache / Room Sync
  if (path.startsWith('/kv/')) {
    const kvKey = path.replace('/kv/', '');
    if (!env.KV) {
      return new Response(JSON.stringify({ fallbackToLocal: true }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
    if (request.method === 'GET') {
      const val = await env.KV.get(kvKey);
      return new Response(JSON.stringify({ value: val ? JSON.parse(val) : null }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
    if (request.method === 'POST') {
      const body = await request.json();
      await env.KV.put(kvKey, JSON.stringify(body));
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ message: 'fox3 Cloudflare API Ready' }), {
    headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
  });
};
