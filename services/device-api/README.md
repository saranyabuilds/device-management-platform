# Device API

Device API is the first Spring Boot microservice template for the Device Management Platform. It provides a reusable backend structure for REST controllers, DTO validation, service-layer business logic, centralized exception handling, structured logging, OpenAPI documentation, actuator health endpoints, tests, and Docker packaging.

## Tech Stack

- Java 17 target, compatible with Java 21 runtime images
- Spring Boot 3.x
- Maven
- Spring Web
- Spring Validation
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

- `POST /api/v1/devices` - Create a device.
- `GET /api/v1/devices/{serialNumber}` - Get a device by serial number.
- `GET /api/v1/devices` - List in-memory devices.

Example request:

```json
{
  "serialNumber": "SN123",
  "deviceModel": "Gateway-1000",
  "firmwareVersion": "1.0.0",
  "customerId": "customer-001",
  "location": "Building A"
}
```

## Swagger

- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

## Actuator

- Health: `http://localhost:8080/actuator/health`
- Info: `http://localhost:8080/actuator/info`
- Metrics: `http://localhost:8080/actuator/metrics`
- Liveness: `http://localhost:8080/actuator/health/liveness`
- Readiness: `http://localhost:8080/actuator/health/readiness`

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

This service intentionally does not include persistence, Kafka, security, Kubernetes, or authentication yet. Those capabilities should be added as later platform features.
