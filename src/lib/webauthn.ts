import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';

const RP_ID = process.env.NODE_ENV === 'production' 
  ? process.env.RP_ID || 'your-domain.com'
  : process.env.RP_ID || 'localhost';

const RP_NAME = 'Passk - Encrypted Chat';
const ORIGIN = process.env.NODE_ENV === 'production'
  ? process.env.ORIGIN || 'https://your-domain.com'
  : process.env.ORIGIN || 'http://localhost:3000';

export interface PasskeyUser {
  id: string;
  email: string;
  name?: string;
  passkeyCredentialId?: string;
  passkeyPublicKey?: string;
  passkeyCounter?: bigint;
}

export class WebAuthnService {
  // Generate registration options for new passkey
  generateRegistrationOptions(user: PasskeyUser) {
    return generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(user.id),
      userName: user.email,
      userDisplayName: user.name || user.email,
      timeout: 60000,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });
  }

  // Verify registration response
  async verifyRegistration(
    response: RegistrationResponseJSON,
    challenge: string,
    user: PasskeyUser
  ): Promise<{
    verified: boolean;
    credentialId: string;
    publicKey: string;
    counter: number;
  }> {
    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new Error('Registration verification failed');
      }

      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      return {
        verified: true,
        credentialId: credentialID,
        publicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
      };
    } catch (error) {
      console.error('Registration verification error:', error);
      return {
        verified: false,
        credentialId: '',
        publicKey: '',
        counter: 0,
      };
    }
  }

  // Generate authentication options for existing passkey
  generateAuthenticationOptions(user?: PasskeyUser) {
    const options = generateAuthenticationOptions({
      rpID: RP_ID,
      rpName: RP_NAME,
      timeout: 60000,
      allowCredentials: user?.passkeyCredentialId
        ? [
            {
              id: user.passkeyCredentialId,
              type: 'public-key',
              transports: ['internal', 'ble', 'nfc'],
            },
          ]
        : [],
      userVerification: 'preferred',
    });

    return options;
  }

  // Verify authentication response
  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    challenge: string,
    user: PasskeyUser
  ): Promise<{
    verified: boolean;
    counter: number;
  }> {
    if (!user.passkeyCredentialId || !user.passkeyPublicKey) {
      throw new Error('User has no passkey registered');
    }

    try {
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        authenticator: {
          credentialID: user.passkeyCredentialId,
          credentialPublicKey: Buffer.from(user.passkeyPublicKey, 'base64'),
          counter: user.passkeyCounter || 0,
        },
      });

      if (!verification.verified) {
        throw new Error('Authentication verification failed');
      }

      return {
        verified: true,
        counter: verification.authenticationInfo.newCounter,
      };
    } catch (error) {
      console.error('Authentication verification error:', error);
      return {
        verified: false,
        counter: 0,
      };
    }
  }

  // Convert credential ID to base64 for storage
  credentialIdToBase64(credentialId: Uint8Array): string {
    return Buffer.from(credentialId).toString('base64');
  }

  // Convert base64 to credential ID
  base64ToCredentialId(base64: string): Uint8Array {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
}

export const webAuthnService = new WebAuthnService();