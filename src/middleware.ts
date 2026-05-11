import { defineMiddleware } from 'astro:middleware'
import { supabase } from './lib/supabase'

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url
  const protectedPrefixes = ['/member', '/staff', '/admin']

  const accessToken = context.cookies.get('sb-access-token')?.value;
  const refreshToken = context.cookies.get('sb-refresh-token')?.value;

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  // Only run auth check for protected routes
  if (protectedPrefixes.some(p => pathname.startsWith(p))) {
    // Exclude login and create-account pages from the auth check to avoid infinite redirects
    const isLoginPage = pathname.endsWith('/login')
    const isCreateAccountPage = pathname.endsWith('/create-account')
    const isForgotPasswordPage = pathname.endsWith('/forgot-password')

    if (!isLoginPage && !isCreateAccountPage && !isForgotPasswordPage) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        if (pathname.startsWith('/member')) return context.redirect('/member/login')
        if (pathname.startsWith('/staff'))  return context.redirect('/staff/login')
        if (pathname.startsWith('/admin'))  return context.redirect('/admin/login')
      }

      // Role-based verification
      if (pathname.startsWith('/member')) {
        const { data: member } = await supabase.from('users').select('id').eq('id', user.id).single();
        if (!member) {
          await supabase.auth.signOut();
          return context.redirect('/member/login');
        }
      } else if (pathname.startsWith('/staff')) {
        const { data: staff } = await supabase.from('staff').select('id').eq('id', user.id).single();
        if (!staff) {
          await supabase.auth.signOut();
          return context.redirect('/staff/login');
        }
      } else if (pathname.startsWith('/admin')) {
        const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).single();
        if (!admin) {
          await supabase.auth.signOut();
          return context.redirect('/admin/login');
        }
      }
    }
  }

  return next()
})
