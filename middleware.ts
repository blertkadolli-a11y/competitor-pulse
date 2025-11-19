import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Skip middleware for non-protected routes if Supabase is not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured and trying to access protected routes
  if ((!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) && req.nextUrl.pathname.startsWith('/dashboard')) {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Configuration Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
            h1 { color: #dc2626; }
            code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
            pre { background: #f9fafb; padding: 16px; border-radius: 8px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h1>Configuration Required</h1>
          <p>Missing Supabase environment variables. Please create a <code>.env.local</code> file in your project root with:</p>
          <pre>NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key</pre>
          <p>Get these values from: <a href="https://supabase.com/dashboard/project/_/settings/api" target="_blank">Supabase Dashboard > Settings > API</a></p>
          <p>After adding the file, restart your development server.</p>
        </body>
      </html>
    `;
    return new NextResponse(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // For non-protected routes (like landing page), skip Supabase initialization
  if (!req.nextUrl.pathname.startsWith('/dashboard') && 
      req.nextUrl.pathname !== '/login' && 
      req.nextUrl.pathname !== '/signup') {
    return NextResponse.next();
  }

  // If Supabase is not configured, allow access to login/signup but skip auth check
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    return NextResponse.next();
  }

  // Validate URL format before creating client
  try {
    new URL(supabaseUrl);
  } catch {
    // Invalid URL format, skip Supabase operations
    return NextResponse.next();
  }

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value));
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect authenticated users away from auth pages
  if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
