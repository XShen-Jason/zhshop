import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
    // List of public paths that don't need auth check
    const publicPaths = [
        '/',
        '/products',
        '/groups',
        '/lottery',
        '/tutorials',
        '/auth', // login, signup, etc
        '/api/products', // public APIs
        '/api/groups',
        '/api/lottery',
        '/api/tutorials'
    ];

    const { pathname } = request.nextUrl;

    // Check if the current path starts with any of the public paths
    const isPublic = publicPaths.some(path =>
        pathname === path || pathname.startsWith(`${path}/`)
    );

    // If it's a public path, skip the supabase session update (which makes a network call)
    // UNLESS it's a specific protected API or admin route that might share the prefix (not the case here usually)
    if (isPublic) {
        return NextResponse.next();
    }

    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
