# Firmware API Initialization Script

## Prerequisites Setup

```bash
# 1. Generate RSA-2048 Key Pair (if not using dev defaults)
openssl genrsa -out private-key.pem 2048
openssl rsa -in private-key.pem -pubout -out public-key.pem

# 2. Export keys to environment
export FIRMWARE_SIGNING_PRIVATE_KEY="$(cat private-key.pem)"
export FIRMWARE_SIGNING_PUBLIC_KEY="$(cat public-key.pem)"
```

## Local Development Setup

```bash
# Start services with docker-compose
docker-compose -f docker-compose.firmware.yml up -d

# Wait for services to be healthy
docker-compose -f docker-compose.firmware.yml ps

# Create MinIO bucket and test access
mc alias set local http://localhost:9000 minioadmin minioadmin
mc ls local/firmware-artifacts

# Test database connection
psql -h localhost -U firmware -d firmware_db -c "SELECT version();"

# Test Redis connection
redis-cli -h localhost ping
```

## Initial Data Setup

```bash
# Apply database migrations
pnpm nx run firmware-api:db:migrate

# Seed initial data (optional)
pnpm nx run firmware-api:db:seed
```

## Testing the API

```bash
# Upload firmware
curl -X POST http://localhost:3000/api/v1/firmware/upload \
  -F "modelId=device-x1" \
  -F "version=1.0.0" \
  -F "file=@firmware.bin" \
  -H "Authorization: Bearer test-token"

# Get latest firmware
curl http://localhost:3000/api/v1/firmware/model/device-x1/latest

# Get download URL
curl -X GET http://localhost:3000/api/v1/firmware/{firmware-id}/download-url \
  -H "Authorization: Bearer test-token"
```

## Monitoring

```bash
# View API logs
docker logs -f firmware-api

# View MinIO access logs
docker logs -f firmware-minio

# Check database
docker exec firmware-postgres psql -U firmware -d firmware_db -c "\dt"

# Monitor Redis
docker exec firmware-redis redis-cli monitor
```

## Troubleshooting

### MinIO Connection Issues
```bash
# Check MinIO is running
docker exec firmware-minio mc admin info local

# Reset MinIO (caution: deletes data)
docker exec firmware-minio-init /bin/sh -c "mc rm -r --force local/firmware-artifacts"
```

### Database Connection Issues
```bash
# Check PostgreSQL is accepting connections
docker exec firmware-postgres pg_isready -U firmware

# View database logs
docker logs firmware-postgres

# Reset database
docker exec firmware-postgres dropdb -U firmware firmware_db
docker exec firmware-postgres createdb -U firmware firmware_db
```

### API Startup Issues
```bash
# Check environment variables
docker exec firmware-api env | grep FIRMWARE

# View detailed startup logs
docker logs --follow firmware-api

# Restart service
docker-compose -f docker-compose.firmware.yml restart firmware-api
```

## Production Deployment

### 1. Generate Real RSA Keys
```bash
openssl genrsa -out prod-private-key.pem 4096
openssl rsa -in prod-private-key.pem -pubout -out prod-public-key.pem
# Store keys in secure vault (AWS Secrets Manager, HashiCorp Vault)
```

### 2. Configure Environment
```bash
# Production .env file
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<prod-key>
AWS_SECRET_ACCESS_KEY=<prod-secret>
FIRMWARE_S3_BUCKET=firmware-artifacts-prod
PRESIGNED_URL_EXPIRATION_SECONDS=3600

DATABASE_URL=postgresql://user:password@db.example.com:5432/firmware
REDIS_URL=redis://cache.example.com:6379

# Load from secure vault
FIRMWARE_SIGNING_PRIVATE_KEY=<vault-reference>
FIRMWARE_SIGNING_PUBLIC_KEY=<vault-reference>
FIRMWARE_SIGNING_PUBLIC_KEY_ID=prod-key-2026-06
```

### 3. Deploy with Kubernetes
```bash
# Apply manifests
kubectl apply -f deploy/k8s/firmware-api/

# Check deployment
kubectl get deployments -l app=firmware-api
kubectl get pods -l app=firmware-api

# View logs
kubectl logs -f deployment/firmware-api -c firmware-api
```

## Scaling Considerations

### Horizontal Scaling
- Firmware API is stateless - scale with multiple replicas
- Use load balancer (nginx, HAProxy, cloud LB)
- Ensure all replicas have same signing keys

### Database Scaling
- PostgreSQL read replicas for queries
- Connection pooling (PgBouncer)
- Migration to managed service (RDS, CloudSQL)

### S3 Scaling
- S3 auto-scales transparently
- Enable CloudFront CDN for downloads
- Consider S3 Transfer Acceleration

### Caching
- Redis cache for firmware metadata
- Cache latest version per model
- Cache invalidation on approval

## Maintenance Tasks

### Regular Backups
```bash
# Backup database
pg_dump -h db.example.com -U firmware firmware_db > backup.sql

# Backup S3 firmware artifacts
aws s3 sync s3://firmware-artifacts s3://firmware-artifacts-backup
```

### Key Rotation
```bash
# Generate new RSA key pair
openssl genrsa -out new-prod-private-key.pem 4096
openssl rsa -in new-prod-private-key.pem -pubout -out new-prod-public-key.pem

# Update FIRMWARE_SIGNING_PUBLIC_KEY_ID
# Gradually migrate to new key:
# 1. Accept both old and new keys in verification
# 2. Sign new uploads with new key
# 3. Eventually deprecate old key
```

### Cleanup Old Firmware
```bash
# Archive firmware older than 1 year
aws s3 sync s3://firmware-artifacts s3://firmware-artifacts-archive \
  --exclude "*" \
  --include "*/*/2025-*"

# Delete local in-memory audit logs periodically
# Database should handle long-term retention
```
