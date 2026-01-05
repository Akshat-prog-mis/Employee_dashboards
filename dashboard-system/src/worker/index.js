export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('target');

    if (!target) {
      return new Response('Missing target', { status: 400 });
    }

    const resp = await fetch(target, {
      method: request.method,
      headers: { 'Content-Type': request.headers.get('Content-Type') || 'application/x-www-form-urlencoded' },
      body: request.method === 'POST' ? await request.text() : null
    });

    return new Response(await resp.text(), {
      status: resp.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
};
