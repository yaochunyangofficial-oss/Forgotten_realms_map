import {authClient} from '@/lib/supabase/server';
export async function POST(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return new Response('Forbidden',{status:403});const client=await authClient();await client.auth.signOut();return Response.redirect(new URL('/',req.url),303)}
