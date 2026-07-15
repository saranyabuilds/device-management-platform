import { Injectable, Logger } from '@nestjs/common';
import { createHash, createSign, createVerify } from 'crypto';
import { readFileSync } from 'fs';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private privateKey: string;
  private publicKey: string;
  private publicKeyId: string;

  constructor() {
    this.privateKey = process.env.FIRMWARE_SIGNING_PRIVATE_KEY || this.generateTestPrivateKey();
    this.publicKey = process.env.FIRMWARE_SIGNING_PUBLIC_KEY || this.generateTestPublicKey();
    this.publicKeyId = process.env.FIRMWARE_SIGNING_PUBLIC_KEY_ID || 'prod-key-2026-06';
  }

  /**
   * Compute SHA-256 checksum of a buffer
   */
  computeSha256(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Sign firmware buffer with RSA-2048
   */
  signFirmware(buffer: Buffer): { signature: string; algorithm: string } {
    try {
      const sign = createSign('sha256');
      sign.update(buffer);
      const signature = sign.sign(this.privateKey, 'base64');
      return {
        signature,
        algorithm: 'RSA-2048',
      };
    } catch (error) {
      this.logger.error(`Failed to sign firmware: ${error}`);
      throw error;
    }
  }

  /**
   * Verify firmware signature
   */
  verifyFirmware(buffer: Buffer, signatureBase64: string): boolean {
    try {
      const verify = createVerify('sha256');
      verify.update(buffer);
      return verify.verify(this.publicKey, signatureBase64, 'base64');
    } catch (error) {
      this.logger.error(`Failed to verify firmware signature: ${error}`);
      return false;
    }
  }

  getPublicKeyId(): string {
    return this.publicKeyId;
  }

  private generateTestPrivateKey(): string {
    // In production, load from secure vault
    return process.env.FIRMWARE_SIGNING_PRIVATE_KEY || 'TEST_PRIVATE_KEY';
  }

  private generateTestPublicKey(): string {
    // In production, load from secure vault
    return process.env.FIRMWARE_SIGNING_PUBLIC_KEY || 'TEST_PUBLIC_KEY';
  }
}
