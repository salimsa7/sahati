import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data, error } = await supabase
    .from('qr_tokens')
    .select('token')
    .eq('user_id', user.id)
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};
