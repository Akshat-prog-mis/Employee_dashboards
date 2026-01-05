export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 🧠 Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      const url = new URL(request.url);
      const target = url.searchParams.get('target');

      if (!target) {
        return new Response(
          JSON.stringify({ error: 'Missing target' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const targetUrl = new URL(target);

      // 🔁 Forward remaining query params
      url.searchParams.forEach((value, key) => {
        if (key !== 'target') {
          targetUrl.searchParams.set(key, value);
        }
      });

      const init = {
        method: request.method,
        headers: {
          'Content-Type':
            request.headers.get('Content-Type') ||
            'application/x-www-form-urlencoded'
        }
      };

      // 🔥 Safely forward body for POST
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = await request.text();
      }

      const res = await fetch(targetUrl.toString(), init);
      const text = await res.text();

      return new Response(text, {
        status: res.status,
        headers: corsHeaders
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  }
};
