export default {
  async fetch(request) {
    const url = new URL(request.url);

    const target = url.searchParams.get('target');
    if (!target) {
      return new Response(
        JSON.stringify({ error: 'Missing target' }),
        { status: 400 }
      );
    }

    const targetUrl = new URL(target);

    // 🔥 Forward ALL remaining query params
    url.searchParams.forEach((value, key) => {
      if (key !== 'target') {
        targetUrl.searchParams.set(key, value);
      }
    });

    const res = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json'
      },
      body: request.method === 'GET' ? null : request.body
    });

    const headers = new Headers(res.headers);
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(res.body, {
      status: res.status,
      headers
    });
  }
};
