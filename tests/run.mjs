import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');const temp=await mkdtemp(path.join(tmpdir(),'dnd-map-test-'));
try{const outfile=path.join(temp,'test.mjs');await build({entryPoints:[path.join(root,'tests/cases.ts')],bundle:true,platform:'node',format:'esm',outfile,alias:{'@/lib/supabase/server':path.join(root,'tests/fake-platform.ts')}});await import(pathToFileURL(outfile).href)}finally{await rm(temp,{recursive:true,force:true})}
