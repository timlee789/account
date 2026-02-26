import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth-token')?.value;

    // Protect all routes except /login, /api/auth, and public assets
    if (
        !token &&
        request.nextUrl.pathname !== '/login' &&
        !request.nextUrl.pathname.startsWith('/api/auth') &&
        !request.nextUrl.pathname.startsWith('/_next') &&
        !request.nextUrl.pathname.match(/\.(.*)$/)
    ) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Redirect authenticated users trying to access login page back to dashboard
    if (token && request.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
