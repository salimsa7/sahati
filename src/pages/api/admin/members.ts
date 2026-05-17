import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q') || '';
  
  // Search by name, email, phone, or ID
  let supabaseQuery = supabaseAdmin
    .from('users')
    .select('*, qr_tokens(token)');

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

  if (query) {
    if (isUUID) {
      supabaseQuery = supabaseQuery.or(`id.eq.${query},name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
    } else {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
    }
  }

  const { data, error } = await supabaseQuery.order('name');

  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  const { name, email, phone, password } = await request.json();

  // 1. Create Auth User
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) return new Response(authError.message, { status: 400 });

  // 2. Create Profile
  const { error: profileError } = await supabaseAdmin
    .from('users')
    .insert({ id: authData.user.id, name, email, phone });

  if (profileError) return new Response(profileError.message, { status: 500 });

  // 3. Generate permanent QR token
  await supabaseAdmin.from('qr_tokens').insert({
    user_id: authData.user.id,
    token: crypto.randomUUID()
  });

  return new Response(JSON.stringify({ success: true }), { status: 201 });
};

export const PUT: APIRoute = async ({ request }) => {
  const { id, name, email, phone } = await request.json();

  const { error } = await supabaseAdmin
    .from('users')
    .update({ name, email, phone })
    .eq('id', id);

  if (error) return new Response(error.message, { status: 500 });
  
  // Also update auth email if changed
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
