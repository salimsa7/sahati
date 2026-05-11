import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q');

  // Search by name, email, phone, or ID
  let supabaseQuery = supabaseAdmin
    .from('users')
    .select('*, subscriptions(*)');

  if (query) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

    if (isUUID) {
      supabaseQuery = supabaseQuery.or(`id.eq.${query},name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
    } else {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
    }
  }

  const { data, error } = await supabaseQuery.order('name');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

  const transformed = data.map(member => ({
    ...member,
    subscriptions: member.subscriptions?.map((sub: any) => ({
      ...sub,
      plan: capitalize(sub.plan),
      status: capitalize(sub.status)
    }))
  }));

  return new Response(JSON.stringify(transformed), { status: 200 });
};
