import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const { memberId, plan, endDate, status } = await request.json();

  if (!memberId || !plan || !endDate) {
    return new Response(JSON.stringify({ error: 'Member ID, plan, and end date are required' }), { status: 400 });
  }

  const normalizedStatus = status || 'active';
  const normalizedPlan = plan.toLowerCase();

  // 1. Check if subscription exists using user_id
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', memberId)
    .maybeSingle();

  if (checkError) return new Response(JSON.stringify({ error: checkError.message }), { status: 500 });

  let resultError;

  if (existing) {
    // 2. Update existing
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ 
        status: normalizedStatus, 
        plan: normalizedPlan, 
        end_date: endDate 
      })
      .eq('user_id', memberId);
    resultError = error;
  } else {
    // 3. Insert new
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: memberId,
        plan: normalizedPlan,
        end_date: endDate,
        status: normalizedStatus,
        start_date: new Date().toISOString().split('T')[0]
      });
    resultError = error;
  }

  if (resultError) {
    return new Response(JSON.stringify({ error: resultError.message }), { status: 500 });
  }

  // Ensure permanent QR token exists (create if missing, do not regenerate)
  const { data: qrExists } = await supabaseAdmin
    .from('qr_tokens')
    .select('id')
    .eq('user_id', memberId)
    .maybeSingle();

  if (!qrExists) {
    await supabaseAdmin.from('qr_tokens').insert({
      user_id: memberId,
      token: crypto.randomUUID()
    });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
