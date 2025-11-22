'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Lock, UserPlus } from 'lucide-react';
import { webAuthnClient } from '@/lib/webauthn-client';
import { useRouter } from 'next/navigation';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  // Ensure we're on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleRegister = async (email: string, name?: string) => {
    if (!isClient) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Starting registration for email:', email);
      
      // Start registration
      const regResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      });

      const regData = await regResponse.json();
      console.log('Registration API response:', regData);

      if (!regResponse.ok) {
        throw new Error(regData.error || 'Registration failed');
      }

      setSuccess('Registration initiated. Please complete the passkey creation...');

      // Complete registration with passkey
      console.log('Calling webAuthnClient.startRegistration with:', regData);
      const credential = await webAuthnClient.startRegistration(regData);
      console.log('Passkey credential created:', credential);
      
      const completionResult = await webAuthnClient.completeRegistration(regData, credential);
      console.log('Registration completion result:', completionResult);

      if (!completionResult.success) {
        throw new Error(completionResult.error || 'Passkey creation failed');
      }

      setSuccess('Account created successfully! You can now login.');
      setIsLoading(false);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
    }
  };

  const handleLogin = async (email: string) => {
    if (!isClient) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Starting login for email:', email);
      
      // Start authentication
      const authResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const authData = await authResponse.json();
      console.log('Login API response:', authData);

      if (!authResponse.ok) {
        throw new Error(authData.error || 'Login failed');
      }

      setSuccess('Authentication initiated. Please complete with your passkey...');

      // Complete authentication with passkey
      console.log('Calling webAuthnClient.startAuthentication with:', authData);
      const credential = await webAuthnClient.startAuthentication(authData);
      console.log('Passkey authentication completed:', credential);
      
      const completionResult = await webAuthnClient.completeAuthentication(authData, credential);
      console.log('Login completion result:', completionResult);

      if (!completionResult.success) {
        throw new Error(completionResult.error || 'Authentication failed');
      }

      setUser(completionResult.user);
      setSuccess('Login successful! Redirecting to chat...');
      
      // Redirect to chat after a short delay
      setTimeout(() => {
        router.push('/chat');
      }, 1500);
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  const RegisterForm = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleRegister(email, name || undefined);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reg-email">Email</Label>
          <Input
            id="reg-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-name">Name (Optional)</Label>
          <Input
            id="reg-name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Passkey...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Create Account
            </>
          )}
        </Button>
      </form>
    );
  };

  const LoginForm = () => {
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleLogin(email);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Login with Passkey
            </>
          )}
        </Button>
      </form>
    );
  };

  // Show loading state until client is ready
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Loading...</h2>
              <p className="text-muted-foreground">Initializing authentication</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-600">Welcome back!</h2>
              <p className="text-muted-foreground">Redirecting you to chat...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">KChat</CardTitle>
          <CardDescription>
            End-to-End Encrypted Chat with Passkeys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Welcome Back</h3>
                <p className="text-sm text-muted-foreground">
                  Login securely with your passkey
                </p>
              </div>
              <LoginForm />
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Create Account</h3>
                <p className="text-sm text-muted-foreground">
                  Register with a secure passkey
                </p>
              </div>
              <RegisterForm />
            </TabsContent>
          </Tabs>

          {error && (
            <Alert className="mt-4 border-destructive">
              <AlertDescription className="text-destructive">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>🔐 Passkeys provide phishing-resistant authentication</p>
            <p>🔒 Messages are encrypted end-to-end</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}