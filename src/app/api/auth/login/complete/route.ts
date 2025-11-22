import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { webAuthnService } from '@/lib/webauthn';
import { jwt } from 'jsonwebtoken';

// Simple JWT session management (in production, use proper session management)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function PUT(request: NextRequest) {
  try {
    const { credential, challenge, userId } = await request.json();

    if (!credential || !challenge || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify authentication
    const verification = await webAuthnService.verifyAuthentication(
      credential,
      challenge,
      user
    );

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Update passkey counter
    await db.user.update({
      where: { id: userId },
      data: {
        passkeyCounter: BigInt(verification.counter),
      },
    });

    // Create session token
    const sessionToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    response.cookies.set('session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login completion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}