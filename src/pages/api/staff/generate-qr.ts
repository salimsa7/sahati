import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const { userId } = await request.json();

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
  }

  // Check if token already exists
  const { data: existing } = await supabaseAdmin
    .from('qr_tokens')
    .select('token')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ success: true, token: existing.token, message: 'Token already exists' }), { status: 200 });
  }

  const newToken = crypto.randomUUID();

  const { error } = await supabaseAdmin
    .from('qr_tokens')
    .insert({
      user_id: userId,
      token: newToken
    });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, token: newToken }), { status: 201 });
};
