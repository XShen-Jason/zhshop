import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    let next = searchParams.get('next') ?? '/';

    // Handle password recovery flow explicitly
    if (type === 'recovery') {
        next = '/auth/reset-password';
    }

    const supabase = await createClient();

    // Method 1: PKCE code exchange (same-browser flow)
    if (code) {
        console.log('[AuthCallback] Exchanging code:', code);
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            console.log('[AuthCallback] Code exchange success, redirecting to:', next);
            return redirectToNext(request, origin, next, type);
        } else {
            console.error('[AuthCallback] Code exchange error:', error);
        }
    }

    // Method 2: Token hash verification (cross-browser flow)
    if (token_hash && type) {
        console.log('[AuthCallback] Verifying token_hash, type:', type);
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type,
        });

        if (!error) {
            console.log('[AuthCallback] Token hash verification success');
            return redirectToNext(request, origin, next, type);
        } else {
            console.error('[AuthCallback] Token hash verification error:', error);
        }
    }

    // Error: redirect to login with error message
    return NextResponse.redirect(`${origin}/auth/login?error=验证失败，请重试`);
}

function redirectToNext(request: Request, origin: string, next: string, type: EmailOtpType | null) {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const isLocalEnv = process.env.NODE_ENV === 'development';

    // Add verified=true for signup confirmation so login page can show success message
    const separator = next.includes('?') ? '&' : '?';
    const finalNext = type === 'signup' ? `${next}${separator}verified=true` : next;

    if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${finalNext}`);
    } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${finalNext}`);
    } else {
        return NextResponse.redirect(`${origin}${finalNext}`);
    }
}
