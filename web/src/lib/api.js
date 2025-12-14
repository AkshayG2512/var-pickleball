// src/lib/api.js - small wrapper for Worker endpoints
// Rules: KISS, DRY. Always include logging and error handling.
// NOTE: adapt WORKER_BASE if you move the worker endpoint.
const WORKER_BASE = "https://var-pickleball-worker.akshaygujar100.workers.dev";

/**
 * Helper to check fetch response and return JSON or throw a useful error.
 * Keeps response handling DRY.
 */
async function _handleJsonResponse(res, context = '') {
  try {
    if (res.ok) {
      // Try parse JSON; if no body, return null
      const text = await res.text();
      if (!text) return null;
      return JSON.parse(text);
    }
    const body = await res.text().catch(() => '');
    const msg = `Request failed${context ? ' ('+context+')' : ''}: ${res.status} ${res.statusText}` +
                (body ? ` - ${body}` : '');
    throw new Error(msg);
  } catch (err) {
    // Re-throw with context
    throw new Error(`_handleJsonResponse error${context ? ' ('+context+')' : ''}: ${err.message}`);
  }
}

/**
 * postEvent(matchId, eventJson)
 * POST an event JSON to the worker for a given match.
 */
export async function postEvent(matchId, eventJson) {
  const url = `${WORKER_BASE}/matches/${matchId}/events`;
  try {
    console.debug('[api] postEvent ->', url, eventJson);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventJson),
    });
    return await _handleJsonResponse(res, 'postEvent');
  } catch (err) {
    console.error('[api] postEvent error:', err);
    throw err;
  }
}

/**
 * uploadSnapshot(matchId, blob)
 * Uploads a snapshot image to the worker.
 */
export async function uploadSnapshot(matchId, blob) {
  const url = `${WORKER_BASE}/matches/${matchId}/snapshot`;
  try {
    console.debug('[api] uploadSnapshot ->', url, blob && blob.size ? `${blob.size} bytes` : blob);
    const form = new FormData();
    form.append("file", blob, "snap.jpg");
    const res = await fetch(url, { method: "POST", body: form });
    return await _handleJsonResponse(res, 'uploadSnapshot');
  } catch (err) {
    console.error('[api] uploadSnapshot error:', err);
    throw err;
  }
}

/**
 * createMatch(payload = {})
 * Create a new match on the worker. Returns created match JSON.
 * Minimal, KISS implementation: caller provides the payload expected by the worker.
 */
export async function createMatch(payload = {}) {
  const url = `${WORKER_BASE}/matches`;
  try {
    console.debug('[api] createMatch ->', url, payload);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await _handleJsonResponse(res, 'createMatch');
  } catch (err) {
    console.error('[api] createMatch error:', err);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// Added getMatch: fetch match by id (KISS, DRY, logging & error handling)
// -----------------------------------------------------------------------------
export async function getMatch(matchId) {
  const url = `${WORKER_BASE}/matches/${matchId}`;
  try {
    console.debug('[api] getMatch ->', url);
    const res = await fetch(url, { method: 'GET' });
    return await _handleJsonResponse(res, 'getMatch');
  } catch (err) {
    console.error('[api] getMatch error:', err);
    throw err;
  }
}
