// api.js - small wrapper for Worker endpoints
const WORKER_BASE = "https://var-pickleball-worker.akshaygujar100.workers.dev"; // Your Cloudflare Worker URL

export async function postEvent(matchId, eventJson) {
  const url = `${WORKER_BASE}/matches/${matchId}/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventJson),
  });
  // Ensure the Worker returns JSON and handle the response correctly
  if (res.ok) return res.json(); 
  throw new Error(`Failed to post event: ${res.statusText}`);
}

export async function uploadSnapshot(matchId, blob) {
  const url = `${WORKER_BASE}/matches/${matchId}/snapshot`;
  const form = new FormData();
  form.append("file", blob, "snap.jpg");
  const res = await fetch(url, { method: "POST", body: form });
  // Ensure the Worker returns JSON and handle the response correctly
  if (res.ok) return res.json();
  throw new Error(`Failed to upload snapshot: ${res.statusText}`);
}
