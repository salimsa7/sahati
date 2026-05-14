import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q') || '';
  
  // Join from subscriptions side to ensure we get subscription data primarily
  let supabaseQuery = supabaseAdmin
    .from('subscriptions')
    .select('*, users!inner(name, email)');
  
  if (query) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
    if (isUUID) {
      supabaseQuery = supabaseQuery.or(`user_id.eq.${query},users.name.ilike.%${query}%,users.email.ilike.%${query}%`);
    } else {
      supabaseQuery = supabaseQuery.or(`users.name.ilike.%${query}%,users.email.ilike.%${query}%`);
    }
  }

  // To order by joined table field in Supabase, we use a specific syntax or just order by subscription field
  const { data, error } = await supabaseQuery;

  if (error) return new Response(error.message, { status: 500 });

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

  const transformed = data.map(sub => {
    // Handle cases where users might be an array or an object
    const user = Array.isArray(sub.users) ? sub.users[0] : (sub.users || {});
    
    return {
      member_id: sub.user_id,
      users: { name: user.name, email: user.email },
      plan: capitalize(sub.plan),
      status: capitalize(sub.status),
      start_date: sub.start_date,
      end_date: sub.end_date
    };
  });

  // Sort by name in JS to avoid complex joined sorting if needed
  transformed.sort((a, b) => a.users.name.localeCompare(b.users.name));

  return new Response(JSON.stringify(transformed), { status: 200 });
};

export const PUT: APIRoute = async ({ request }) => {
  const { member_id, status, plan, start_date, end_date } = await request.json();

  if (!member_id || !status || !plan || !start_date || !end_date) {
    return new Response('All fields are required', { status: 400 });
  }

  // Use user_id as per new schema. Enums are lowercase.
  const normalizedStatus = status.toLowerCase();
  const normalizedPlan = plan.toLowerCase();

  const { data: existing, error: checkError } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('user_id', member_id)
    .maybeSingle();

  if (checkError) return new Response(checkError.message, { status: 500 });

  let resultError;

  if (existing) {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ 
        status: normalizedStatus, 
        plan: normalizedPlan, 
        start_date, 
        end_date 
      })
      .eq('user_id', member_id);
    resultError = error;
  } else {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .insert({ 
        user_id: member_id, 
        status: normalizedStatus, 
        plan: normalizedPlan, 
        start_date, 
        end_date 
      });
    resultError = error;
  }

  if (resultError) return new Response(resultError.message, { status: 500 });

  // Ensure permanent QR token exists (create if missing, do not regenerate)
  const { data: qrExists } = await supabaseAdmin
    .from('qr_tokens')
    .select('id')
    .eq('user_id', member_id)
    .maybeSingle();

  if (!qrExists) {
    await supabaseAdmin.from('qr_tokens').insert({
      user_id: member_id,
      token: crypto.randomUUID()
    });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
