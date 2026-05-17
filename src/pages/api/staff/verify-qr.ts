import type { APIRoute } from 'astro';
import { supabase, supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { token } = await request.json();

  if (!token) {
    return new Response(JSON.stringify({ error: 'Token is required' }), { status: 400 });
  }

  // Get authenticated staff member ID using the session set by middleware
  const { data: { user: staffUser } } = await supabase.auth.getUser();
  const staffId = staffUser?.id || null;
  
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
    const { error: logError } = await supabaseAdmin.from('access_logs').insert({
      scanned_token: token,
      result: 'denied',
      scanned_by: staffId,
      scanned_at: new Date().toISOString()
    });
    if (logError) console.error('Error logging invalid token scan:', logError.message);

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
     const { error: logError } = await supabaseAdmin.from('access_logs').insert({
      user_id: userId,
      scanned_token: token,
      result: 'denied',
      scanned_by: staffId,
      scanned_at: new Date().toISOString()
    });
    if (logError) console.error('Error logging missing sub scan:', logError.message);

    return new Response(JSON.stringify({ success: false, message: 'No Subscription Found' }), { status: 200 });
  }

  // Robust date comparison: compare YYYY-MM-DD strings to avoid timezone issues
  const todayStr = new Date().toISOString().split('T')[0];
  const expiryStr = subscription.end_date; // Assuming YYYY-MM-DD from Postgres DATE field
  
  const isNotExpired = expiryStr >= todayStr;
  const isActive = subscription.status === 'active' && isNotExpired;

  // 3. Log attempt
  const { error: logError } = await supabaseAdmin.from('access_logs').insert({
    user_id: userId,
    scanned_token: token,
    result: isActive ? 'granted' : 'denied',
    scanned_by: staffId,
    scanned_at: new Date().toISOString()
  });
  if (logError) console.error('Error logging scan:', logError.message);

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

  const user = Array.isArray(subscription.users) ? subscription.users[0] : subscription.users;
  
  // Format date: May 01, 2026
  const formattedExpiry = new Date(subscription.end_date).toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric'
  });

  let message = 'Access Granted';
  if (!isActive) {
    message = subscription.status !== 'active' ? 'Subscription Inactive' : 'Subscription Expired';
  }

  return new Response(JSON.stringify({
    success: isActive,
    member: {
      name: user?.name,
      plan: capitalize(subscription.plan),
      expiry: formattedExpiry
    },
    message: message
  }), { status: 200 });
};

