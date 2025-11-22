import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import _sodium from 'libsodium-wrappers';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface DoubleRatchetState {
  rootKey: string;
  senderChainKey: string;
  receiverChainKey: string;
  senderRatchetKey: KeyPair;
  receiverRatchetKey: KeyPair;
  messageNumber: number;
}

export interface EncryptedMessage {
  encryptedContent: string;
  messageKey: string;
  previousChainKey: string;
  messageNumber: number;
}

class CryptoUtils {
  private sodium: any;

  async init(): Promise<void> {
    await _sodium.ready;
    this.sodium = _sodium;
  }

  // Generate a new key pair for X25519 Diffie-Hellman
  generateKeyPair(): KeyPair {
    const keyPair = nacl.box.keyPair();
    return {
      publicKey: naclUtil.encodeBase64(keyPair.publicKey),
      privateKey: naclUtil.encodeBase64(keyPair.secretKey),
    };
  }

  // Perform Diffie-Hellman key exchange
  diffieHellman(privateKey: string, publicKey: string): string {
    const privKey = naclUtil.decodeBase64(privateKey);
    const pubKey = naclUtil.decodeBase64(publicKey);
    const sharedSecret = nacl.scalarMult(privKey, pubKey);
    return naclUtil.encodeBase64(sharedSecret);
  }

  // Derive a root key from shared secret using HKDF
  async deriveRootKey(sharedSecret: string, salt?: string): Promise<string> {
    if (!this.sodium) await this.init();
    
    const key = this.sodium.from_base64(sharedSecret);
    const saltBuffer = salt ? this.sodium.from_base64(salt) : this.sodium.randombytes_buf(32);
    const rootKey = this.sodium.crypto_kdf_derive_from_key(32, 1, 'root', saltBuffer, key);
    return this.sodium.to_base64(rootKey);
  }

  // Derive chain keys using KDF
  async deriveChainKeys(chainKey: string): Promise<{ currentKey: string; nextKey: string }> {
    if (!this.sodium) await this.init();
    
    const key = this.sodium.from_base64(chainKey);
    const output = this.sodium.crypto_kdf_derive_from_key(64, 1, 'chain', this.sodium.randombytes_buf(16), key);
    
    return {
      currentKey: this.sodium.to_base64(output.slice(0, 32)),
      nextKey: this.sodium.to_base64(output.slice(32, 64)),
    };
  }

  // Encrypt message with AES-256-GCM
  encryptMessage(message: string, key: string): { ciphertext: string; nonce: string } {
    const keyBuffer = naclUtil.decodeBase64(key);
    const nonce = nacl.randomBytes(24);
    const messageBuffer = naclUtil.decodeUTF8(message);
    const ciphertext = nacl.secretbox(messageBuffer, nonce, keyBuffer);
    
    return {
      ciphertext: naclUtil.encodeBase64(ciphertext),
      nonce: naclUtil.encodeBase64(nonce),
    };
  }

  // Decrypt message with AES-256-GCM
  decryptMessage(ciphertext: string, nonce: string, key: string): string {
    const keyBuffer = naclUtil.decodeBase64(key);
    const nonceBuffer = naclUtil.decodeBase64(nonce);
    const ciphertextBuffer = naclUtil.decodeBase64(ciphertext);
    const decryptedMessage = nacl.secretbox.open(ciphertextBuffer, nonceBuffer, keyBuffer);
    
    if (!decryptedMessage) {
      throw new Error('Failed to decrypt message');
    }
    
    return naclUtil.encodeUTF8(decryptedMessage);
  }

  // Initialize Double Ratchet
  async initializeDoubleRatchet(sharedSecret: string): Promise<DoubleRatchetState> {
    const rootKey = await this.deriveRootKey(sharedSecret);
    const senderRatchetKey = this.generateKeyPair();
    const initialChainKey = naclUtil.encodeBase64(nacl.randomBytes(32));
    
    return {
      rootKey,
      senderChainKey: initialChainKey,
      receiverChainKey: initialChainKey,
      senderRatchetKey,
      receiverRatchetKey: senderRatchetKey,
      messageNumber: 0,
    };
  }

  // Encrypt message with Double Ratchet
  async encryptDoubleRatchet(state: DoubleRatchetState, message: string): Promise<{
    encryptedMessage: EncryptedMessage;
    newState: DoubleRatchetState;
  }> {
    // Derive message key from chain key
    const { currentKey: messageKey, nextKey: nextChainKey } = await this.deriveChainKeys(state.senderChainKey);
    
    // Encrypt the message
    const { ciphertext, nonce } = this.encryptMessage(message, messageKey);
    
    // Create encrypted message object
    const encryptedMessage: EncryptedMessage = {
      encryptedContent: ciphertext,
      messageKey: naclUtil.encodeBase64(nonce) + ':' + messageKey,
      previousChainKey: state.senderChainKey,
      messageNumber: state.messageNumber,
    };
    
    // Update state
    const newState: DoubleRatchetState = {
      ...state,
      senderChainKey: nextChainKey,
      messageNumber: state.messageNumber + 1,
    };
    
    return { encryptedMessage, newState };
  }

  // Decrypt message with Double Ratchet
  async decryptDoubleRatchet(state: DoubleRatchetState, encryptedMessage: EncryptedMessage): Promise<{
    decryptedMessage: string;
    newState: DoubleRatchetState;
  }> {
    // Extract nonce and message key
    const [nonce, messageKey] = encryptedMessage.messageKey.split(':');
    
    // Decrypt the message
    const decryptedMessage = this.decryptMessage(encryptedMessage.encryptedContent, nonce, messageKey);
    
    // Update receiver chain key if needed
    const { nextKey: nextChainKey } = await this.deriveChainKeys(state.receiverChainKey);
    
    const newState: DoubleRatchetState = {
      ...state,
      receiverChainKey: nextChainKey,
    };
    
    return { decryptedMessage, newState };
  }

  // Perform ratchet step (when receiving new ratchet key)
  async ratchetStep(state: DoubleRatchetState, newRatchetPublicKey: string): Promise<DoubleRatchetState> {
    // Perform DH with new ratchet key
    const newSharedSecret = this.diffieHellman(state.senderRatchetKey.privateKey, newRatchetPublicKey);
    
    // Derive new root key
    const newRootKey = await this.deriveRootKey(newSharedSecret, state.rootKey);
    
    // Generate new sender ratchet key
    const newSenderRatchetKey = this.generateKeyPair();
    
    // Derive new chain keys
    const newChainKey = naclUtil.encodeBase64(nacl.randomBytes(32));
    
    return {
      ...state,
      rootKey: newRootKey,
      senderChainKey: newChainKey,
      receiverChainKey: newChainKey,
      senderRatchetKey: newSenderRatchetKey,
      receiverRatchetKey: { publicKey: newRatchetPublicKey, privateKey: '' },
      messageNumber: 0,
    };
  }

  // Generate random base64 string
  generateRandomBase64(length: number = 32): string {
    return naclUtil.encodeBase64(nacl.randomBytes(length));
  }

  // Verify message integrity using HMAC
  async verifyHMAC(message: string, key: string, signature: string): Promise<boolean> {
    if (!this.sodium) await this.init();
    
    const messageBuffer = this.sodium.from_string(message);
    const keyBuffer = this.sodium.from_base64(key);
    const signatureBuffer = this.sodium.from_base64(signature);
    
    try {
      const computedSignature = this.sodium.crypto_auth_hmacsha256(messageBuffer, keyBuffer);
      return this.sodium.memcmp(computedSignature, signatureBuffer);
    } catch {
      return false;
    }
  }

  // Sign message with HMAC
  async signHMAC(message: string, key: string): Promise<string> {
    if (!this.sodium) await this.init();
    
    const messageBuffer = this.sodium.from_string(message);
    const keyBuffer = this.sodium.from_base64(key);
    const signature = this.sodium.crypto_auth_hmacsha256(messageBuffer, keyBuffer);
    
    return this.sodium.to_base64(signature);
  }
}

export const cryptoUtils = new CryptoUtils();