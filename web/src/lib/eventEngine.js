// eventEngine.js - simple rules engine for net_hit, bounce, out_of_bounds, side_change
// It consumes sequences of frame detections (array of frames).
// Each frame detection: { timestamp, detections: [{label, bbox, score, mask}] }

function bboxArea(b) {
  const w = Math.max(0, b[2] - b[0]), h = Math.max(0, b[3] - b[1]);
  return w * h;
}

function bboxIou(a, b) {
  const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]), y2 = Math.min(a[3], b[3]);
  const w = Math.max(0, x2 - x1), h = Math.max(0, y2 - y1);
  const inter = w * h;
  const union = bboxArea(a) + bboxArea(b) - inter;
  return union === 0 ? 0 : inter / union;
}

export function evaluateBurst(frames, courtPolygonNormalized, midlineX = 0.5) {
  // frames: [{t, detections: [{label,bbox,score,mask}], bitmap?}]
  // courtPolygonNormalized: polygon in normalized coords [x,y]
  // returns { recommendation: 'in'|'out'|'net'|'inconclusive', confidence, meta }
  let ballTracks = [];
  let netBox = null;
  for (const f of frames) {
    const ball = f.detections.find(d => d.label === "ball");
    const net = f.detections.find(d => d.label === "net");
    if (ball) {
      // center
      const [x1,y1,x2,y2] = ball.bbox;
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      ballTracks.push({ t: f.t, cx, cy, bbox: ball.bbox, score: ball.score });
    }
    if (net && !netBox) netBox = net.bbox;
  }

  if (ballTracks.length < 2) {
    return { recommendation: "inconclusive", confidence: 0.2, meta: {} };
  }

  // --- Bounce Detection Logic ---
  // Simple bounce detection: find local minima of cy (y increasing downward)
  // look for a frame where cy is maximal and then rises again (approx)
  
  // Simpler: take last 2 points to see if ball moved downward then up (impact between)
  const last = ballTracks[ballTracks.length - 1];
  const prev = ballTracks[ballTracks.length - 2];
  const dy = last.cy - prev.cy;
  // If dy < 0 (moving up) and previous dy > 0 (moved down), we can detect a bounce
  const prev2 = ballTracks.length >= 3 ? ballTracks[ballTracks.length - 3] : prev;
  const dyPrev = prev.cy - prev2.cy;

  let bounced = (dyPrev > 0 && dy < 0 && Math.abs(dyPrev) > 0.01);
  
  // --- Net Overlap Check ---
  let netOverlap = 0;
  if (netBox && ballTracks.length) {
    const lastBallBox = ballTracks[Math.max(0, ballTracks.length - 1)].bbox;
    netOverlap = bboxIou(lastBallBox, netBox); // approx
  }

  // --- Point in Polygon Check ---
  // Check whether last bounce location within court polygon
  const lastCenter = [last.cx, last.cy];
  const inside = pointInPolygon(lastCenter, courtPolygonNormalized);

  if (netOverlap > 0.03) {
    return { recommendation: "net", confidence: Math.min(0.6 + netOverlap, 0.95), meta: { netOverlap } };
  }
  if (bounced) {
    if (!inside) return { recommendation: "out", confidence: 0.85, meta: {} };
    // if inside, it's likely in
    return { recommendation: "in", confidence: 0.8, meta: {} };
  }

  return { recommendation: "inconclusive", confidence: 0.35, meta: {} };
}

// point in polygon (ray-casting)
function pointInPolygon([x,y], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
