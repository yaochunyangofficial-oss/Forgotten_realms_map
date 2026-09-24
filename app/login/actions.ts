'use server';
import {authClient} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
export async function signIn(form:FormData){
 const locale=form.get('locale')==='en'?'en':'zh';
 const client=await authClient();
 const email=String(form.get('email')||'').trim();
 const password=String(form.get('password')||'');
 const {error}=await client.auth.signInWithPassword({email,password});
 if(error)redirect('/login?error=credentials&lang='+locale);
 redirect('/');
}
