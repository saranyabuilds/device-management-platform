import { Injectable, BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { FirmwareMetadata, FirmwareUploadRequest, FirmwareDownloadUrl, SemanticVersion, AuditLogEntry } from '@device-management-platform/firmware-domain';
import { S3Service } from './s3.service';
import { CryptoService } from './crypto.service';
import { v4 as uuidv4 } from 'uuid';

interface FirmwareRepository {
  [key: string]: FirmwareMetadata;
}

interface AuditRepository {
  [key: string]: AuditLogEntry;
}

/**
 * FirmwareService handles all firmware management operations:
 * - Upload and storage
 * - Version management
 * - Checksums and signing
 * - Audit logging
 */
@Injectable()
export class FirmwareService {
  private readonly logger = new Logger(FirmwareService.name);
  private firmwareRepository: FirmwareRepository = {};
  private auditRepository: AuditRepository = {};

  constructor(
    private s3Service: S3Service,
    private cryptoService: CryptoService,
  ) {}

  /**
   * Upload firmware with validation and signing
   */
  async uploadFirmware(request: FirmwareUploadRequest, actor: string): Promise<FirmwareMetadata> {
    // Validate semantic version
    let semVersion: SemanticVersion;
    try {
      semVersion = new SemanticVersion(request.version);
    } catch (error) {
      throw new BadRequestException(`Invalid firmware version format: ${request.version}`);
    }

    // Check for duplicate version for model
    const existingVersion = Object.values(this.firmwareRepository).find(
      (fw) => fw.modelId === request.modelId && fw.version === request.version,
    );
    if (existingVersion) {
      throw new ConflictException(`Firmware version ${request.version} already exists for model ${request.modelId}`);
    }

    const fileBuffer = request.file.buffer;

    // Compute SHA-256 checksum
    const sha256Checksum = this.cryptoService.computeSha256(fileBuffer);

    // Sign the firmware
    const { signature: signatureBase64 } = this.cryptoService.signFirmware(fileBuffer);

    // Generate S3 key with versioning
    const s3Key = `${request.modelId}/${request.version}/${uuidv4()}-${request.file.originalname}`;

    // Upload to S3
    await this.s3Service.uploadFirmware(s3Key, fileBuffer, request.file.mimetype);

    // Create firmware metadata
    const firmware: FirmwareMetadata = {
      id: uuidv4(),
      modelId: request.modelId,
      version: request.version,
      releaseDate: new Date(),
      fileSizeBytes: fileBuffer.length,
      contentType: request.file.mimetype,
      sha256Checksum,
      signatureAlgorithm: 'RSA-2048',
      signatureBase64,
      publicKeyId: this.cryptoService.getPublicKeyId(),
      s3Key,
      s3Bucket: this.s3Service.getS3Bucket(),
      isApproved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: actor,
    };

    // Store in repository
    this.firmwareRepository[firmware.id] = firmware;

    // Audit log
    await this.logAudit({
      firmwareId: firmware.id,
      operation: 'UPLOAD',
      actor,
      details: {
        modelId: request.modelId,
        version: request.version,
        fileSizeBytes: fileBuffer.length,
        sha256Checksum,
      },
    });

    this.logger.log(`Firmware uploaded: ${firmware.id} (${request.modelId} v${request.version})`);
    return firmware;
  }

  /**
   * Approve firmware for release
   */
  async approveFirmware(firmwareId: string, approver: string): Promise<FirmwareMetadata> {
    const firmware = this.firmwareRepository[firmwareId];
    if (!firmware) {
      throw new NotFoundException(`Firmware not found: ${firmwareId}`);
    }

    firmware.isApproved = true;
    firmware.approvedBy = approver;
    firmware.approvedAt = new Date();
    firmware.updatedAt = new Date();

    await this.logAudit({
      firmwareId,
      operation: 'APPROVE',
      actor: approver,
      details: { modelId: firmware.modelId, version: firmware.version },
    });

    this.logger.log(`Firmware approved: ${firmwareId}`);
    return firmware;
  }

  /**
   * Get firmware by ID
   */
  async getFirmware(firmwareId: string): Promise<FirmwareMetadata> {
    const firmware = this.firmwareRepository[firmwareId];
    if (!firmware) {
      throw new NotFoundException(`Firmware not found: ${firmwareId}`);
    }
    return firmware;
  }

  /**
   * Get latest approved firmware for a model
   */
  async getLatestFirmware(modelId: string): Promise<FirmwareMetadata | null> {
    const firmwares = Object.values(this.firmwareRepository).filter(
      (fw) => fw.modelId === modelId && fw.isApproved,
    );

    if (firmwares.length === 0) {
      return null;
    }

    // Sort by semantic version
    firmwares.sort((a, b) => {
      const versionA = new SemanticVersion(a.version);
      const versionB = new SemanticVersion(b.version);
      return versionB.isGreaterThan(versionA) ? 1 : -1;
    });

    return firmwares[0];
  }

  /**
   * Get firmware history for a model
   */
  async getFirmwareHistory(modelId: string): Promise<FirmwareMetadata[]> {
    const firmwares = Object.values(this.firmwareRepository)
      .filter((fw) => fw.modelId === modelId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return firmwares;
  }

  /**
   * Generate presigned download URL for firmware
   */
  async getDownloadUrl(firmwareId: string, actor: string): Promise<FirmwareDownloadUrl> {
    const firmware = await this.getFirmware(firmwareId);

    if (!firmware.isApproved) {
      throw new BadRequestException(`Firmware is not approved for download: ${firmwareId}`);
    }

    const { url, expiresAt } = await this.s3Service.getPresignedDownloadUrl(firmware.s3Key);

    // Audit log
    await this.logAudit({
      firmwareId,
      operation: 'DOWNLOAD',
      actor,
      details: { modelId: firmware.modelId, version: firmware.version },
    });

    return {
      url,
      expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      expiresAt,
    };
  }

  /**
   * Delete firmware
   */
  async deleteFirmware(firmwareId: string, actor: string): Promise<void> {
    const firmware = await this.getFirmware(firmwareId);

    // Delete from S3
    await this.s3Service.deleteFirmware(firmware.s3Key);

    // Delete from repository
    delete this.firmwareRepository[firmwareId];

    // Audit log
    await this.logAudit({
      firmwareId,
      operation: 'DELETE',
      actor,
      details: { modelId: firmware.modelId, version: firmware.version },
    });

    this.logger.log(`Firmware deleted: ${firmwareId}`);
  }

  /**
   * Verify firmware integrity
   */
  async verifyFirmware(firmwareId: string): Promise<boolean> {
    const firmware = await this.getFirmware(firmwareId);

    // Download firmware from S3
    const buffer = await this.s3Service.downloadFirmware(firmware.s3Key);

    // Verify checksum
    const computedChecksum = this.cryptoService.computeSha256(buffer);
    if (computedChecksum !== firmware.sha256Checksum) {
      this.logger.warn(`Checksum mismatch for firmware ${firmwareId}`);
      return false;
    }

    // Verify signature
    const isSignatureValid = this.cryptoService.verifyFirmware(buffer, firmware.signatureBase64);
    if (!isSignatureValid) {
      this.logger.warn(`Signature verification failed for firmware ${firmwareId}`);
      return false;
    }

    this.logger.log(`Firmware integrity verified: ${firmwareId}`);
    return true;
  }

  /**
   * Log audit entry
   */
  private async logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      ...entry,
    };
    this.auditRepository[auditEntry.id] = auditEntry;
  }

  /**
   * Get audit logs for firmware
   */
  async getAuditLogs(firmwareId: string): Promise<AuditLogEntry[]> {
    return Object.values(this.auditRepository)
      .filter((log) => log.firmwareId === firmwareId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
