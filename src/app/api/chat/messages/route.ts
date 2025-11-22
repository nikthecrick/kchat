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

    const { chatSessionId, content, ratchetState } = await request.json();

    if (!chatSessionId || !content || !ratchetState) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get chat session
    const session = await db.chatSession.findUnique({
      where: { id: chatSessionId },
      include: {
        participant1: { select: { id: true } },
        participant2: { select: { id: true } },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Verify user is part of the chat
    if (session.participant1Id !== user.id && session.participant2Id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Determine receiver
    const receiverId = session.participant1Id === user.id ? session.participant2Id : session.participant1Id;

    // Encrypt message using Double Ratchet
    const { encryptedMessage, newState } = await cryptoUtils.encryptDoubleRatchet(
      ratchetState,
      content
    );

    // Save message to database
    const message = await db.message.create({
      data: {
        chatSessionId,
        senderId: user.id,
        receiverId,
        encryptedContent: encryptedMessage.encryptedContent,
        messageKey: encryptedMessage.messageKey,
        previousChainKey: encryptedMessage.previousChainKey,
        messageNumber: BigInt(encryptedMessage.messageNumber),
      },
      include: {
        sender: {
          select: { id: true, email: true, name: true },
        },
        receiver: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    // Update chat session with new ratchet state
    await db.chatSession.update({
      where: { id: chatSessionId },
      data: {
        rootKey: newState.rootKey,
        senderChainKey: newState.senderChainKey,
        receiverChainKey: newState.receiverChainKey,
        senderRatchetKey: newState.senderRatchetKey.publicKey,
        receiverRatchetKey: newState.receiverRatchetKey.publicKey,
        messageCounter: BigInt(newState.messageNumber),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message,
      newRatchetState: newState,
    });
  } catch (error) {
    console.error('Send message error:', error);
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

    const { searchParams } = new URL(request.url);
    const chatSessionId = searchParams.get('chatSessionId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!chatSessionId) {
      return NextResponse.json(
        { error: 'Chat session ID is required' },
        { status: 400 }
      );
    }

    // Verify user is part of the chat
    const session = await db.chatSession.findUnique({
      where: { id: chatSessionId },
      select: {
        participant1Id: true,
        participant2Id: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }

    if (session.participant1Id !== user.id && session.participant2Id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get messages with pagination
    const messages = await db.message.findMany({
      where: { chatSessionId },
      include: {
        sender: {
          select: { id: true, email: true, name: true },
        },
        receiver: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await db.message.count({
      where: { chatSessionId },
    });

    return NextResponse.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}