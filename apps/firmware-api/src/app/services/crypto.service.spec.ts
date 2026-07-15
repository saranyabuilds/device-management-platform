import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('computeSha256', () => {
    it('should compute SHA-256 hash', () => {
      const buffer = Buffer.from('test content');
      const hash = service.computeSha256(buffer);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes', () => {
      const buffer = Buffer.from('test content');
      const hash1 = service.computeSha256(buffer);
      const hash2 = service.computeSha256(buffer);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different content', () => {
      const buffer1 = Buffer.from('content 1');
      const buffer2 = Buffer.from('content 2');

      const hash1 = service.computeSha256(buffer1);
      const hash2 = service.computeSha256(buffer2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('signFirmware', () => {
    it('should sign firmware with RSA-2048', () => {
      const buffer = Buffer.from('test firmware content');
      const result = service.signFirmware(buffer);

      expect(result).toBeDefined();
      expect(result.signature).toBeDefined();
      expect(result.algorithm).toBe('RSA-2048');
    });
  });

  describe('getPublicKeyId', () => {
    it('should return public key ID', () => {
      const keyId = service.getPublicKeyId();
      expect(keyId).toBeDefined();
      expect(typeof keyId).toBe('string');
    });
  });
});
