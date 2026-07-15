import { Test, TestingModule } from '@nestjs/testing';
import { FirmwareService } from './firmware.service';
import { S3Service } from './s3.service';
import { CryptoService } from './crypto.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

type MockFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination: string;
  filename: string;
  path: string;
};

describe('FirmwareService', () => {
  let service: FirmwareService;
  let s3Service: S3Service;
  let cryptoService: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirmwareService,
        {
          provide: S3Service,
          useValue: {
            uploadFirmware: jest.fn(),
            downloadFirmware: jest.fn(),
            getPresignedDownloadUrl: jest.fn(),
            deleteFirmware: jest.fn(),
            getS3Bucket: jest.fn(() => 'test-bucket'),
          },
        },
        {
          provide: CryptoService,
          useValue: {
            computeSha256: jest.fn((buffer) => 'test-sha256-hash'),
            signFirmware: jest.fn(() => ({ signature: 'test-signature', algorithm: 'RSA-2048' })),
            verifyFirmware: jest.fn(() => true),
            getPublicKeyId: jest.fn(() => 'test-key-id'),
          },
        },
      ],
    }).compile();

    service = module.get<FirmwareService>(FirmwareService);
    s3Service = module.get<S3Service>(S3Service);
    cryptoService = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFirmware', () => {
    it('should upload firmware with valid version', async () => {
      const file: MockFile = {
        fieldname: 'file',
        originalname: 'firmware.bin',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('test content'),
        destination: '',
        filename: '',
        path: '',
      };

      const result = await service.uploadFirmware(
        {
          modelId: 'model-123',
          version: '1.0.0',
          file,
        },
        'test-user',
      );

      expect(result).toBeDefined();
      expect(result.modelId).toBe('model-123');
      expect(result.version).toBe('1.0.0');
      expect(result.isApproved).toBe(false);
      expect(s3Service.uploadFirmware).toHaveBeenCalled();
    });

    it('should reject invalid semantic version', async () => {
      const file: MockFile = {
        fieldname: 'file',
        originalname: 'firmware.bin',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('test content'),
        destination: '',
        filename: '',
        path: '',
      };

      await expect(
        service.uploadFirmware(
          {
            modelId: 'model-123',
            version: '1.0', // Invalid - missing patch version
            file,
          },
          'test-user',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent duplicate versions for same model', async () => {
      const file: MockFile = {
        fieldname: 'file',
        originalname: 'firmware.bin',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('test content'),
        destination: '',
        filename: '',
        path: '',
      };

      await service.uploadFirmware(
        {
          modelId: 'model-123',
          version: '1.0.0',
          file,
        },
        'test-user',
      );

      await expect(
        service.uploadFirmware(
          {
            modelId: 'model-123',
            version: '1.0.0',
            file,
          },
          'test-user',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('approveFirmware', () => {
    it('should approve firmware', async () => {
      const file: MockFile = {
        fieldname: 'file',
        originalname: 'firmware.bin',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('test content'),
        destination: '',
        filename: '',
        path: '',
      };

      const uploaded = await service.uploadFirmware(
        {
          modelId: 'model-123',
          version: '1.0.0',
          file,
        },
        'test-user',
      );

      const approved = await service.approveFirmware(uploaded.id, 'approver-user');

      expect(approved.isApproved).toBe(true);
      expect(approved.approvedBy).toBe('approver-user');
      expect(approved.approvedAt).toBeDefined();
    });

    it('should throw NotFoundException for non-existent firmware', async () => {
      await expect(service.approveFirmware('non-existent-id', 'approver-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getLatestFirmware', () => {
    it('should return latest approved firmware by semantic version', async () => {
      const file: MockFile = {
        fieldname: 'file',
        originalname: 'firmware.bin',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('test content'),
        destination: '',
        filename: '',
        path: '',
      };

      const v1 = await service.uploadFirmware(
        {
          modelId: 'model-123',
          version: '1.0.0',
          file,
        },
        'test-user',
      );

      const v2 = await service.uploadFirmware(
        {
          modelId: 'model-123',
          version: '2.0.0',
          file,
        },
        'test-user',
      );

      await service.approveFirmware(v1.id, 'approver');
      await service.approveFirmware(v2.id, 'approver');

      const latest = await service.getLatestFirmware('model-123');

      expect(latest?.version).toBe('2.0.0');
    });

    it('should return null if no approved firmware exists', async () => {
      const latest = await service.getLatestFirmware('non-existent-model');
      expect(latest).toBeNull();
    });
  });

  describe('verifyFirmware', () => {
    it('should verify firmware integrity', async () => {
      const file: MockFile = {
        fieldname: 'file',
        originalname: 'firmware.bin',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('test content'),
        destination: '',
        filename: '',
        path: '',
      };

      (s3Service.downloadFirmware as jest.Mock).mockResolvedValue(Buffer.from('test content'));

      const uploaded = await service.uploadFirmware(
        {
          modelId: 'model-123',
          version: '1.0.0',
          file,
        },
        'test-user',
      );

      const isValid = await service.verifyFirmware(uploaded.id);

      expect(isValid).toBe(true);
      expect(s3Service.downloadFirmware).toHaveBeenCalled();
    });
  });
});
