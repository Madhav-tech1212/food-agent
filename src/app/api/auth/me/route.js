import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken, TOKEN_COOKIE } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE)?.value;
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        user: {
          id: user._id?.toString() || user._id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth] Me error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

export async function POST() {
  // Use POST /api/auth/me as logout (simple, avoids extra routes)
  try {
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

