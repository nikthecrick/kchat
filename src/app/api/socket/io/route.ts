import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { authenticateRequest } from '@/lib/auth';

export const config = {
  api: {
    bodyParser: false,
  },
};

const SocketHandler = (req: NextApiRequest, res: NextApiResponse & { socket: any }) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? 'https://your-domain.com' 
          : 'https://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    // Authentication middleware for Socket.io
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        // Create a mock request object for authentication
        const mockRequest = {
          cookies: {
            get: (name: string) => name === 'session-token' ? token : null,
          },
        } as any;

        const user = await authenticateRequest(mockRequest);
        if (!user) {
          return next(new Error('Authentication error'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket) => {
      const user = socket.data.user;
      console.log(`User ${user.email} connected`);

      // Join user to their personal room for private messages
      socket.join(`user:${user.id}`);

      // Handle joining chat sessions
      socket.on('join-chat', (chatSessionId: string) => {
        socket.join(`chat:${chatSessionId}`);
        console.log(`User ${user.email} joined chat ${chatSessionId}`);
      });

      // Handle leaving chat sessions
      socket.on('leave-chat', (chatSessionId: string) => {
        socket.leave(`chat:${chatSessionId}`);
        console.log(`User ${user.email} left chat ${chatSessionId}`);
      });

      // Handle typing indicators
      socket.on('typing', (data: { chatSessionId: string; isTyping: boolean }) => {
        socket.to(`chat:${data.chatSessionId}`).emit('user-typing', {
          userId: user.id,
          userName: user.name || user.email,
          isTyping: data.isTyping,
        });
      });

      // Handle new messages
      socket.on('new-message', (data: {
        chatSessionId: string;
        messageId: string;
        content: string;
        receiverId: string;
      }) => {
        // Send to specific user if they're in the chat
        socket.to(`user:${data.receiverId}`).emit('message-received', {
          chatSessionId: data.chatSessionId,
          messageId: data.messageId,
          senderId: user.id,
          senderName: user.name || user.email,
          content: data.content,
          timestamp: new Date().toISOString(),
        });

        // Also send to chat room for real-time updates
        socket.to(`chat:${data.chatSessionId}`).emit('message-received', {
          chatSessionId: data.chatSessionId,
          messageId: data.messageId,
          senderId: user.id,
          senderName: user.name || user.email,
          content: data.content,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle message read status
      socket.on('mark-read', (data: { chatSessionId: string; messageId: string }) => {
        socket.to(`chat:${data.chatSessionId}`).emit('message-read', {
          messageId: data.messageId,
          readBy: user.id,
        });
      });

      // Handle user online status
      socket.on('user-online', () => {
        socket.broadcast.emit('user-status', {
          userId: user.id,
          status: 'online',
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${user.email} disconnected`);
        socket.broadcast.emit('user-status', {
          userId: user.id,
          status: 'offline',
        });
      });
    });

    res.socket.server.io = io;
  }
  res.end();
};

export default SocketHandler;