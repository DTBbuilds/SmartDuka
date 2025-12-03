import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/admin',
  '/cashier',
  '/branch-manager',
  '/inventory',
  '/pos',
  '/reports',
  '/settings',
  '/customers',
  '/orders',
  '/payments',
];

// Routes that are only for unauthenticated users
const authRoutes = ['/login', '/login-pin', '/register'];

// Public routes that don't need any checks
const publicRoutes = ['/', '/about', '/contact', '/privacy', '/terms'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookies
  const token = request.cookies.get('smartduka_token')?.value;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname.startsWith(route)
  );

  // Check if the route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // If trying to access protected route without token, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If trying to access auth routes with token, redirect to appropriate dashboard
  if (isAuthRoute && token) {
    // Try to decode token to get role (basic check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload.role;

      if (role === 'admin' || role === 'super_admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else if (role === 'branch_manager') {
        return NextResponse.redirect(new URL('/branch-manager', request.url));
      } else if (role === 'cashier') {
        return NextResponse.redirect(new URL('/cashier', request.url));
      }
    } catch {
      // If token is invalid, let them proceed to login
    }
  }

  // Add security headers
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

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
     * - api routes (handled by API)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
