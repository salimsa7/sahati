import type { APIRoute } from 'astro';
import { supabase, supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const name = formData.get('name')?.toString();
  const email = formData.get('email')?.toString();
  const phone = formData.get('phone')?.toString();
  const password = formData.get('password')?.toString();
  const confirmPassword = formData.get('confirmPassword')?.toString();

  if (!name || !email || !phone || !password || !confirmPassword) {
    return new Response('All fields are required', { status: 400 });
  }

  if (password !== confirmPassword) {
    return new Response('Passwords do not match', { status: 400 });
  }

  // 1. Sign up user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return new Response(error.message, { status: error.status || 400 });
  }

  const { session, user } = data;
  if (!user) return new Response('User creation failed', { status: 500 });

  // 2. Insert into users table
  const { error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      id: user.id,
      name,
      email,
      phone,
    });

  if (profileError) {
    console.error('Profile insertion error:', profileError);
    return new Response(profileError.message, { status: 500 });
  }

  // Set cookies for SSR
  if (session) {
    cookies.set('sb-access-token', session.access_token, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    });
    cookies.set('sb-refresh-token', session.refresh_token, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  // Auto-login happens with signUp in some configs, but we redirect to dashboard
  return redirect('/member/dashboard?registered=true');
};
