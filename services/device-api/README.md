# Device API

Device API is the first Spring Boot microservice template for the Device Management Platform. It provides a reusable backend structure for REST controllers, DTO validation, service-layer business logic, centralized exception handling, structured logging, OpenAPI documentation, actuator health endpoints, tests, and Docker packaging.

## Tech Stack

- Java 17 target, compatible with Java 21 runtime images
- Spring Boot 3.x
- Maven
- Spring Web
- Spring Validation
- Spring Security
- Spring OAuth2 Resource Server / OAuth2 Client
- Spring Boot Actuator
- Springdoc OpenAPI / Swagger UI
- Lombok
- Docker

## Run Locally

```bash
./mvnw spring-boot:run
```

The service starts on port `8080`. Java 17 or newer is required locally.

## Build

```bash
./mvnw clean package
```

## Test

```bash
./mvnw test
```

## API Endpoints

- `POST /api/v1/auth/login` - Authenticate with email/password and receive a JWT access token plus refresh token.
- `POST /api/v1/auth/refresh` - Rotate a refresh token and receive a new token pair.
- `POST /api/v1/auth/logout` - Revoke a refresh token.
- `POST /api/v1/auth/password-policy/validate` - Validate a password against the configured policy.
- `GET /api/v1/auth/me` - Return the current authenticated user's JWT claims.
- `GET /api/v1/roles` - List role definitions and their permissions.
- `POST /api/v1/roles` - Create a custom role. Requires `ROLE_MANAGE`.
- `PUT /api/v1/roles/{roleId}` - Update or deactivate a custom role. Requires `ROLE_MANAGE`.
- `GET /api/v1/permissions` - List available permissions. Requires `ROLE_MANAGE`.
- `GET /api/v1/users` - List users with role assignments and effective permissions.
- `PUT /api/v1/users/{userId}/roles` - Replace a user's assigned roles. Requires `ROLE_MANAGE`.
- `POST /api/v1/devices` - Register a manufactured device and issue local certificate metadata.
- `GET /api/v1/devices/{serialNumber}` - Get a device by serial number.
- `GET /api/v1/devices` - Search, filter, and paginate device inventory. Requires `DEVICE_READ`.
- `GET /api/v1/devices/export` - Export filtered device inventory as CSV. Requires `DEVICE_READ`.
- `GET /api/v1/devices/{serialNumber}/profile` - Get detailed diagnostic profile data. Requires `DEVICE_READ`.
- `POST /api/v1/devices/{serialNumber}/heartbeat` - Ingest a heartbeat and update online/offline state. Requires `DEVICE_WRITE`.

Protected endpoints require an `Authorization: Bearer <accessToken>` header. Device endpoints
check explicit permissions: `DEVICE_READ` for reads and `DEVICE_WRITE` for creates.

Example request:

```json
{
  "serialNumber": "SN123456",
  "deviceModel": "Gateway-1000",
  "firmwareVersion": "1.0.0",
  "customerId": "customer-001",
  "location": "Building A"
}
```

Device registration normalizes serial numbers by trimming whitespace and converting
to uppercase. Serial numbers must be globally unique in the current service store.
Duplicate registrations return `409 DUPLICATE_DEVICE`. Local defaults allow
uppercase letters, digits, and hyphens, with length 6-64.

Successful registration returns onboarding and certificate metadata:

```json
{
  "id": "generated-device-id",
  "serialNumber": "SN123456",
  "status": "ACTIVE",
  "registrationStatus": "REGISTERED",
  "onboardingStatus": "PENDING_ACTIVATION",
  "certificate": {
    "certificateId": "devcert-generated-id",
    "issuerId": "urn:device-management:local-ca",
    "issuerName": "Device Management Local CA",
    "subject": "CN=SN123456, OU=Devices, O=Device Management Platform",
    "fingerprintSha256": "sha256-fingerprint",
    "status": "ISSUED"
  }
}
```

The local certificate generator returns metadata only. It does not log or return
private keys or device secrets. Replace the local generator with production PKI,
KMS, HSM, or CA integration when adding persistent device identity management.

Device inventory supports query parameters:

- `serialNumber` - case-insensitive partial serial number search after normalization.
- `firmwareVersion` - exact firmware version filter.
- `status` - exact device status filter.
- `page` - zero-based page number. Defaults to `0`.
- `size` - page size. Defaults to `20` and is capped at `100`.

Example inventory request:

```bash
curl 'http://localhost:8080/api/v1/devices?serialNumber=SN123&firmwareVersion=1.0.0&status=ACTIVE&page=0&size=20' \
  -H 'Authorization: Bearer <accessToken>'
```

Example inventory response:

```json
{
  "items": [
    {
      "id": "generated-device-id",
      "serialNumber": "SN123456",
      "deviceModel": "Gateway-1000",
      "firmwareVersion": "1.0.0",
      "customerId": "customer-001",
      "status": "ACTIVE",
      "onboardingStatus": "PENDING_ACTIVATION",
      "certificate": {
        "certificateId": "devcert-generated-id",
        "status": "ISSUED"
      },
      "createdAt": "2026-06-19T12:00:00",
      "updatedAt": "2026-06-19T12:00:00"
    }
  ],
  "page": 0,
  "size": 20,
  "totalItems": 1,
  "totalPages": 1
}
```

Example CSV export:

```bash
curl -OJ 'http://localhost:8080/api/v1/devices/export?serialNumber=SN123&status=ACTIVE' \
  -H 'Authorization: Bearer <accessToken>'
```

CSV export includes inventory-safe metadata such as device ID, serial number,
model, firmware version, customer ID, status, onboarding status, connectivity
status, last-seen timestamp, certificate ID, and timestamps. It does not include
private keys, tokens, secrets, or sensitive certificate material.

Heartbeat ingestion updates `lastSeenAt` and `connectivityStatus` for registered
devices. Heartbeat timestamps are parsed as instants and stored as UTC local
timestamps. Older out-of-order heartbeats are accepted by the API but ignored for
state progression, so `lastSeenAt` never moves backward.

Example heartbeat request:

```bash
curl -X POST 'http://localhost:8080/api/v1/devices/SN123456/heartbeat' \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"timestamp":"2026-06-19T12:05:00Z","firmwareVersion":"1.0.1","status":"ACTIVE"}'
```

Example heartbeat response:

```json
{
  "serialNumber": "SN123456",
  "lastSeenAt": "2026-06-19T12:05:00",
  "connectivityStatus": "ONLINE",
  "accepted": true
}
```

MQTT heartbeat publishing is configured with `DEVICE_HEARTBEAT_TOPIC`; the local
default is `devices/{serialNumber}/heartbeat`. The expected MQTT payload matches
the HTTP heartbeat body:

```json
{
  "timestamp": "2026-06-19T12:05:00Z",
  "firmwareVersion": "1.0.1",
  "status": "ACTIVE"
}
```

The current service contains the reusable heartbeat ingestion/state engine. Add
an MQTT consumer that subscribes to the configured topic and calls the same
service method when production MQTT ingestion is wired into `device-api`.
Devices transition from `ONLINE` to `OFFLINE` after `DEVICE_HEARTBEAT_TIMEOUT`
when the scheduler is enabled.

Device profile returns diagnostic details for support workflows:

```bash
curl 'http://localhost:8080/api/v1/devices/SN123456/profile' \
  -H 'Authorization: Bearer <accessToken>'
```

Example profile response:

```json
{
  "device": {
    "id": "generated-device-id",
    "serialNumber": "SN123456",
    "deviceModel": "Gateway-1000",
    "firmwareVersion": "1.0.0",
    "customerId": "customer-001",
    "status": "ACTIVE",
    "registrationStatus": "REGISTERED",
    "onboardingStatus": "PENDING_ACTIVATION",
    "certificateStatus": "ISSUED",
    "connectivityStatus": "ONLINE",
    "createdAt": "2026-06-19T12:00:00",
    "updatedAt": "2026-06-19T12:00:00"
  },
  "lastSeenAt": "2026-06-19T12:05:00",
  "healthIndicators": [
    {
      "name": "Connectivity",
      "state": "HEALTHY",
      "summary": "Last heartbeat received"
    }
  ],
  "firmwareHistory": [
    {
      "firmwareVersion": "1.0.0",
      "updatedAt": "2026-06-19T12:00:00",
      "updateSource": "REGISTRATION",
      "status": "SUCCESS",
      "failureReason": null
    }
  ],
  "eventTimeline": [
    {
      "timestamp": "2026-06-19T12:05:00",
      "eventType": "HEARTBEAT",
      "severity": "INFO",
      "source": "device-api",
      "message": "Device heartbeat observed",
      "correlationId": null,
      "traceId": null
    }
  ]
}
```

Health indicator states are `HEALTHY`, `WARNING`, `CRITICAL`, and `UNKNOWN`.
Device events are returned newest first and include severity values such as
`INFO`, `WARNING`, and `ERROR` as telemetry integrations are added. The current
local implementation derives profile data from the in-memory device store and
sample lifecycle events; replace it with persisted telemetry, firmware rollout,
and event data when those services are introduced.

## Swagger

- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

## Authentication Configuration

Local defaults are defined in `application.yml` and can be overridden with environment variables:

- `JWT_ISSUER`, `JWT_SECRET`, `JWT_ACCESS_TOKEN_TTL`, `JWT_CLOCK_SKEW`
- `REFRESH_TOKEN_TTL`
- `OAUTH2_CLIENT_ID`, `OAUTH2_CLIENT_SECRET`
- `OAUTH2_AUTHORIZATION_URI`, `OAUTH2_TOKEN_URI`, `OAUTH2_JWK_SET_URI`, `OAUTH2_USER_INFO_URI`
- `PASSWORD_MIN_LENGTH`, `PASSWORD_REQUIRE_UPPERCASE`, `PASSWORD_REQUIRE_LOWERCASE`, `PASSWORD_REQUIRE_DIGIT`, `PASSWORD_REQUIRE_SPECIAL`
- `DEVICE_SERIAL_MIN_LENGTH`, `DEVICE_SERIAL_MAX_LENGTH`, `DEVICE_SERIAL_ALLOWED_PATTERN`
- `DEVICE_CERTIFICATE_ISSUER_NAME`, `DEVICE_CERTIFICATE_ISSUER_ID`, `DEVICE_CERTIFICATE_VALIDITY`
- `DEVICE_HEARTBEAT_TOPIC`, `DEVICE_HEARTBEAT_TIMEOUT`, `DEVICE_HEARTBEAT_SCHEDULER_ENABLED`
- `ADMIN_USER_EMAIL`, `ADMIN_USER_PASSWORD`, `OPERATOR_USER_EMAIL`, `OPERATOR_USER_PASSWORD`, `VIEWER_USER_EMAIL`, `VIEWER_USER_PASSWORD`

`JWT_SECRET` must be at least 32 bytes and should be provided from a secret manager in shared
or production environments. Refresh tokens are rotated on use and stored as SHA-256 hashes in the
current in-memory store; replace that store with persistent storage when adding user persistence.
Default local roles are `SUPER_ADMIN`, `ADMIN`, `OPERATOR`, and `VIEWER`. Roles group explicit
permissions including `DEVICE_READ`, `DEVICE_WRITE`, `USER_READ`, `USER_WRITE`, `ROLE_MANAGE`,
and `AUDIT_READ`.

Example login:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"ChangeMe123!"}'
```

## Actuator

- Health: `http://localhost:8080/actuator/health`
- Info: `http://localhost:8080/actuator/info`
- Metrics: `http://localhost:8080/actuator/metrics`
- Prometheus: `http://localhost:8080/actuator/prometheus`
- Liveness: `http://localhost:8080/actuator/health/liveness`
- Readiness: `http://localhost:8080/actuator/health/readiness`

## Structured Logs And Correlation IDs

The service emits JSON logs to stdout. Every inbound request gets an
`X-Correlation-ID` value; provided IDs are preserved, missing IDs are generated,
and the value is returned in the response header. Application logs include the
correlation ID through MDC, and request completion logs include method, path,
status, and duration fields.

Example:

```bash
curl http://localhost:8080/actuator/health -H 'X-Correlation-ID: local-debug-001' -i
```

Use the returned correlation ID in Grafana Loki:

```logql
{service="device-api"} | json | correlationId="local-debug-001"
```

## Metrics

`device-api` exposes Micrometer metrics through Actuator Prometheus. Metrics are
tagged with `application="device-api"` and include JVM, process, system, and
HTTP server request metrics.

Useful PromQL examples:

```promql
sum(jvm_memory_used_bytes{application="device-api", area="heap"})
sum(rate(http_server_requests_seconds_count{application="device-api"}[5m])) by (method, uri)
histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{application="device-api"}[5m])) by (le, uri))
sum(rate(http_server_requests_seconds_count{application="device-api", status=~"5.."}[5m]))
```

## Distributed Tracing

`device-api` uses Micrometer Tracing with the OpenTelemetry bridge. Inbound HTTP
requests create spans, W3C `traceparent` headers continue existing traces, and
trace context is exported through OTLP when an endpoint is configured.

Local Compose exports traces to Jaeger:

```bash
docker compose up -d jaeger
docker compose --profile apps up -d --build device-api
```

Open Jaeger at `http://localhost:16686` and search for the `device-api` service.

Relevant environment variables:

- `TRACING_ENABLED`
- `TRACING_SAMPLING_PROBABILITY`
- `OTEL_SERVICE_NAME`
- `OTEL_TRACES_EXPORTER`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
- `OTEL_PROPAGATORS`
- `OTEL_RESOURCE_ATTRIBUTES`

Example request with an existing trace:

```bash
curl -i http://localhost:8080/actuator/health \
  -H 'traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' \
  -H 'X-Correlation-ID: local-trace-demo'
```

## Docker

```bash
docker build -t device-api:1.0.0 .
docker run -p 8080:8080 device-api:1.0.0
```

## Reusing This Pattern

Future services such as `firmware-api`, `user-api`, `notification-service`, and `audit-service` should follow the same package layout under `services/`:

```text
com.devicemanagement.<service>
  controller/
  dto/
  exception/
  service/
  config/
```

Reuse the same backend framework standards:

- Keep REST endpoints in controllers and business rules in services.
- Use request/response DTOs rather than exposing persistence models.
- Validate inbound requests with Jakarta Bean Validation annotations.
- Centralize error handling with `@RestControllerAdvice`.
- Return a consistent `ErrorResponse` with timestamp, status, error, message, path, and optional field errors.
- Use Lombok `@Slf4j` for controller, service, and exception-handler logs.
- Configure service-specific OpenAPI metadata in `OpenApiConfig`.
- Expose actuator health, info, and metrics endpoints.
- Package each service with a multi-stage Dockerfile.

This service intentionally does not include persistence, Kafka, or Kubernetes yet. Those capabilities should be added as later platform features.
