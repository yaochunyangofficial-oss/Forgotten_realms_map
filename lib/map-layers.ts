/**
 * Semantic SVG stacking order. Keep rendered groups in this order in atlas.tsx.
 * Fog is intentionally reserved between locations and player-knowledge layers.
 */
export const MAP_LAYER_ORDER = [
  'base-map',
  'factions',
  'locations',
  'fog-of-war', // Reserved: future fog hides world state, not player knowledge.
  'routes',
  'map-objects',
] as const;

export type MapLayer = typeof MAP_LAYER_ORDER[number];
