export default {
  async fetch(request, env) {
    // simple health & example API
    if (request.method === 'GET') {
      return new Response(JSON.stringify({ ok: true, time: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Not found', { status: 404 });
  }
}
