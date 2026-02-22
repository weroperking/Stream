import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/landing',
    '/login',
    '/register',
    '/api/auth/onboarding-status',
  ];

  // Define onboarding routes (only /taste - /profiles is accessible for profile switching)
  const onboardingRoutes = ['/taste'];

  // Define protected routes that require authentication
  const protectedRoutes = [
    '/movies',
    '/tv',
    '/genres',
    '/year',
    '/search',
    '/saved',
    '/watch',
    '/movie',
  ];

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => {
    if (route === '/') {
      // Root is only public if user is not authenticated
      return !user;
    }
    return pathname === route || pathname.startsWith(route);
  });

  // Check if the route is an onboarding route
  const isOnboardingRoute = onboardingRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the route is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // If user is not signed in and trying to access a protected route
  if (!user && isProtectedRoute) {
    const redirectUrl = new URL('/landing', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is signed in
  if (user) {
    // Get the profile to check onboarding status
    // Use current_step to match database schema
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed, current_step')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist or has schema error, allow access
    // This handles the case where database columns might not exist yet
    if (profileError || !profile) {
      return response;
    }

    const onboardingCompleted = profile.onboarding_completed ?? false;

    // If onboarding is not completed and user is not on onboarding pages
    if (!onboardingCompleted && !isOnboardingRoute) {
      // Redirect to onboarding profiles
      const redirectUrl = new URL('/profiles', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // If onboarding is completed and user is trying to access onboarding pages
    if (onboardingCompleted && isOnboardingRoute) {
      // Redirect to homepage
      const redirectUrl = new URL('/', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // If user is signed in and trying to access landing/login/register
    if (pathname === '/landing' || pathname === '/login' || pathname === '/register') {
      // Redirect to homepage
      const redirectUrl = new URL('/', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
