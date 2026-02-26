import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const adminPassword = process.env.ADMIN_PASSWORD || '1234';

        if (password === adminPassword) {
            const response = NextResponse.json({ success: true });
            // Set HttpOnly cookie valid for 7 days
            response.cookies.set('auth-token', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });
            return response;
        }

        return NextResponse.json(
            { success: false, message: 'Invalid Admin Password' },
            { status: 401 }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
