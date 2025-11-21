export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, ""); // trim trailing slash
    const method = request.method;

    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    try {
      // POST /matches -> create match
      if (method === "POST" && path === "/matches") {
        const body = await request.json().catch(() => ({}));
        const id = crypto.randomUUID();
        const now = Math.floor(Date.now() / 1000);
        const players = body.players || [];
        const score = body.score || { p1: 0, p2: 0 };
        const events = [];

        await env.D1_VAR.prepare(
          `INSERT INTO matches (id, created_at, updated_at, players_json, score_json, events_json, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(id, now, now, JSON.stringify(players), JSON.stringify(score), JSON.stringify(events), "ongoing")
          .run();

        return json({ id, created_at: now, players, score });
      }

      // GET /matches/:id -> fetch match
      if (method === "GET" && path.startsWith("/matches/")) {
        const id = path.split("/")[2];
        if (!id) return json({ error: "missing id" }, 400);
        const row = await env.D1_VAR.prepare("SELECT * FROM matches WHERE id = ?").bind(id).first();
        if (!row) return json({ error: "not_found" }, 404);

        return json({
          id: row.id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          players: row.players_json ? JSON.parse(row.players_json) : [],
          score: row.score_json ? JSON.parse(row.score_json) : { p1: 0, p2: 0 },
          events: row.events_json ? JSON.parse(row.events_json) : [],
          status: row.status,
        });
      }

      // POST /matches/:id/events -> add event (point, challenge, undo)
      if (method === "POST" && /^\/matches\/[^/]+\/events$/.test(path)) {
        const id = path.split("/")[2];
        const body = await request.json().catch(() => ({}));
        const type = body.type || "event";
        const payload = body.payload || {};
        const ts = Math.floor(Date.now() / 1000);

        const row = await env.D1_VAR.prepare("SELECT * FROM matches WHERE id = ?").bind(id).first();
        if (!row) return json({ error: "not_found" }, 404);

        const events = row.events_json ? JSON.parse(row.events_json) : [];
        const score = row.score_json ? JSON.parse(row.score_json) : { p1: 0, p2: 0 };

        if (type === "point" && payload.player) {
          if (payload.player === "p1") score.p1 = (score.p1 || 0) + 1;
          if (payload.player === "p2") score.p2 = (score.p2 || 0) + 1;
          events.push({ type: "point", payload, ts });
        } else if (type === "undo") {
          const last = events.pop();
          if (last && last.type === "point" && last.payload && last.payload.player) {
            if (last.payload.player === "p1") score.p1 = Math.max(0, (score.p1 || 0) - 1);
            if (last.payload.player === "p2") score.p2 = Math.max(0, (score.p2 || 0) - 1);
          }
          events.push({ type: "undo", payload, ts });
        } else {
          events.push({ type, payload, ts });
        }

        await env.D1_VAR.prepare(
          `UPDATE matches SET score_json = ?, events_json = ?, updated_at = ? WHERE id = ?`
        )
          .bind(JSON.stringify(score), JSON.stringify(events), ts, id)
          .run();

        return json({ id, score, events });
      }

      // POST /matches/:id/snapshot -> upload image blob to R2
      if (method === "POST" && /^\/matches\/[^/]+\/snapshot$/.test(path)) {
        const id = path.split("/")[2];
        // accept binary (image) or JSON { data: base64 }
        const ct = request.headers.get("Content-Type") || "application/octet-stream";

        let buf;
        if (ct.includes("application/json")) {
          const body = await request.json().catch(() => ({}));
          if (!body.data) return json({ error: "missing data" }, 400);
          const b64 = body.data.replace(/^data:.*;base64,/, "");
          const decoded = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          buf = decoded.buffer;
        } else {
          buf = await request.arrayBuffer();
        }

        const key = `snapshots/${id}/${crypto.randomUUID()}.jpg`;
        await env.R2_MATCHES.put(key, buf, {
          httpMetadata: { contentType: ct.includes("image/") ? ct : "image/jpeg" },
        });

        return json({ ok: true, key });
      }

      // POST /matches/:id/resolve -> stub (placeholder)
      if (method === "POST" && /^\/matches\/[^/]+\/resolve$/.test(path)) {
        return json({ result: "inconclusive", confidence: 0.0 });
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};
