export interface FirmwareMetadata {
  id: string;
  modelId: string;
  version: string;
  releaseDate: Date;
  fileSizeBytes: number;
  contentType: string;
  sha256Checksum: string;
  signatureAlgorithm: 'RSA-2048';
  signatureBase64: string;
  publicKeyId: string;
  s3Key: string;
  s3Bucket: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface FirmwareUploadRequest {
  modelId: string;
  version: string;
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  releaseNotes?: string;
}

export interface FirmwareDownloadUrl {
  url: string;
  expiresIn: number; // seconds
  expiresAt: Date;
}

export interface AuditLogEntry {
  id: string;
  firmwareId: string;
  operation: 'UPLOAD' | 'APPROVE' | 'DOWNLOAD' | 'DELETE' | 'SIGN';
  actor: string;
  timestamp: Date;
  details: Record<string, unknown>;
  ipAddress?: string;
}

export class SemanticVersion {
  major: number;
  minor: number;
  patch: number;

  constructor(versionString: string) {
    const parts = versionString.split('.');
    if (parts.length !== 3) {
      throw new Error(`Invalid semantic version: ${versionString}`);
    }
    this.major = parseInt(parts[0], 10);
    this.minor = parseInt(parts[1], 10);
    this.patch = parseInt(parts[2], 10);

    if (isNaN(this.major) || isNaN(this.minor) || isNaN(this.patch)) {
      throw new Error(`Invalid semantic version: ${versionString}`);
    }
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  isGreaterThan(other: SemanticVersion): boolean {
    if (this.major !== other.major) return this.major > other.major;
    if (this.minor !== other.minor) return this.minor > other.minor;
    return this.patch > other.patch;
  }

  equals(other: SemanticVersion): boolean {
    return this.major === other.major && this.minor === other.minor && this.patch === other.patch;
  }
}
