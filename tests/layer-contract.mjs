import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/atlas.tsx', import.meta.url), 'utf8');
const sequence = [
  'data-map-plane="world"',
  'data-map-layer="base-map"',
  'data-map-layer="factions"',
  'data-map-layer="locations"',
  'data-map-plane="fog"',
  'data-map-layer="fog-of-war"',
  'data-map-plane="knowledge"',
  'data-map-layer="routes"',
  'data-map-layer="map-objects"',
];
let last = -1;
for (const layer of sequence) {
  const index = source.indexOf(layer);
  assert.ok(index > last, `${layer} must paint after the preceding layer`);
  last = index;
}
assert.match(source, /data-map-layer="fog-of-war" aria-hidden="true" pointerEvents="none"/);
assert.match(source, /fill=\{PLAYER_FOG_COLOR\} fillOpacity=\{mode==='player'\?1:/);
assert.match(source, /data-map-layer="routes" pointerEvents="none"/);
assert.match(source, /strokeWidth=\{7\} vectorEffect="non-scaling-stroke"/);
assert.match(source, /strokeWidth=\{3\.5\} vectorEffect="non-scaling-stroke"/);
assert.doesNotMatch(source, /paintOrder="stroke" filter="url\(#poi-soft-glow\)"/);
assert.match(source, /if\(!canManageObject\(object\)\)\{e\.stopPropagation\(\);return\}/);
assert.match(source, /if\(!current\.moved\)\{if\(object\)openMapObject\(object\);return\}/);
assert.match(source, /displayMapObjects\.filter\(object=>object\.kind!=='poi'\|\|showPois\)/);
assert.match(source, /if\(routePick\)\{selectPoiWaypoint\(object\);return\}/);
assert.match(source, /<Checkbox checked=\{showPois\} onCheckedChange=\{v=>setShowPois\(v===true\)\}/);
console.log('PASS: SVG world, opaque Fog, and player-knowledge paint order; crisp POI and screen-width routes.');
