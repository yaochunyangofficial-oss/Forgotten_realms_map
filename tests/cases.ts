import assert from 'node:assert/strict';
import { GET, POST } from '../app/api/atlas/route';
import { failNextQuery, resetFake, setAuthFailure, setConfigured, setUser } from './fake-platform';
import { initialData } from '../lib/geography';
import { planRoute } from '../lib/routing';
import { MAP_LAYER_ORDER } from '../lib/map-layers';

const get = (id = '') => GET(new Request('https://map.test/api/atlas' + (id ? '?id=' + id : '')));
const post = (body: unknown) => POST(new Request('https://map.test/api/atlas', {
  method: 'POST',
  headers: { origin: 'https://map.test', 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}));

resetFake();
assert.deepEqual(MAP_LAYER_ORDER, ['base-map', 'factions', 'locations', 'fog-of-war', 'routes', 'map-objects']);
setUser(null);
let response = await get();
assert.equal(response.status, 401);
assert.equal((await response.json()).code, 'AUTH_REQUIRED');

setUser('gm');
setAuthFailure({ code: 'invalid_credentials', status: 401, name: 'AuthApiError', message: 'invalid credentials' });
response = await get();
assert.equal(response.status, 401);
assert.equal((await response.json()).code, 'AUTH_FAILURE');
setAuthFailure(null);

setConfigured(false);
response = await get();
assert.equal(response.status, 503);
assert.equal((await response.json()).code, 'SUPABASE_NOT_CONFIGURED');
setConfigured(true);

failNextQuery('PGRST205', 'table is missing');
response = await get();
assert.equal(response.status, 503);
assert.equal((await response.json()).code, 'SCHEMA_NOT_READY');
failNextQuery('FETCH_ERROR', 'fetch failed');
response = await get();
assert.equal(response.status, 503);
assert.equal((await response.json()).code, 'BACKEND_UNAVAILABLE');

const emptyList = await (await get()).json();
assert.deepEqual(emptyList.campaigns, []);

// Creation returns a ready-to-use GM session from the insert itself, then GET
// proves that a separate request sees the same persisted campaign data.
response = await post({ action: 'create' });
assert.equal(response.status, 200);
const created = await response.json();
assert.equal(created.role, 'gm');
assert.ok(created.id && created.invite);
assert.deepEqual(created.data, initialData);
const firstRead = await (await get(created.id)).json();
assert.deepEqual(firstRead.data, initialData);
assert.equal(firstRead.revision, 0);
assert.equal(firstRead.invite, created.invite);

const poiDraft = { kind: 'poi', x: 412, y: 203, radius: 72, label: 'Northward lead', content: 'Somewhere in the northern reaches', visibility: 'shared' };
response = await post({ action: 'map-object', operation: 'create', id: created.id, object: poiDraft });
assert.equal(response.status, 200);
const poi = (await response.json()).mapObject;
assert.ok(poi.id && poi.editable);
const gmPrivateDraft = { kind: 'note', x: 414, y: 205, radius: null, label: 'GM secret', content: 'GM-MAP-OBJECT-CANARY', visibility: 'gm_private' };
response = await post({ action: 'map-object', operation: 'create', id: created.id, object: gmPrivateDraft });
assert.equal(response.status, 200);
const gmPrivateObject = (await response.json()).mapObject;
const noteDraft = { kind: 'note', x: 300, y: 440, radius: null, label: 'Clue', content: 'A handwritten clue', visibility: 'player_private' };
response = await post({ action: 'map-object', operation: 'create', id: created.id, object: noteDraft });
assert.equal(response.status, 200);
const gmPlayerPrivateObject = (await response.json()).mapObject;
const movedPoi = { ...poiDraft, x: 510, y: 260, radius: 108, label: 'Updated northern lead' };
response = await post({ action: 'map-object', operation: 'update', id: created.id, objectId: poi.id, object: movedPoi });
assert.equal(response.status, 200);
assert.deepEqual((await (await get(created.id)).json()).mapObjects.find((o: any) => o.id === poi.id), { ...movedPoi, id: poi.id, editable: true });

const changed = structuredClone(firstRead.data);
changed.places[0].gmNotes = 'GM-PRIVATE-CANARY';
changed.places[1].hidden = true;
response = await post({ action: 'save', id: created.id, revision: 0, data: changed });
assert.equal(response.status, 200);
assert.equal((await response.json()).revision, 1);
const reloaded = await (await get(created.id)).json();
assert.deepEqual(reloaded.data, changed);
assert.equal(reloaded.revision, 1);
response = await post({ action: 'save', id: created.id, revision: 0, data: changed });
assert.equal(response.status, 409);
assert.equal((await response.json()).code, 'SAVE_CONFLICT');

setUser('outsider');
response = await get(created.id);
assert.equal(response.status, 403);
assert.equal((await response.json()).code, 'PERMISSION_DENIED');
response = await get('00000000-0000-4000-8000-000000000001');
assert.equal(response.status, 404);
assert.equal((await response.json()).code, 'CAMPAIGN_NOT_FOUND');

setUser('player');
response = await post({ action: 'join', invite: 'invalid-invite' });
assert.equal(response.status, 404);
assert.equal((await response.json()).code, 'INVITE_INVALID');
response = await post({ action: 'join', invite: created.invite });
assert.equal(response.status, 200);
assert.equal((await response.json()).id, created.id);
const playerList = await (await get()).json();
assert.ok(playerList.campaigns.some((campaign: any) => campaign.id === created.id && campaign.role === 'player'));
const playerRead = await (await get(created.id)).json();
assert.equal(playerRead.role, 'player');
assert.ok(!JSON.stringify(playerRead).includes('GM-PRIVATE-CANARY'));
assert.ok(!playerRead.data.places.some((place: any) => place.id === changed.places[1].id));
assert.equal(playerRead.invite, undefined);
assert.ok(playerRead.mapObjects.some((o: any) => o.id === poi.id));
assert.equal(playerRead.mapObjects.find((o: any) => o.id === poi.id).editable, false);
assert.ok(!playerRead.mapObjects.some((o: any) => o.id === gmPrivateObject.id));
assert.ok(!playerRead.mapObjects.some((o: any) => o.id === gmPlayerPrivateObject.id));
assert.ok(!JSON.stringify(playerRead).includes('GM-MAP-OBJECT-CANARY'));
const playerPrivateDraft = { kind: 'note', x: 50, y: 60, radius: null, label: 'Player journal', content: 'Private player note', visibility: 'player_private' };
response = await post({ action: 'map-object', operation: 'create', id: created.id, object: playerPrivateDraft });
assert.equal(response.status, 200);
const playerPrivateObject = (await response.json()).mapObject;
response = await post({ action: 'map-object', operation: 'update', id: created.id, objectId: poi.id, object: movedPoi });
assert.equal(response.status, 403);
response = await post({ action: 'map-object', operation: 'create', id: created.id, object: { ...gmPrivateDraft, content: 'forbidden' } });
assert.equal(response.status, 403);
assert.equal((await response.json()).code, 'PERMISSION_DENIED');
const playerReload = await (await get(created.id)).json();
assert.ok(playerReload.mapObjects.some((o: any) => o.id === playerPrivateObject.id));
assert.equal(playerReload.mapObjects.find((o: any) => o.id === playerPrivateObject.id).editable, true);
assert.ok(!playerReload.mapObjects.some((o: any) => o.id === gmPrivateObject.id));
setUser('player2');
response = await post({ action: 'join', invite: created.invite });
assert.equal(response.status, 200);
const otherPlayerRead = await (await get(created.id)).json();
assert.ok(otherPlayerRead.mapObjects.some((o: any) => o.id === poi.id));
assert.ok(!otherPlayerRead.mapObjects.some((o: any) => o.id === playerPrivateObject.id));
assert.ok(!otherPlayerRead.mapObjects.some((o: any) => o.id === gmPrivateObject.id));
setUser('player');
response = await post({ action: 'save', id: created.id, revision: 1, data: changed });
assert.equal(response.status, 403);
assert.equal((await response.json()).code, 'PERMISSION_DENIED');
response = await post({ action: 'note', id: created.id, location: changed.places[1].id, body: 'hidden' });
assert.equal(response.status, 400);
assert.equal((await response.json()).code, 'INVALID_REQUEST');
response = await post({ action: 'note', id: created.id, location: changed.places[0].id, body: 'PLAYER-PRIVATE-CANARY' });
assert.equal(response.status, 200);

setUser('gm');
assert.ok(!JSON.stringify(await (await get(created.id)).json()).includes('PLAYER-PRIVATE-CANARY'));
const gmReload = await (await get(created.id)).json();
assert.ok(gmReload.mapObjects.some((o: any) => o.id === gmPrivateObject.id));
assert.ok(gmReload.mapObjects.some((o: any) => o.id === playerPrivateObject.id));
response = await post({ action: 'map-object', operation: 'delete', id: created.id, objectId: poi.id });
assert.equal(response.status, 200);
assert.ok(!(await (await get(created.id)).json()).mapObjects.some((o: any) => o.id === poi.id));

const backup = { format: 'dnd-map-backup', version: 1, data: changed, notes: { [changed.places[0].id]: 'GM own note' } };
const imported = await (await post({ action: 'import', backup })).json();
assert.notEqual(imported.id, created.id);
const restored = await (await get(imported.id)).json();
assert.deepEqual(restored.data, changed);
assert.deepEqual(restored.notes, backup.notes);
assert.notEqual(restored.invite, created.invite);

response = await post({ action: 'import', backup: { ...backup, version: 99 } });
assert.equal(response.status, 400);
assert.equal((await response.json()).code, 'INVALID_REQUEST');

const zh = planRoute(['triboar', 'yartar'], 'road', initialData.places, 'zh');
const en = planRoute(['triboar', 'yartar'], 'road', initialData.places, 'en');
assert.deepEqual(zh.points, en.points);
assert.equal(zh.miles, en.miles);
assert.ok(en.towns.includes('Triboar'));
console.log('PASS: campaign create/save/reload, map object create/move/resize/delete/reload, shared and GM/player-private visibility, authorization, invites, backup import, bilingual routing. In-memory adapter; live Supabase still requires project configuration.');
