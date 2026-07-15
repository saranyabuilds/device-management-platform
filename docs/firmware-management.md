# Firmware Management System

Enterprise-grade firmware artifact management with secure storage, versioning, checksums, and digital signatures.

## Features

- ✅ **Secure REST API** - Multipart firmware upload with authentication
- ✅ **S3 Integration** - Store firmware artifacts in S3-compatible storage (AWS S3, MinIO)
- ✅ **Firmware Metadata** - PostgreSQL persistence of version history and release information
- ✅ **Version Management** - Semantic versioning with duplicate prevention
- ✅ **Checksum Generation** - Automatic SHA-256 checksum computation
- ✅ **Firmware Signing** - RSA-2048 digital signatures for integrity verification
- ✅ **Presigned URLs** - Secure device downloads with time-bound access
- ✅ **Audit Logging** - Complete operation history for compliance

## Configuration

### Environment Variables

```bash
# AWS S3 / MinIO Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
FIRMWARE_S3_BUCKET=firmware-artifacts
S3_ENDPOINT=http://localhost:9000  # Optional: for MinIO or S3-compatible storage
PRESIGNED_URL_EXPIRATION_SECONDS=3600  # Default: 1 hour

# Firmware Signing Keys
FIRMWARE_SIGNING_PRIVATE_KEY=path/to/private-key.pem
FIRMWARE_SIGNING_PUBLIC_KEY=path/to/public-key.pem
FIRMWARE_SIGNING_PUBLIC_KEY_ID=prod-key-2026-06
```

### S3 Bucket Setup

```bash
# Create S3 bucket with versioning
aws s3api create-bucket \
  --bucket firmware-artifacts \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket firmware-artifacts \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket firmware-artifacts \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

## API Endpoints

### Upload Firmware

```http
POST /api/v1/firmware/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

modelId=device-model-x1
version=2.1.0
file=<binary-firmware-file>
```

**Response:**
```json
{
  "id": "fw-550e8400-e29b-41d4-a716-446655440000",
  "modelId": "device-model-x1",
  "version": "2.1.0",
  "releaseDate": "2026-06-22T10:30:00Z",
  "fileSizeBytes": 5242880,
  "contentType": "application/octet-stream",
  "sha256Checksum": "abcd1234...",
  "signatureAlgorithm": "RSA-2048",
  "signatureBase64": "MEUCIQDx...",
  "publicKeyId": "prod-key-2026-06",
  "s3Key": "device-model-x1/2.1.0/uuid-firmware.bin",
  "s3Bucket": "firmware-artifacts",
  "isApproved": false,
  "createdAt": "2026-06-22T10:30:00Z",
  "createdBy": "release-manager-1"
}
```

### Get Firmware Metadata

```http
GET /api/v1/firmware/{firmware-id}
Authorization: Bearer <token>
```

### Get Latest Firmware for Model

```http
GET /api/v1/firmware/model/{model-id}/latest
```

### Get Firmware History

```http
GET /api/v1/firmware/model/{model-id}/history
```

### Approve Firmware

```http
PATCH /api/v1/firmware/{firmware-id}/approve
Authorization: Bearer <token>
```

### Get Download URL

```http
GET /api/v1/firmware/{firmware-id}/download-url
Authorization: Bearer <token>
```

**Response:**
```json
{
  "url": "https://s3.amazonaws.com/firmware-artifacts/...",
  "expiresIn": 3600,
  "expiresAt": "2026-06-22T11:30:00Z"
}
```

### Verify Firmware Integrity

```http
GET /api/v1/firmware/{firmware-id}/verify
```

**Response:**
```json
{
  "isValid": true
}
```

### Delete Firmware

```http
DELETE /api/v1/firmware/{firmware-id}
Authorization: Bearer <token>
```

### Get Audit Logs

```http
GET /api/v1/firmware/{firmware-id}/audit-logs
Authorization: Bearer <token>
```

## Semantic Versioning

The firmware system enforces semantic versioning (MAJOR.MINOR.PATCH):

- **Valid:** `1.0.0`, `2.1.3`, `10.5.20`
- **Invalid:** `1.0`, `2`, `1.0.0-beta`, `v1.0.0`

Features:
- Prevents duplicate versions for the same model
- Automatically determines latest version by semantic comparison
- Supports version history and rollback capability

## Security Features

### Checksum Verification
- SHA-256 hashing of all firmware files
- Automatic verification before device download
- Detection of file corruption or tampering

### Digital Signatures
- RSA-2048 signing of firmware artifacts
- Public key ID tracking for key rotation
- Signature verification on integrity check

### Presigned URLs
- Time-bound download links (default: 1 hour)
- No long-lived credentials exposed to devices
- Automatic expiration and access revocation

### Audit Logging
Tracked operations:
- `UPLOAD` - Firmware artifact uploaded
- `APPROVE` - Firmware approved for release
- `DOWNLOAD` - Presigned URL generated
- `DELETE` - Firmware deleted
- `SIGN` - Firmware signed

## Usage Examples

### TypeScript Client

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    Authorization: `Bearer ${process.env.API_TOKEN}`,
  },
});

// Upload firmware
const formData = new FormData();
formData.append('file', firmwareBuffer);
formData.append('modelId', 'device-model-x1');
formData.append('version', '2.1.0');

const response = await client.post('/firmware/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

const firmwareId = response.data.id;

// Approve firmware
await client.patch(`/firmware/${firmwareId}/approve`);

// Get download URL
const downloadResponse = await client.get(`/firmware/${firmwareId}/download-url`);
const downloadUrl = downloadResponse.data.url;

// Verify integrity
const verifyResponse = await client.get(`/firmware/${firmwareId}/verify`);
console.log('Is valid:', verifyResponse.data.isValid);
```

## Database Schema (for future PostgreSQL integration)

```sql
CREATE TABLE firmware (
  id UUID PRIMARY KEY,
  model_id VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  release_date TIMESTAMP NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  content_type VARCHAR(100),
  sha256_checksum VARCHAR(64) NOT NULL,
  signature_algorithm VARCHAR(50),
  signature_base64 TEXT,
  public_key_id VARCHAR(255),
  s3_key VARCHAR(1024) NOT NULL,
  s3_bucket VARCHAR(255) NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  UNIQUE(model_id, version)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  firmware_id UUID NOT NULL REFERENCES firmware(id),
  operation VARCHAR(50) NOT NULL,
  actor VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  details JSONB,
  ip_address VARCHAR(50)
);

CREATE INDEX idx_firmware_model ON firmware(model_id);
CREATE INDEX idx_firmware_approved ON firmware(is_approved);
CREATE INDEX idx_audit_firmware ON audit_logs(firmware_id);
```

## Deployment

### Docker

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY dist/apps/firmware-api ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: firmware-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: firmware-api
  template:
    metadata:
      labels:
        app: firmware-api
    spec:
      containers:
      - name: firmware-api
        image: firmware-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: AWS_REGION
          value: us-east-1
        - name: FIRMWARE_S3_BUCKET
          valueFrom:
            configMapKeyRef:
              name: firmware-config
              key: s3-bucket
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: access-key
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: secret-key
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

## Monitoring

### Health Checks

```http
GET /health
```

### Metrics (Prometheus)

- `firmware_upload_duration_seconds` - Upload latency
- `firmware_s3_operations_total` - S3 operation count
- `firmware_validation_failures_total` - Validation failures
- `firmware_signatures_created_total` - Signatures created

## Development

```bash
# Install dependencies
pnpm install

# Start firmware-api service
pnpm start:firmware-api

# Run tests
pnpm test:firmware-api

# Build
pnpm build:firmware-api

# Run linting
pnpm lint:firmware-api
```
