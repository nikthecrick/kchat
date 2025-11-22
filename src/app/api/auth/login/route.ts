import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { webAuthnService } from '@/lib/webauthn';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user in database
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || !user.passkeyCredentialId) {
      return NextResponse.json(
        { error: 'User not found or no passkey registered' },
        { status: 404 }
      );
    }

    // Generate authentication options
    const options = webAuthnService.generateAuthenticationOptions(user);

    return NextResponse.json({
      options: options,
      userId: user.id,
      challenge: options.challenge,
    });
  } catch (error) {
    console.error('Login start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}