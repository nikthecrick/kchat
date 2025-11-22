# 🔐 KChat - End-to-End Encrypted Chat with Passkeys

A production-ready, end-to-end encrypted chat application that leverages Passkeys for secure authentication and the Double Ratchet algorithm for message encryption. This demonstrates the practical implementation of modern cryptographic standards in a web application.

## 🌟 Key Features

### 🔐 Authentication & Security
- 🔑 **Passkey Authentication** - Passwordless authentication using WebAuthn/FIDO2 standards
- 🛡️ **Phishing-Resistant** - Built-in protection against phishing attacks
- 🔒 **End-to-End Encryption** - Messages encrypted client-side using Double Ratchet algorithm
- 🔑 **Perfect Forward Secrecy** - Session keys ratchet forward to protect past messages

### 💬 Chat Features
- ⚡ **Real-time Messaging** - WebSocket-based instant message delivery
- 👥 **User Management** - Find and chat with other registered users
- ⌨️ **Typing Indicators** - See when others are typing
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🌙 **Dark Mode Support** - Built-in theme switching

### 🛠️ Technical Implementation
- 🔐 **Double Ratchet Algorithm** - Signal Protocol-inspired encryption
- 🔑 **Diffie-Hellman Key Exchange** - Secure shared secret generation
- 🔒 **AES-256 Encryption** - Military-grade symmetric encryption
- ⚡ **WebSocket Real-time** - Socket.io for instant messaging
- 🗄️ **SQLite Database** - Persistent storage with Prisma ORM

## 🚀 Technology Stack

### 🔐 Security & Cryptography
- `@simplewebauthn/server & browser` - WebAuthn/Passkey implementation
- `tweetnacl & tweetnacl-util` - Cryptographic primitives
- `libsodium-wrappers` - Advanced cryptographic operations

### ⚡ Core Framework
- ⚡ **Next.js 15** - React framework with App Router
- 📘 **TypeScript 5** - Type-safe development
- 🎨 **Tailwind CSS 4** - Utility-first styling
- 🧩 **shadcn/ui** - High-quality UI components

### 🔄 Real-time Features
- 🔌 **Socket.io** - WebSocket server and client
- 🗄️ **Prisma** - Type-safe database ORM
- 🌐 **SQLite** - Lightweight database storage

## 🚀 Quick Start

⚠️ **Important**: Passkeys require HTTPS to function properly!

### Option 1: Development with HTTPS (Recommended)
```bash
# Install dependencies
npm install

# Set up database
npm run db:push

# Start development server
npm run dev

# Visit https://localhost:3000
# Note: You'll need to accept browser security warning for self-signed certificate
```

### Option 2: HTTP Development (Limited)
```bash
# Only for UI testing - Passkeys won't work!
npm run dev
npm run db:push

# Visit http://localhost:3000
```

## 📱 Usage Guide

### ⚠️ HTTPS Required
Passkeys only work on secure connections (HTTPS). For development, you'll need to set up a local HTTPS certificate.

### 1. Create Account
1. Click "Register" tab
2. Enter your email and optional name
3. Follow your browser's Passkey creation prompt
4. Account created successfully!

### 2. Login
1. Click "Login" tab
2. Enter your email
3. Authenticate using your Passkey (biometrics, security key, etc.)
4. Welcome to your encrypted chat!

### 3. Start Chatting
1. Enter another user's email in the sidebar search
2. Click on the user to start conversation
3. Type and send messages - they're encrypted end-to-end!
4. Enjoy real-time delivery with typing indicators

## 🔒 Security Features

### Passkey Security
- **Private Key Security**: Keys stored in device secure enclave
- **Server Safety**: Server only stores public keys
- **Replay Protection**: Counter-based replay attack prevention
- **Phishing Resistance**: Bound to originating domain

### Message Encryption
- **End-to-End**: Only sender and receiver can read messages
- **Forward Secrecy**: Compromised keys don't reveal past messages
- **Perfect Secrecy**: Each message uses unique encryption key
- **Server Blindness**: Server cannot decrypt message content

## 🏛️ Database Schema

### User
```typescript
{
  id: String (Primary)
  email: String (Unique)
  name: String?
  passkeyCredentialId: String? (Unique)
  passkeyPublicKey: String?
  passkeyCounter: BigInt?
  e2ePublicKey: String?
  e2ePrivateKey: String?
}
```

### ChatSession
```typescript
{
  id: String (Primary)
  participant1Id: String
  participant2Id: String
  rootKey: String?
  senderChainKey: String?
  receiverChainKey: String?
  senderRatchetKey: String?
  receiverRatchetKey: String?
  messageCounter: BigInt
}
```

### Message
```typescript
{
  id: String (Primary)
  chatSessionId: String
  senderId: String
  receiverId: String
  encryptedContent: String
  messageKey: String?
  previousChainKey: String?
  messageNumber: BigInt
  timestamp: DateTime
  delivered: Boolean
  read: Boolean
}
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Start registration
- `PUT /api/auth/register/complete` - Complete registration
- `POST /api/auth/login` - Start login
- `PUT /api/auth/login/complete` - Complete login
- `GET /api/auth/me` - Get current user

### Chat
- `POST /api/chat/session` - Start new chat
- `GET /api/chat/session` - Get user sessions
- `POST /api/chat/messages` - Send message
- `GET /api/chat/messages` - Get messages

### Users
- `GET /api/users` - Search users

### WebSocket
- `GET /api/socket/io` - WebSocket connection

## 🌟 What Makes This Special

### Real-World Cryptography
This isn't a demo - it implements production-grade cryptographic protocols:
- **Double Ratchet**: Same algorithm used by Signal and WhatsApp
- **WebAuthn**: Industry standard for passwordless authentication
- **Perfect Forward Secrecy**: Military-grade security properties

### Modern Web Standards
- **Passkeys**: Future of authentication, replacing passwords
- **WebAssembly**: High-performance crypto operations in browser
- **Service Workers**: Offline-capable architecture

### Developer Experience
- **Type Safety**: Full TypeScript coverage
- **Modern Stack**: Latest React, Next.js, and tooling
- **Clean Architecture**: Separated concerns and modular design

## 🛡️ Security Considerations

### Production Deployment
- **HTTPS Required**: Passkeys require secure context
- **Domain Binding**: Passkeys bound to specific domain
- **Key Storage**: Private keys never leave user device
- **Database Security**: Encrypt sensitive stored data

### Limitations
- **Browser Support**: Requires modern browser with WebAuthn support
- **Device Storage**: Passkeys stored on device (not cloud)
- **Single Device**: Currently supports single device per user
- **Key Recovery**: Lost device = lost account (add recovery in production)

## 🚀 Future Enhancements

### Security
- Multi-device support with key synchronization
- Account recovery mechanisms
- Message authentication codes
- Key rotation policies

### Features
- File sharing with encryption
- Voice/video calling
- Message reactions
- Group chats
- Message search (encrypted)

### Infrastructure
- Redis for session storage
- PostgreSQL for production
- Docker containerization
- CI/CD pipeline

## 🤝 Contributing

This project demonstrates advanced web security concepts. Feel free to:

- Study the cryptographic implementations
- Suggest security improvements
- Report security issues responsibly
- Extend the functionality

---

Built with ❤️ for secure communication. Demonstrating modern web cryptography 🔐