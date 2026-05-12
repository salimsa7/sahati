import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const memberId = url.searchParams.get('memberId');
  
  let query = supabaseAdmin.from('access_logs').select('*, users(name)');
  if (memberId) query = query.eq('user_id', memberId);

  const { data, error } = await query.order('scanned_at', { ascending: false });

  if (error) return new Response(error.message, { status: 500 });

  const transformed = data.map(log => {
    const user = Array.isArray(log.users) ? log.users[0] : log.users;
    return {
      ...log,
      users: user
    };
  });

  return new Response(JSON.stringify(transformed), { status: 200 });
};
