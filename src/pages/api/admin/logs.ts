import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const memberId = url.searchParams.get('memberId');
  
  let query = supabaseAdmin.from('access_logs').select('*, users(name), staff(name)');
  
  if (memberId) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId);
    if (isUUID) {
      query = query.eq('user_id', memberId);
    } else {
      // If not a UUID, try to search by member name in the joined users table
      query = query.ilike('users.name', `%${memberId}%`);
    }
  }

  const { data, error } = await query.order('scanned_at', { ascending: false });

  if (error) return new Response(error.message, { status: 500 });

  const transformed = data.map(log => {
    const user = Array.isArray(log.users) ? log.users[0] : log.users;
    const staff = Array.isArray(log.staff) ? log.staff[0] : log.staff;
    return {
      ...log,
      users: user,
      staff: staff
    };
  });

  return new Response(JSON.stringify(transformed), { status: 200 });
};
