import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { webAuthnService } from '@/lib/webauthn';

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

    // Verify registration
    const verification = await webAuthnService.verifyRegistration(
      credential,
      challenge,
      user
    );

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Passkey registration failed' },
        { status: 400 }
      );
    }

    // Update user with passkey credentials
    await db.user.update({
      where: { id: userId },
      data: {
        passkeyCredentialId: verification.credentialId,
        passkeyPublicKey: verification.publicKey,
        passkeyCounter: BigInt(verification.counter),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Registration completed successfully',
    });
  } catch (error) {
    console.error('Registration completion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}