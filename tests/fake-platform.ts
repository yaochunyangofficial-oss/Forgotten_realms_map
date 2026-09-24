export let user:string|null='gm';
export const setUser=(id:string|null)=>{user=id};
const tables:Record<string,any[]>={campaigns:[],memberships:[],notes:[]};
export async function authClient(){return {auth:{getUser:async()=>({data:{user:user?{id:user}:null}})}}}
export function database(){return {from:(table:string)=>new Query(table)}}
class Query{
 filters:Array<[string,any]>=[];operation='select';values:any;columns='*';one=false;options:any={};
 constructor(public table:string){}
 select(columns:string){this.columns=columns;return this}
 eq(key:string,value:any){this.filters.push([key,value]);return this}
 maybeSingle(){this.one=true;return this}
 single(){this.one=true;return this}
 insert(values:any){this.operation='insert';this.values=values;return this}
 upsert(values:any,options:any){this.operation='upsert';this.values=values;this.options=options;return this}
 update(values:any){this.operation='update';this.values=values;return this}
 delete(){this.operation='delete';return this}
 then(resolve:any,reject:any){try{let rows=tables[this.table].filter(r=>this.filters.every(([k,v])=>r[k]===v));if(['insert','upsert'].includes(this.operation)){rows=[];for(const value of (Array.isArray(this.values)?this.values:[this.values])){const existing=this.operation==='upsert'?tables[this.table].find(r=>this.options.onConflict.split(',').every((k:string)=>r[k]===value[k])):null;if(existing){if(!this.options.ignoreDuplicates)Object.assign(existing,value);rows.push(existing)}else{const row=this.table==='campaigns'?{id:crypto.randomUUID(),invite:crypto.randomUUID(),revision:0,...value}:{...value};tables[this.table].push(structuredClone(row));rows.push(row)}}}if(this.operation==='update')rows.forEach(r=>Object.assign(r,structuredClone(this.values)));if(this.operation==='delete')tables[this.table]=tables[this.table].filter(r=>!rows.includes(r));return resolve({data:structuredClone(this.one?rows[0]||null:rows),error:null})}catch(e){return reject(e)}}
}
