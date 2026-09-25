import type { MapObject } from './types';
import type { JourneyWaypoint } from './journey';

// The campaign's object order is stable; capture the display name when selected
// so later view changes never alter an existing route stop.
export function poiWaypoint(object: MapObject, objects: MapObject[]): Extract<JourneyWaypoint, { kind: 'point' }> {
  const ordinal = objects.filter(item => item.kind === 'poi').findIndex(item => item.id === object.id) + 1;
  return { kind: 'point', id: object.id, point: [object.x, object.y], name: object.label.trim() || `POI ${ordinal}` };
}
