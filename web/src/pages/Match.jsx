import React, { useState } from "react";
import { createMatch, getMatch, addEvent, uploadSnapshot } from "../lib/api";

export default function Match() {
  const [matchId, setMatchId] = useState("");
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playersText, setPlayersText] = useState("Player 1,Player 2");

  async function onCreate() {
    setLoading(true);
    try {
      const players = playersText.split(",").map(s => s.trim());
      const res = await createMatch(players);
      setMatchId(res.id);
      const m = await getMatch(res.id);
      setMatch(m);
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!matchId) return;
    setLoading(true);
    try {
      const m = await getMatch(matchId);
      setMatch(m);
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function point(player) {
    if (!matchId) return alert("Create a match first");
    setLoading(true);
    try {
      await addEvent(matchId, "point", { player });
      await refresh();
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function undo() {
    if (!matchId) return;
    setLoading(true);
    try {
      await addEvent(matchId, "undo");
      await refresh();
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onFile(e) {
    const file = e.target.files[0];
    if (!file || !matchId) return alert("Create match and choose a file");
    setLoading(true);
    try {
      const res = await uploadSnapshot(matchId, file);
      alert("Uploaded: " + JSON.stringify(res));
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h2>Match (Basic)</h2>

      {!matchId && (
        <>
          <div>
            <label>Players (comma separated):</label>
            <input
              value={playersText}
              onChange={e => setPlayersText(e.target.value)}
              style={{ width: 300, marginLeft: 8 }}
            />
            <button onClick={onCreate} disabled={loading} style={{ marginLeft: 8 }}>
              Create Match
            </button>
          </div>
        </>
      )}

      {matchId && (
        <>
          <div style={{ marginTop: 12 }}>
            <strong>Match ID:</strong> {matchId}{" "}
            <button onClick={refresh} disabled={loading} style={{ marginLeft: 8 }}>
              Refresh
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div>
              <strong>Players:</strong> {match ? match.players.join(" vs ") : "—"}
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>Score:</strong> {match ? `${match.score.p1} — ${match.score.p2}` : "0 — 0"}
            </div>

            <div style={{ marginTop: 12 }}>
              <button onClick={() => point("p1")} disabled={loading} style={{ marginRight: 8 }}>
                + Point Player 1
              </button>
              <button onClick={() => point("p2")} disabled={loading} style={{ marginRight: 8 }}>
                + Point Player 2
              </button>
              <button onClick={undo} disabled={loading}>
                Undo
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <label>Upload snapshot (image): </label>
              <input type="file" accept="image/*" onChange={onFile} />
            </div>

            <div style={{ marginTop: 12 }}>
              <h4>Events</h4>
              <pre style={{ background: "#f6f6f6", padding: 8 }}>
                {match ? JSON.stringify(match.events, null, 2) : "—"}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
