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

export const MAP_PLANE_ORDER = ['world', 'fog', 'knowledge'] as const;
export const PLAYER_FOG_COLOR = '#384b55';

export type MapLayer = typeof MAP_LAYER_ORDER[number];
