import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q') || '';
  
  const { data, error } = await supabaseAdmin
    .from('staff')
    .select('*')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('name');

  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  const { name, email, phone, password } = await request.json();

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) return new Response(authError.message, { status: 400 });

  const { error: profileError } = await supabaseAdmin
    .from('staff')
    .insert({ id: authData.user.id, name, email, phone });

  if (profileError) return new Response(profileError.message, { status: 500 });

  return new Response(JSON.stringify({ success: true }), { status: 201 });
};

export const PUT: APIRoute = async ({ request }) => {
  const { id, name, email, phone } = await request.json();

  const { error } = await supabaseAdmin
    .from('staff')
    .update({ name, email, phone })
    .eq('id', id);

  if (error) return new Response(error.message, { status: 500 });
  
  await supabaseAdmin.auth.admin.updateUserById(id, { email });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export const PATCH: APIRoute = async ({ request }) => {
  const { id, password } = await request.json();

  if (!id || !password) {
    return new Response('ID and password are required', { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password });

  if (error) return new Response(error.message, { status: 500 });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) return new Response('ID required', { status: 400 });

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return new Response(error.message, { status: 500 });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
