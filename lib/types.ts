export type Point=[number,number];
export type Place={id:string;name:string;zh?:string;x:number;y:number;kind:string;chapter:string;info:string;gmNotes?:string;faction:string;hidden:boolean;approx?:boolean;offmap?:boolean};
export type Faction={id:string;name:string;color:string};
export type Territory={id:string;faction:string;points:Point[]};
export type AtlasData={places:Place[];factions:Faction[];territories:Territory[]};
export type Session={id:string;role:'gm'|'player';revision:number;data:AtlasData;notes:Record<string,string>;invite?:string};
