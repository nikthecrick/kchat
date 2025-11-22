import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { cryptoUtils } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { participantEmail } = await request.json();

    if (!participantEmail) {
      return NextResponse.json(
        { error: 'Participant email is required' },
        { status: 400 }
      );
    }

    // Find the other user
    const otherUser = await db.user.findUnique({
      where: { email: participantEmail },
      select: {
        id: true,
        email: true,
        name: true,
        e2ePublicKey: true,
      },
    });

    if (!otherUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (otherUser.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot start a chat with yourself' },
        { status: 400 }
      );
    }

    // Check if chat session already exists
    const existingSession = await db.chatSession.findFirst({
      where: {
        OR: [
          { participant1Id: user.id, participant2Id: otherUser.id },
          { participant1Id: otherUser.id, participant2Id: user.id },
        ],
      },
      include: {
        participant1: {
          select: { id: true, email: true, name: true },
        },
        participant2: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (existingSession) {
      return NextResponse.json({
        session: existingSession,
        isExisting: true,
      });
    }

    // Get current user's E2E keys
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { e2ePrivateKey: true, e2ePublicKey: true },
    });

    if (!currentUser?.e2ePrivateKey || !currentUser?.e2ePublicKey || !otherUser.e2ePublicKey) {
      return NextResponse.json(
        { error: 'E2E encryption keys not found' },
        { status: 400 }
      );
    }

    // Perform Diffie-Hellman key exchange
    const sharedSecret = cryptoUtils.diffieHellman(
      currentUser.e2ePrivateKey,
      otherUser.e2ePublicKey
    );

    // Initialize Double Ratchet
    const ratchetState = await cryptoUtils.initializeDoubleRatchet(sharedSecret);

    // Create new chat session
    const newSession = await db.chatSession.create({
      data: {
        participant1Id: user.id,
        participant2Id: otherUser.id,
        rootKey: ratchetState.rootKey,
        senderChainKey: ratchetState.senderChainKey,
        receiverChainKey: ratchetState.receiverChainKey,
        senderRatchetKey: ratchetState.senderRatchetKey.publicKey,
        receiverRatchetKey: ratchetState.receiverRatchetKey.publicKey,
        messageCounter: BigInt(0),
      },
      include: {
        participant1: {
          select: { id: true, email: true, name: true },
        },
        participant2: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return NextResponse.json({
      session: newSession,
      isExisting: false,
      ratchetState: {
        rootKey: ratchetState.rootKey,
        senderChainKey: ratchetState.senderChainKey,
        receiverChainKey: ratchetState.receiverChainKey,
        senderRatchetKey: ratchetState.senderRatchetKey,
        receiverRatchetKey: ratchetState.receiverRatchetKey,
        messageNumber: ratchetState.messageNumber,
      },
    });
  } catch (error) {
    console.error('Create chat session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all chat sessions for the user
    const sessions = await db.chatSession.findMany({
      where: {
        OR: [
          { participant1Id: user.id },
          { participant2Id: user.id },
        ],
      },
      include: {
        participant1: {
          select: { id: true, email: true, name: true },
        },
        participant2: {
          select: { id: true, email: true, name: true },
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: {
            id: true,
            encryptedContent: true,
            timestamp: true,
            senderId: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Get chat sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}