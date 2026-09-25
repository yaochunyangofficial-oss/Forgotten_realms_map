import { milesPerUnit, roadChains } from './geography';
import { planRoute } from './routing';
import type { Place, Point } from './types';
import type { Locale } from './i18n';

export type JourneyWaypoint = { kind: 'place'; id: string } | { kind: 'point'; id: string; point: Point; name?: string };
export type SegmentMode = 'road' | 'cross_country';
export type JourneySegment = { mode: SegmentMode; points: Point[]; miles: number; days: number; error?: string };
export type JourneyResult = { segments: JourneySegment[]; roadMiles: number; crossCountryMiles: number; miles: number; days: number; points: Point[] };

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const polylineMiles = (points: Point[]) => points.slice(1).reduce((sum, point, i) => sum + distance(points[i], point) * milesPerUnit, 0);

// A manual road waypoint must be placed near a mapped major road. Project it
// onto that road segment and connect it to both endpoints of the existing graph.
function roadPoints(a: JourneyWaypoint, b: JourneyWaypoint, places: Place[]): { points: Point[]; miles: number } | null {
  const byId = new Map(places.map(place => [place.id, place]));
  const graph = new Map<string, { id: string; miles: number }[]>();
  const coordinates = new Map<string, Point>();
  const add = (u: string, v: string, miles: number) => {
    graph.set(u, [...(graph.get(u) || []), { id: v, miles }]);
    graph.set(v, [...(graph.get(v) || []), { id: u, miles }]);
  };
  const edges: { u: string; v: string; a: Point; b: Point }[] = [];
  const snapped = new Map<string, { edge: typeof edges[number]; point: Point; gap: number }>();
  for (const chain of roadChains) for (let i = 1; i < chain.length; i++) {
    const u = chain[i - 1], v = chain[i], p = byId.get(u), q = byId.get(v);
    if (!p || !q) continue;
    const start: Point = [p.x, p.y], end: Point = [q.x, q.y];
    coordinates.set(u, start); coordinates.set(v, end);
    add(u, v, distance(start, end) * milesPerUnit);
    edges.push({ u, v, a: start, b: end });
  }
  function endpoint(waypoint: JourneyWaypoint, key: string): string | null {
    if (waypoint.kind === 'place') return graph.has(waypoint.id) ? waypoint.id : null;
    let nearest: { edge: typeof edges[number]; point: Point; gap: number } | null = null;
    for (const edge of edges) {
      const dx = edge.b[0] - edge.a[0], dy = edge.b[1] - edge.a[1];
      const t = Math.max(0, Math.min(1, ((waypoint.point[0] - edge.a[0]) * dx + (waypoint.point[1] - edge.a[1]) * dy) / (dx * dx + dy * dy)));
      const point: Point = [edge.a[0] + t * dx, edge.a[1] + t * dy];
      const gap = distance(waypoint.point, point);
      if (!nearest || gap < nearest.gap) nearest = { edge, point, gap };
    }
    if (!nearest || nearest.gap > 12) return null;
    snapped.set(key, nearest);
    coordinates.set(key, waypoint.point);
    const { edge, point } = nearest;
    const snapId = key + '_snap';
    coordinates.set(snapId, point);
    add(key, snapId, nearest.gap * milesPerUnit);
    add(snapId, edge.u, distance(point, edge.a) * milesPerUnit);
    add(snapId, edge.v, distance(point, edge.b) * milesPerUnit);
    return key;
  }
  const start = endpoint(a, '__start'), end = endpoint(b, '__end');
  if (!start || !end) return null;
  const firstSnap = snapped.get(start), lastSnap = snapped.get(end);
  if (firstSnap && lastSnap && firstSnap.edge === lastSnap.edge) add(start + '_snap', end + '_snap', distance(firstSnap.point, lastSnap.point) * milesPerUnit);
  const costs = new Map<string, number>([[start, 0]]), previous = new Map<string, string>(), pending = new Set(graph.keys());
  while (pending.size) {
    let current: string | null = null;
    for (const id of pending) if (costs.has(id) && (current === null || costs.get(id)! < costs.get(current)!)) current = id;
    if (current === null) break;
    if (current === end) break;
    pending.delete(current);
    for (const edge of graph.get(current) || []) {
      const next = costs.get(current)! + edge.miles;
      if (next < (costs.get(edge.id) ?? Infinity)) { costs.set(edge.id, next); previous.set(edge.id, current); }
    }
  }
  if (!costs.has(end)) return null;
  const ids = [end];
  while (ids[0] !== start) { const before = previous.get(ids[0]); if (!before) return null; ids.unshift(before); }
  return { points: ids.map(id => coordinates.get(id)!), miles: costs.get(end)! };
}

export function planJourney(waypoints: JourneyWaypoint[], modes: SegmentMode[], places: Place[], locale: Locale = 'zh'): JourneyResult {
  const byId = new Map(places.map(place => [place.id, place]));
  const segments: JourneySegment[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1], mode = modes[i] || 'road';
    const first = a.kind === 'point' ? a.point : byId.get(a.id) && [byId.get(a.id)!.x, byId.get(a.id)!.y] as Point;
    const last = b.kind === 'point' ? b.point : byId.get(b.id) && [byId.get(b.id)!.x, byId.get(b.id)!.y] as Point;
    if (!first || !last || a.kind === 'place' && byId.get(a.id)?.offmap || b.kind === 'place' && byId.get(b.id)?.offmap) { segments.push({ mode, points: [], miles: 0, days: 0, error: locale === 'en' ? 'Select two mapped endpoints for this segment.' : '請選擇這一段已定位的兩個端點。' }); continue; }
    let points: Point[] | null = null;
    let roadMiles: number | null = null;
    if (mode === 'cross_country') points = [first, last];
    else if (a.kind === 'place' && b.kind === 'place') {
      const road = planRoute([a.id, b.id], 'road', places, locale);
      points = road.error ? null : road.points;
      roadMiles = road.error ? null : road.miles;
    } else { const road = roadPoints(a, b, places); points = road?.points || null; roadMiles = road?.miles ?? null; }
    if (!points) { segments.push({ mode, points: [], miles: 0, days: 0, error: locale === 'en' ? 'This segment cannot use the mapped main roads. Switch this segment to Cross-country.' : '此段無法沿已繪製的大路行進，請將此段改為越野。' }); continue; }
    const miles = roadMiles ?? polylineMiles(points);
    segments.push({ mode, points, miles, days: miles / 24 });
  }
  const roadMiles = segments.filter(s => s.mode === 'road' && !s.error).reduce((n, s) => n + s.miles, 0);
  const crossCountryMiles = segments.filter(s => s.mode === 'cross_country' && !s.error).reduce((n, s) => n + s.miles, 0);
  const points = segments.reduce<Point[]>((all, segment) => { if (segment.points.length) all.push(...(all.length && distance(all[all.length-1], segment.points[0]) < 0.001 ? segment.points.slice(1) : segment.points)); return all; }, []);
  return { segments, roadMiles, crossCountryMiles, miles: roadMiles + crossCountryMiles, days: (roadMiles + crossCountryMiles) / 24, points };
}
