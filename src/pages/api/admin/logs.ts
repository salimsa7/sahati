import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const memberId = url.searchParams.get('memberId');
  
  let query = supabaseAdmin.from('access_logs_detailed').select('*');
  
  if (memberId) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId);
    if (isUUID) {
      query = query.eq('member_id', memberId);
    } else {
      query = query.ilike('member_name', `%${memberId}%`);
    }
  }

  const { data, error } = await query;

  if (error) return new Response(error.message, { status: 500 });

  return new Response(JSON.stringify(data), { status: 200 });
};
