import { Test, TestingModule } from '@nestjs/testing';
import { FirmwareController } from './firmware.controller';
import { FirmwareService } from '../services/firmware.service';
import { BadRequestException } from '@nestjs/common';

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

describe('FirmwareController', () => {
  let controller: FirmwareController;
  let service: FirmwareService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FirmwareController],
      providers: [
        {
          provide: FirmwareService,
          useValue: {
            uploadFirmware: jest.fn(),
            getFirmware: jest.fn(),
            getLatestFirmware: jest.fn(),
            getFirmwareHistory: jest.fn(),
            approveFirmware: jest.fn(),
            getDownloadUrl: jest.fn(),
            verifyFirmware: jest.fn(),
            deleteFirmware: jest.fn(),
            getAuditLogs: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FirmwareController>(FirmwareController);
    service = module.get<FirmwareService>(FirmwareService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFirmware', () => {
    it('should reject request without file', async () => {
      const mockRequest = { user: { username: 'test-user' } } as any;

      await expect(
        controller.uploadFirmware(undefined as any, 'model-123', '1.0.0', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject request without modelId', async () => {
      const file: MockFile = {
        fieldname: 'file',
        originalname: 'firmware.bin',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
      };

      const mockRequest = { user: { username: 'test-user' } } as any;

      await expect(
        controller.uploadFirmware(file, '', '1.0.0', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject request without version', async () => {
      const file: MockFile = {
        fieldname: 'file',
        originalname: 'firmware.bin',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
      };

      const mockRequest = { user: { username: 'test-user' } } as any;

      await expect(
        controller.uploadFirmware(file, 'model-123', '', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully upload firmware', async () => {
      const file: MockFile = {
        fieldname: 'file',
        originalname: 'firmware.bin',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
      };

      const mockRequest = { user: { username: 'test-user' } } as any;
      const mockFirmware = {
        id: 'fw-123',
        modelId: 'model-123',
        version: '1.0.0',
      };

      (service.uploadFirmware as jest.Mock).mockResolvedValue(mockFirmware);

      const result = await controller.uploadFirmware(file, 'model-123', '1.0.0', mockRequest);

      expect(result).toEqual(mockFirmware);
      expect(service.uploadFirmware).toHaveBeenCalled();
    });
  });

  describe('getFirmware', () => {
    it('should get firmware by ID', async () => {
      const mockFirmware = {
        id: 'fw-123',
        modelId: 'model-123',
        version: '1.0.0',
      };

      (service.getFirmware as jest.Mock).mockResolvedValue(mockFirmware);

      const result = await controller.getFirmware('fw-123');

      expect(result).toEqual(mockFirmware);
      expect(service.getFirmware).toHaveBeenCalledWith('fw-123');
    });
  });

  describe('approveFirmware', () => {
    it('should approve firmware', async () => {
      const mockRequest = { user: { username: 'approver-user' } } as any;
      const mockFirmware = {
        id: 'fw-123',
        modelId: 'model-123',
        version: '1.0.0',
        isApproved: true,
      };

      (service.approveFirmware as jest.Mock).mockResolvedValue(mockFirmware);

      const result = await controller.approveFirmware('fw-123', mockRequest);

      expect(result).toEqual(mockFirmware);
      expect(service.approveFirmware).toHaveBeenCalledWith('fw-123', 'approver-user');
    });
  });

  describe('deleteFirmware', () => {
    it('should delete firmware', async () => {
      const mockRequest = { user: { username: 'admin-user' } } as any;

      (service.deleteFirmware as jest.Mock).mockResolvedValue(undefined);

      await controller.deleteFirmware('fw-123', mockRequest);

      expect(service.deleteFirmware).toHaveBeenCalledWith('fw-123', 'admin-user');
    });
  });
});
