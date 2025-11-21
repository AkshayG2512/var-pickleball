const WORKER_BASE = process.env.REACT_APP_WORKER_URL || "https://var-pickleball-worker.akshaygujar100.workers.dev";

async function api(path, opts = {}) {
  const res = await fetch(`${WORKER_BASE}${path}`, opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

export async function createMatch(players = []) {
  return api("/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ players }),
  });
}

export async function getMatch(id) {
  return api(`/matches/${id}`);
}

export async function addEvent(id, type, payload = {}) {
  return api(`/matches/${id}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload }),
  });
}

export async function uploadSnapshot(id, file) {
  const res = await fetch(`${WORKER_BASE}/matches/${id}/snapshot`, {
    method: "POST",
    headers: { "Content-Type": file.type || "image/jpeg" },
    body: file,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Snapshot failed: ${res.status} ${txt}`);
  }
  return res.json();
}
