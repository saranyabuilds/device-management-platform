# Local Containers

The local Compose stack starts shared infrastructure for development:

- PostgreSQL
- Redis
- Kafka in single-node KRaft mode
- Eclipse Mosquitto MQTT broker
- Loki log store
- Promtail log shipper
- Prometheus metrics store
- Jaeger trace store and UI
- Grafana with a preconfigured Loki datasource

Application containers for `device-api` and `admin-portal` are available behind
the optional `apps` profile. The default `docker compose up -d` starts only
infrastructure.

## Prerequisites

- Docker Desktop or Docker Engine with Docker Compose v2.
- Node.js 22 and pnpm for repository validation commands.

## First Run

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

Start infrastructure plus application containers:

```bash
docker compose --profile apps up -d --build
```

## Stop And Reset

Stop containers and keep data:

```bash
docker compose down
```

Remove containers and local data volumes:

```bash
docker compose down -v
```

## Service Ports

| Service              | Container DNS       | Local URL                                     |
| -------------------- | ------------------- | --------------------------------------------- |
| PostgreSQL           | `postgres:5432`     | `localhost:${POSTGRES_PORT:-5432}`            |
| Redis                | `redis:6379`        | `localhost:${REDIS_PORT:-6379}`               |
| Kafka internal       | `kafka:9092`        | internal Compose network only                 |
| Kafka external       | n/a                 | `localhost:${KAFKA_PORT:-9094}`               |
| MQTT                 | `mqtt:1883`         | `localhost:${MQTT_PORT:-1883}`                |
| MQTT WebSocket       | `mqtt:9001`         | `localhost:${MQTT_WEBSOCKET_PORT:-9001}`      |
| Loki                 | `loki:3100`         | `http://localhost:${LOKI_PORT:-3100}`         |
| Prometheus           | `prometheus:9090`   | `http://localhost:${PROMETHEUS_PORT:-9090}`   |
| Jaeger UI            | `jaeger:16686`      | `http://localhost:${JAEGER_UI_PORT:-16686}`   |
| OTLP gRPC            | `jaeger:4317`       | `localhost:${OTEL_GRPC_PORT:-4317}`           |
| OTLP HTTP            | `jaeger:4318`       | `http://localhost:${OTEL_HTTP_PORT:-4318}`    |
| Kafka exporter       | `kafka-exporter:9308` | `http://localhost:${KAFKA_EXPORTER_PORT:-9308}` |
| MQTT exporter        | `mqtt-exporter:9234` | `http://localhost:${MQTT_EXPORTER_PORT:-9234}` |
| Grafana              | `grafana:3000`      | `http://localhost:${GRAFANA_PORT:-3000}`      |
| Device API profile   | `device-api:8080`   | `http://localhost:${DEVICE_API_PORT:-8080}`   |
| Admin Portal profile | `admin-portal:8080` | `http://localhost:${ADMIN_PORTAL_PORT:-4200}` |

## Connection Strings

Use these values from services running inside Compose:

```text
POSTGRES_URL=jdbc:postgresql://postgres:5432/device_management
POSTGRES_USER=dmp_user
POSTGRES_PASSWORD=dmp_password
REDIS_URL=redis://redis:6379
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
MQTT_BROKER_URL=tcp://mqtt:1883
```

Use these values from tools running on the host:

```text
POSTGRES_URL=jdbc:postgresql://localhost:5432/device_management
REDIS_URL=redis://localhost:6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9094
MQTT_BROKER_URL=tcp://localhost:1883
```

The current Spring Boot `device-api` does not yet require these infrastructure
services at runtime; the variables are provided as stable local defaults for
future integration work.

## Centralized Logs

The local stack includes Loki, Promtail, and Grafana by default:

```bash
docker compose up -d loki promtail grafana
docker compose --profile apps up -d --build device-api
```

Open Grafana at `http://localhost:3000`. Anonymous admin access is enabled for
local development only, and the `Loki` datasource is provisioned automatically.

Useful LogQL examples:

```logql
{service="device-api"}
{service="device-api", level="ERROR"}
{service="device-api"} | json | correlationId="paste-correlation-id"
{service="device-api"} | json | path="/api/v1/devices"
```

The `device-api` emits JSON logs to stdout. Each request includes an
`X-Correlation-ID` response header; provide the same header on inbound requests
to preserve an existing trace across clients and services.

Local Loki retention is configured for 7 days in
`infra/observability/loki/loki-config.yml`. Production retention should be set
from the environment's storage, compliance, and incident response requirements.

## Service Metrics

The local stack includes Prometheus, Kafka exporter, MQTT exporter, and Grafana
dashboard provisioning:

```bash
docker compose up -d prometheus kafka-exporter mqtt-exporter grafana
docker compose --profile apps up -d --build device-api
```

Prometheus is available at `http://localhost:9090`. Grafana is available at
`http://localhost:3000` with `Prometheus` and `Loki` datasources provisioned.
The `Device API Service Health` dashboard is loaded from
`infra/observability/grafana/dashboards/device-api-service-health.json`.

Useful PromQL examples:

```promql
sum(jvm_memory_used_bytes{application="device-api", area="heap"})
sum(rate(http_server_requests_seconds_count{application="device-api"}[5m])) by (method, uri)
histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{application="device-api"}[5m])) by (le, uri))
sum(rate(http_server_requests_seconds_count{application="device-api", status=~"5.."}[5m]))
up{job="kafka"}
up{job="mqtt"}
```

Prometheus local retention is controlled by `PROMETHEUS_RETENTION` and defaults
to 15 days. Kafka metrics are collected with `danielqsj/kafka-exporter` against
the local Kafka broker. MQTT metrics are collected with `sapcc/mosquitto-exporter`
against the local Mosquitto broker.

## Distributed Tracing

The local stack includes Jaeger with OTLP gRPC and HTTP collectors enabled:

```bash
docker compose up -d jaeger grafana
docker compose --profile apps up -d --build device-api
```

Jaeger is available at `http://localhost:16686`. Grafana also has a `Jaeger`
datasource provisioned. The `device-api` exports traces to
`http://jaeger:4318/v1/traces` from inside Compose.

Tracing configuration is environment-driven:

```text
TRACING_ENABLED=true
TRACING_SAMPLING_PROBABILITY=1.0
OTEL_SERVICE_NAME=device-api
OTEL_TRACES_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://jaeger:4318/v1/traces
OTEL_PROPAGATORS=tracecontext,baggage
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=local
```

Send a request with an existing W3C trace context:

```bash
curl -i http://localhost:8080/actuator/health \
  -H 'traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' \
  -H 'X-Correlation-ID: local-trace-demo'
```

In Jaeger, select the `device-api` service and search recent traces. Use the
trace ID from the `traceparent` header, `4bf92f3577b34da6a3ce929d0e0e4736`, to
confirm propagation. JSON logs include correlation fields and, when tracing is
active for the request, MDC trace fields such as `traceId` and `spanId`.

## Smoke Checks

```bash
docker compose ps
docker compose exec postgres pg_isready -U dmp_user -d device_management
docker compose exec redis redis-cli ping
docker compose exec kafka kafka-topics.sh --bootstrap-server kafka:9092 --list
docker compose exec mqtt mosquitto_pub -h localhost -p 1883 -t dmp/smoke -m ok
curl http://localhost:3100/ready
curl http://localhost:9090/-/ready
curl http://localhost:16686/
```

If the `apps` profile is running:

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/prometheus
curl http://localhost:4200/healthz
```

## Troubleshooting

- If a port is already in use, change it in `.env`.
- If Kafka does not become healthy after changing cluster settings, run
  `docker compose down -v` to reset its local volume.
- If Docker Compose reports missing variables, refresh `.env` from
  `.env.example`.
- `.env` is intentionally ignored by Git; keep local overrides there.
