import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly presignedUrlExpirationSeconds: number;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.FIRMWARE_S3_BUCKET || 'firmware-artifacts';
    this.presignedUrlExpirationSeconds = parseInt(process.env.PRESIGNED_URL_EXPIRATION_SECONDS || '3600', 10);

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
      forcePathStyle: !!process.env.S3_ENDPOINT,
    });
  }

  async uploadFirmware(key: string, buffer: Buffer, contentType: string): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      });
      await this.s3Client.send(command);
      this.logger.log(`Firmware uploaded successfully: s3://${this.bucket}/${key}`);
    } catch (error) {
      this.logger.error(`Failed to upload firmware: ${error}`);
      throw error;
    }
  }

  async downloadFirmware(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      const chunks: Buffer[] = [];

      if (response.Body instanceof Readable) {
        return new Promise((resolve, reject) => {
          response.Body.on('data', (chunk) => chunks.push(chunk));
          response.Body.on('end', () => resolve(Buffer.concat(chunks)));
          response.Body.on('error', reject);
        });
      }
      throw new Error('Unexpected S3 response format');
    } catch (error) {
      this.logger.error(`Failed to download firmware: ${error}`);
      throw error;
    }
  }

  async getPresignedDownloadUrl(key: string): Promise<{ url: string; expiresAt: Date }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.presignedUrlExpirationSeconds,
      });
      const expiresAt = new Date(Date.now() + this.presignedUrlExpirationSeconds * 1000);
      return { url, expiresAt };
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error}`);
      throw error;
    }
  }

  async deleteFirmware(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
      this.logger.log(`Firmware deleted successfully: s3://${this.bucket}/${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete firmware: ${error}`);
      throw error;
    }
  }

  getS3Bucket(): string {
    return this.bucket;
  }
}
