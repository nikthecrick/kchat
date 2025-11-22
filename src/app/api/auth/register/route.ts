import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { webAuthnService } from '@/lib/webauthn';
import { cryptoUtils } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create user in database
    const user = await db.user.create({
      data: {
        email,
        name,
      },
    });

    // Generate E2E encryption key pair
    const e2eKeyPair = cryptoUtils.generateKeyPair();

    // Update user with E2E keys
    await db.user.update({
      where: { id: user.id },
      data: {
        e2ePublicKey: e2eKeyPair.publicKey,
        e2ePrivateKey: e2eKeyPair.privateKey,
      },
    });

    // Generate passkey registration options
    const options = webAuthnService.generateRegistrationOptions({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    // Store challenge in session or temporary storage
    // For now, we'll use a simple approach (in production, use Redis)
    const challenge = options.challenge;
    
    return NextResponse.json({
      options: options,
      userId: user.id,
      challenge: challenge,
    });
  } catch (error) {
    console.error('Registration start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}