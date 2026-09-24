import { MAP_HEIGHT, MAP_WIDTH } from './geography';
import type { Point } from './types';

/** Map-space cell size; 28 units is about 10 map miles and a Yartar-sized area. */
export const FOG_CELL_SIZE = 28;
export const FOG_COLUMNS = Math.ceil(MAP_WIDTH / FOG_CELL_SIZE);
export const FOG_ROWS = Math.ceil(MAP_HEIGHT / FOG_CELL_SIZE);
export const FOG_CELL_COUNT = FOG_COLUMNS * FOG_ROWS;

/** Sparse grid: exceptions hold cells whose value differs from baseFogged. */
export type FogState = {
  enabled: boolean;
  baseFogged: boolean;
  exceptions: number[];
};

export const DEFAULT_FOG_STATE: FogState = {
  enabled: false,
  baseFogged: false,
  exceptions: [],
};

export function isValidFogState(value: unknown): value is FogState {
  if (!value || typeof value !== 'object') return false;
  const state = value as FogState;
  return typeof state.enabled === 'boolean'
    && typeof state.baseFogged === 'boolean'
    && Array.isArray(state.exceptions)
    && state.exceptions.length <= FOG_CELL_COUNT
    && state.exceptions.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < FOG_CELL_COUNT)
    && new Set(state.exceptions).size === state.exceptions.length;
}

export function normalizeFogState(value: unknown): FogState {
  return isValidFogState(value)
    ? { enabled: value.enabled, baseFogged: value.baseFogged, exceptions: [...value.exceptions] }
    : { ...DEFAULT_FOG_STATE, exceptions: [] };
}

export function foggedCellIndices(state: FogState): number[] {
  if (state.baseFogged) {
    const revealed = new Set(state.exceptions);
    return Array.from({ length: FOG_CELL_COUNT }, (_, cell) => cell).filter((cell) => !revealed.has(cell));
  }
  return [...state.exceptions];
}

export function isFoggedCell(state: FogState, cell: number): boolean {
  return cell >= 0 && cell < FOG_CELL_COUNT
    && (state.baseFogged !== state.exceptions.includes(cell));
}

export function setFogCell(state: FogState, cell: number, fogged: boolean): FogState {
  if (!Number.isInteger(cell) || cell < 0 || cell >= FOG_CELL_COUNT) return state;
  const hasException = state.exceptions.includes(cell);
  const needsException = fogged !== state.baseFogged;
  if (hasException === needsException) return state;
  return {
    ...state,
    exceptions: needsException
      ? [...state.exceptions, cell]
      : state.exceptions.filter((item) => item !== cell),
  };
}

export function fogCellAt(point: Point): number | null {
  if (point[0] < 0 || point[0] > MAP_WIDTH || point[1] < 0 || point[1] > MAP_HEIGHT) return null;
  const column = Math.min(FOG_COLUMNS - 1, Math.floor(point[0] / FOG_CELL_SIZE));
  const row = Math.min(FOG_ROWS - 1, Math.floor(point[1] / FOG_CELL_SIZE));
  return row * FOG_COLUMNS + column;
}

export function fogCellRect(cell: number) {
  const column = cell % FOG_COLUMNS;
  const row = Math.floor(cell / FOG_COLUMNS);
  const x = column * FOG_CELL_SIZE;
  const y = row * FOG_CELL_SIZE;
  return {
    x,
    y,
    width: Math.min(FOG_CELL_SIZE, MAP_WIDTH - x),
    height: Math.min(FOG_CELL_SIZE, MAP_HEIGHT - y),
  };
}
