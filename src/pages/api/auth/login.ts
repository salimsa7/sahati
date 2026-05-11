import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const role = formData.get('role')?.toString(); // 'member', 'staff', or 'admin'

  if (!email || !password || !role) {
    return new Response('Email, password, and role are required', { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(error.message, { status: 401 });
  }

  const { session, user } = data;

  // Verify role
  let table = '';
  if (role === 'member') table = 'users';
  else if (role === 'staff') table = 'staff';
  else if (role === 'admin') table = 'admins';

  const { data: roleData, error: roleError } = await supabase
    .from(table)
    .select('id')
    .eq('id', user.id)
    .single();

  if (roleError || !roleData) {
    // Not authorized for this role
    await supabase.auth.signOut();
    return new Response('Invalid email or password for this role.', { status: 401 });
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

  return redirect(`/${role}/dashboard`);
};
