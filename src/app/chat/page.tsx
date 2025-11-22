'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Users, Search, MessageSquare, LogOut, Moon, Sun } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LoadingPage, LoadingCard } from '@/components/Loading';
import ErrorBoundary from '@/components/ErrorBoundary';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface ChatSession {
  id: string;
  participant1: User;
  participant2: User;
  lastMessage?: {
    id: string;
    encryptedContent: string;
    timestamp: string;
    senderId: string;
  };
}

interface Message {
  id: string;
  senderId: string;
  sender: User;
  encryptedContent: string;
  timestamp: string;
}

interface DoubleRatchetState {
  rootKey: string;
  senderChainKey: string;
  receiverChainKey: string;
  senderRatchetKey: { publicKey: string; privateKey: string };
  receiverRatchetKey: { publicKey: string; privateKey: string };
  messageNumber: number;
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [ratchetStates, setRatchetStates] = useState<Map<string, DoubleRatchetState>>(new Map());
  const [isTyping, setIsTyping] = useState<Map<string, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/');
          return;
        }
        const user = await response.json();
        setCurrentUser(user);
      } catch (error) {
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      // Initialize socket connection
      const newSocket = io('/api/socket/io', {
        auth: {
          token: document.cookie.split('session-token=')[1]?.split(';')[0],
        },
      });

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
      });

      newSocket.on('message-received', (data) => {
        if (selectedSession && data.chatSessionId === selectedSession.id) {
          setMessages(prev => [...prev, {
            id: data.messageId,
            senderId: data.senderId,
            sender: { id: data.senderId, name: data.senderName, email: '' },
            encryptedContent: data.content,
            timestamp: data.timestamp,
          }]);
        }
      });

      newSocket.on('user-typing', (data) => {
        setIsTyping(prev => new Map(prev).set(data.userId, data.isTyping));
      });

      setSocket(newSocket);

      // Load chat sessions
      loadSessions();

      return () => {
        newSocket.close();
      };
    }
  }, [currentUser]);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/chat/session');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/users?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const startChat = async (otherUser: User) => {
    try {
      const response = await fetch('/api/chat/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participantEmail: otherUser.email }),
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.isExisting) {
          // Store ratchet state for new session
          setRatchetStates(prev => new Map(prev).set(data.session.id, data.ratchetState));
        }
        
        setSelectedSession(data.session);
        setSearchResults([]);
        setSearchQuery('');
        loadSessions();
        loadMessages(data.session.id);
        
        if (socket) {
          socket.emit('join-chat', data.session.id);
        }
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?chatSessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedSession || !currentUser) return;

    const ratchetState = ratchetStates.get(selectedSession.id);
    if (!ratchetState) {
      console.error('No ratchet state found for session');
      return;
    }

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatSessionId: selectedSession.id,
          content: messageInput,
          ratchetState,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update ratchet state
        setRatchetStates(prev => new Map(prev).set(selectedSession.id, data.newRatchetState));
        
        // Add message to local state
        setMessages(prev => [...prev, data.message]);
        
        // Emit socket event
        if (socket) {
          socket.emit('new-message', {
            chatSessionId: selectedSession.id,
            messageId: data.message.id,
            content: messageInput,
            receiverId: selectedSession.participant1.id === currentUser.id 
              ? selectedSession.participant2.id 
              : selectedSession.participant1.id,
          });
        }
        
        setMessageInput('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (socket && selectedSession) {
      socket.emit('typing', {
        chatSessionId: selectedSession.id,
        isTyping,
      });
    }
  };

  const getOtherUser = (session: ChatSession) => {
    if (!currentUser) return session.participant1;
    return session.participant1.id === currentUser.id ? session.participant2 : session.participant1;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!currentUser) {
    return <LoadingPage text="Authenticating..." />;
  }

  if (isLoading) {
    return <LoadingPage text="Loading chats..." />;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Passk</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Search Users */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="pl-10"
            />
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => startChat(user)}
                  className="p-2 hover:bg-accent rounded cursor-pointer flex items-center gap-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.name?.[0] || user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.name || user.email}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Sessions */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">Recent Chats</h2>
            {sessions.map((session) => {
              const otherUser = getOtherUser(session);
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    setSelectedSession(session);
                    loadMessages(session.id);
                    if (socket) {
                      socket.emit('join-chat', session.id);
                    }
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedSession?.id === session.id ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {otherUser.name?.[0] || otherUser.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">
                          {otherUser.name || otherUser.email}
                        </div>
                        {session.lastMessage && (
                          <div className="text-xs text-muted-foreground">
                            {formatTime(session.lastMessage.timestamp)}
                          </div>
                        )}
                      </div>
                      {session.lastMessage && (
                        <div className="text-sm text-muted-foreground truncate">
                          {session.lastMessage.encryptedContent}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedSession ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {getOtherUser(selectedSession).name?.[0] || getOtherUser(selectedSession).email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {getOtherUser(selectedSession).name || getOtherUser(selectedSession).email}
                </div>
                <div className="text-sm text-muted-foreground">
                  {Array.from(isTyping.entries())
                    .filter(([_, typing]) => typing)
                    .map(([userId]) => userId === getOtherUser(selectedSession).id ? 'Typing...' : '')
                    .join(', ') || 'Online'}
                </div>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === currentUser.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div>{message.encryptedContent}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  handleTyping(e.target.value.length > 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button onClick={sendMessage} disabled={!messageInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Select a chat</h3>
            <p>Choose a conversation from the sidebar or start a new one</p>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}