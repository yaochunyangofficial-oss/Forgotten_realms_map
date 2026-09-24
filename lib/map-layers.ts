/**
 * Semantic SVG stacking order. Keep rendered groups in this order in atlas.tsx.
 * Fog belongs between locations and player-knowledge layers.
 */
export const MAP_LAYER_ORDER = [
  'base-map',
  'factions',
  'locations',
  'fog-of-war',
  'routes',
  'map-objects',
] as const;

export type MapLayer = typeof MAP_LAYER_ORDER[number];
