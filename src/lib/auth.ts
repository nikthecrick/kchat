import { NextRequest } from 'next/server';
import { jwt } from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
}

export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session-token')?.value;

    if (!sessionToken) {
      return null;
    }

    // Verify JWT token
    const decoded = jwt.verify(sessionToken, JWT_SECRET) as any;

    if (!decoded || !decoded.userId) {
      return null;
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export function createSessionCookie(user: AuthenticatedUser): string {
  const sessionToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return sessionToken;
}