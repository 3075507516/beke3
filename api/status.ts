export function GET() {
  return new Response(
    JSON.stringify({
      success: true,
      channelOnline: false,
      status: 'standalone',
      message: 'Running on Vercel standalone mode with local IndexedDB persistence',
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
}
