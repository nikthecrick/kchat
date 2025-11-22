import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';

export interface RegistrationOptions {
  options: any;
  userId: string;
  challenge: string;
}

export interface AuthenticationOptions {
  options: any;
  userId: string;
  challenge: string;
}

export class WebAuthnClient {
  // Start passkey registration
  async startRegistration(options: RegistrationOptions): Promise<RegistrationResponseJSON> {
    try {
      console.log('Starting registration with options:', options);
      
      if (!options || !options.options) {
        throw new Error('Invalid registration options provided');
      }

      if (!options.options.challenge) {
        throw new Error('Challenge is missing from registration options');
      }

      const result = await startRegistration(options.options);
      console.log('Registration completed successfully:', result);
      return result;
    } catch (error) {
      console.error('Registration start error:', error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to start passkey registration: ${error.message}`);
      }
      
      throw new Error('Failed to start passkey registration');
    }
  }

  // Complete passkey registration
  async completeRegistration(
    options: RegistrationOptions,
    credential: RegistrationResponseJSON
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/auth/register/complete', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential,
          challenge: options.challenge,
          userId: options.userId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Registration failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('Registration completion error:', error);
      return { success: false, error: 'Network error during registration' };
    }
  }

  // Start passkey authentication
  async startAuthentication(options: AuthenticationOptions): Promise<AuthenticationResponseJSON> {
    try {
      console.log('Starting authentication with options:', options);
      
      if (!options || !options.options) {
        throw new Error('Invalid authentication options provided');
      }

      if (!options.options.challenge) {
        throw new Error('Challenge is missing from authentication options');
      }

      const result = await startAuthentication(options.options);
      console.log('Authentication completed successfully:', result);
      return result;
    } catch (error) {
      console.error('Authentication start error:', error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to start passkey authentication: ${error.message}`);
      }
      
      throw new Error('Failed to start passkey authentication');
    }
  }

  // Complete passkey authentication
  async completeAuthentication(
    options: AuthenticationOptions,
    credential: AuthenticationResponseJSON
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const response = await fetch('/api/auth/login/complete', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential,
          challenge: options.challenge,
          userId: options.userId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Authentication failed' };
      }

      return { success: true, user: result.user };
    } catch (error) {
      console.error('Authentication completion error:', error);
      return { success: false, error: 'Network error during authentication' };
    }
  }

  // Check if passkeys are supported
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    return (
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function' &&
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== undefined
    );
  }

  // Check if platform authenticator is available
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }
}

export const webAuthnClient = new WebAuthnClient();