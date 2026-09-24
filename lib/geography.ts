import placeData from './places.json';
import type {AtlasData,Point} from './types';
export const MAP_HEIGHT=6600/10200*1000;
export const sourceLinks={map:'https://www.dndbeyond.com/resources/1782-map-of-faerun',locations:'https://www.dndbeyond.com/sources/dnd/skt',coordinates:'https://www.aidedd.org/atlas/sword-coast'};
export const initialData:AtlasData={places:placeData,factions:[],territories:[]};
// Major named roads. Geometry is an approximation, not a survey. No implied ocean links.
export const roadChains=[
 ['waterdeep','rassalantar','amphail','red-larch','westbridge','triboar','longsaddle','xantharls-keep','mirabar'],
 ['waterdeep','thornhold','carnath-roadhouse','leilon','helms-hold','neverwinter','port-llast','luskan'],
 ['luskan','hundelstone','bryn-shander'],['hundelstone','ironmaster'],['hundelstone','fireshear'],['luskan','mirabar'],
 ['leilon','phandalin','triboar'],['triboar','yartar','calling-horns','olostins-hold','everlund','silverymoon'],
 ['silverymoon','zymorven-hall','rivermoot'],['silverymoon','hawks-nest','sundabar','deadsnows','citadel-adbar'],
 ['deadsnows','ascore'],['sundabar','citadel-felbarr'],['everlund','jalanthar'],
 ['calling-horns','noanars-hold'],['red-larch','beliard','stone-bridge','westbridge'],
 ['red-larch','bargewright-inn','womford'],['amphail','goldenfields'],['waterdeep','daggerford','way-inn'],
 ['daggerford','julkoun','secomber','zelbross','loudwater','llorkh','parnast'],['loudwater','orlbar'],
];
export const roads:Point[][]=roadChains.map(c=>c.map(id=>{const p=placeData.find(p=>p.id===id)!;return [p.x,p.y] as Point}));
export const milesPerUnit=500/178; // Official map's 500-mile scale, normalized to width 1000.
