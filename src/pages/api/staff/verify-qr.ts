import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const { token } = await request.json();

  if (!token) {
    return new Response(JSON.stringify({ error: 'Token is required' }), { status: 400 });
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
  if (!isUUID) {
    return new Response(JSON.stringify({ success: false, message: 'Invalid Token Format' }), { status: 200 });
  }

  // 1. Find member by token
  const { data: qrData, error: qrError } = await supabaseAdmin
    .from('qr_tokens')
    .select('user_id')
    .eq('token', token)
    .single();

  if (qrError || !qrData) {
    // Log failed attempt
    await supabaseAdmin.from('access_logs').insert({
      scanned_token: token,
      result: 'denied',
      scanned_at: new Date().toISOString()
    });
    return new Response(JSON.stringify({ success: false, message: 'Invalid Token' }), { status: 200 });
  }

  const userId = qrData.user_id;

  // 2. Check subscription status
  const { data: subscription, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select('*, users(name)')
    .eq('user_id', userId)
    .single();

  if (subError || !subscription) {
     // Log failed attempt
     await supabaseAdmin.from('access_logs').insert({
      user_id: userId,
      scanned_token: token,
      result: 'denied',
      scanned_at: new Date().toISOString()
    });
    return new Response(JSON.stringify({ success: false, message: 'No Subscription Found' }), { status: 200 });
  }

  const isActive = subscription.status === 'active' && new Date(subscription.end_date) > new Date();

  // 3. Log attempt
  await supabaseAdmin.from('access_logs').insert({
    user_id: userId,
    scanned_token: token,
    result: isActive ? 'granted' : 'denied',
    scanned_at: new Date().toISOString()
  });

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

  return new Response(JSON.stringify({
    success: isActive,
    member: {
      name: subscription.users?.name,
      plan: capitalize(subscription.plan),
      expiry: subscription.end_date
    },
    message: isActive ? 'Access Granted' : 'Access Denied (Expired)'
  }), { status: 200 });
};
