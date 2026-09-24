import { AtlasApiError } from '../lib/api-errors';

export let user: string | null = 'gm';
const tables: Record<string, any[]> = { campaigns: [], memberships: [], notes: [], map_objects: [] };
let configured = true;
let nextDatabaseError: { code: string; message: string } | null = null;
let authFailure: { code: string; status: number; name: string; message: string } | null = null;

export const setUser = (id: string | null) => { user = id; };
export const setConfigured = (value: boolean) => { configured = value; };
export const failNextQuery = (code: string, message: string) => { nextDatabaseError = { code, message }; };
export const setAuthFailure = (value: typeof authFailure) => { authFailure = value; };
export function resetFake() {
  for (const rows of Object.values(tables)) rows.splice(0, rows.length);
  user = 'gm';
  configured = true;
  nextDatabaseError = null;
  authFailure = null;
}

export async function authClient() {
  if (!configured) throw new AtlasApiError('SUPABASE_NOT_CONFIGURED', 503);
  return { auth: { getUser: async () => ({ data: { user: user ? { id: user } : null }, error: authFailure }) } };
}

export function database() {
  if (!configured) throw new AtlasApiError('SUPABASE_NOT_CONFIGURED', 503);
  return { from: (table: string) => new Query(table) };
}

class Query {
  filters: Array<[string, any]> = [];
  operation = 'select';
  values: any;
  one = false;
  options: any = {};

  constructor(public table: string) {}
  select(_columns: string) { return this; }
  eq(key: string, value: any) { this.filters.push([key, value]); return this; }
  maybeSingle() { this.one = true; return this; }
  single() { this.one = true; return this; }
  insert(values: any) { this.operation = 'insert'; this.values = values; return this; }
  upsert(values: any, options: any = {}) { this.operation = 'upsert'; this.values = values; this.options = options; return this; }
  update(values: any) { this.operation = 'update'; this.values = values; return this; }
  delete() { this.operation = 'delete'; return this; }

  then(resolve: any, reject: any) {
    try {
      if (nextDatabaseError) {
        const error = nextDatabaseError;
        nextDatabaseError = null;
        return resolve({ data: null, error });
      }
      let rows = tables[this.table].filter(row => this.filters.every(([key, value]) => row[key] === value));
      if (this.operation === 'insert' || this.operation === 'upsert') {
        rows = [];
        for (const value of (Array.isArray(this.values) ? this.values : [this.values])) {
          const conflictKeys = String(this.options.onConflict || '').split(',').filter(Boolean);
          const existing = this.operation === 'upsert' && conflictKeys.length
            ? tables[this.table].find(row => conflictKeys.every(key => row[key] === value[key]))
            : null;
          if (existing) {
            if (!this.options.ignoreDuplicates) Object.assign(existing, value);
            rows.push(existing);
          } else {
            const row = this.table === 'campaigns'
              ? { id: crypto.randomUUID(), invite: crypto.randomUUID(), revision: 0, ...value }
              : this.table === 'map_objects'
                ? { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...structuredClone(value) }
                : structuredClone(value);
            tables[this.table].push(row);
            rows.push(row);
          }
        }
      } else if (this.operation === 'update') {
        rows.forEach(row => Object.assign(row, structuredClone(this.values)));
      } else if (this.operation === 'delete') {
        tables[this.table] = tables[this.table].filter(row => !rows.includes(row));
      }
      return resolve({ data: structuredClone(this.one ? rows[0] || null : rows), error: null });
    } catch (error) {
      return reject(error);
    }
  }
}
