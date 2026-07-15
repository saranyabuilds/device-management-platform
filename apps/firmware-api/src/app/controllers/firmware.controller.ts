import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirmwareService } from '../services/firmware.service';
import { FirmwareMetadata, FirmwareDownloadUrl } from '@device-management-platform/firmware-domain';
import { Request } from 'express';

@Controller('api/v1/firmware')
export class FirmwareController {
  private readonly logger = new Logger(FirmwareController.name);

  constructor(private firmwareService: FirmwareService) {}

  /**
   * POST /api/v1/firmware/upload
   * Upload a new firmware artifact
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }))
  @HttpCode(HttpStatus.CREATED)
  async uploadFirmware(
    @UploadedFile() file: Express.Multer.File,
    @Body('modelId') modelId: string,
    @Body('version') version: string,
    @Req() req: Request,
  ): Promise<FirmwareMetadata> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!modelId) {
      throw new BadRequestException('modelId is required');
    }
    if (!version) {
      throw new BadRequestException('version is required');
    }

    const actor = this.getActor(req);
    this.logger.log(`Firmware upload initiated: modelId=${modelId}, version=${version}, actor=${actor}`);

    return this.firmwareService.uploadFirmware(
      {
        modelId,
        version,
        file,
      },
      actor,
    );
  }

  /**
   * GET /api/v1/firmware/:id
   * Get firmware metadata by ID
   */
  @Get(':id')
  async getFirmware(@Param('id') firmwareId: string): Promise<FirmwareMetadata> {
    return this.firmwareService.getFirmware(firmwareId);
  }

  /**
   * GET /api/v1/firmware/model/:modelId/latest
   * Get latest approved firmware for a model
   */
  @Get('model/:modelId/latest')
  async getLatestFirmware(@Param('modelId') modelId: string): Promise<FirmwareMetadata | null> {
    return this.firmwareService.getLatestFirmware(modelId);
  }

  /**
   * GET /api/v1/firmware/model/:modelId/history
   * Get firmware history for a model
   */
  @Get('model/:modelId/history')
  async getFirmwareHistory(@Param('modelId') modelId: string): Promise<FirmwareMetadata[]> {
    return this.firmwareService.getFirmwareHistory(modelId);
  }

  /**
   * PATCH /api/v1/firmware/:id/approve
   * Approve firmware for release
   */
  @Patch(':id/approve')
  async approveFirmware(@Param('id') firmwareId: string, @Req() req: Request): Promise<FirmwareMetadata> {
    const actor = this.getActor(req);
    this.logger.log(`Firmware approval initiated: ${firmwareId}, actor=${actor}`);
    return this.firmwareService.approveFirmware(firmwareId, actor);
  }

  /**
   * GET /api/v1/firmware/:id/download-url
   * Generate presigned download URL for firmware
   */
  @Get(':id/download-url')
  async getDownloadUrl(@Param('id') firmwareId: string, @Req() req: Request): Promise<FirmwareDownloadUrl> {
    const actor = this.getActor(req);
    return this.firmwareService.getDownloadUrl(firmwareId, actor);
  }

  /**
   * GET /api/v1/firmware/:id/verify
   * Verify firmware integrity (checksum and signature)
   */
  @Get(':id/verify')
  async verifyFirmware(@Param('id') firmwareId: string): Promise<{ isValid: boolean }> {
    const isValid = await this.firmwareService.verifyFirmware(firmwareId);
    return { isValid };
  }

  /**
   * DELETE /api/v1/firmware/:id
   * Delete firmware
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFirmware(@Param('id') firmwareId: string, @Req() req: Request): Promise<void> {
    const actor = this.getActor(req);
    this.logger.log(`Firmware deletion initiated: ${firmwareId}, actor=${actor}`);
    return this.firmwareService.deleteFirmware(firmwareId, actor);
  }

  /**
   * GET /api/v1/firmware/:id/audit-logs
   * Get audit logs for firmware
   */
  @Get(':id/audit-logs')
  async getAuditLogs(@Param('id') firmwareId: string) {
    return this.firmwareService.getAuditLogs(firmwareId);
  }

  /**
   * Extract actor (user) from request
   */
  private getActor(req: Request): string {
    // In production, extract from JWT token
    return (req.user as any)?.username || 'system';
  }
}
