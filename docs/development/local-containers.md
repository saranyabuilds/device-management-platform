# Local Containers

The local Compose stack starts shared infrastructure for development:

- PostgreSQL
- Redis
- Kafka in single-node KRaft mode
- Eclipse Mosquitto MQTT broker
- EMQX secure MQTT broker
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
| EMQX MQTT            | `emqx:1883`         | `localhost:${EMQX_MQTT_PORT:-1884}`           |
| EMQX MQTT TLS        | `emqx:8883`         | `localhost:${EMQX_MQTT_TLS_PORT:-8883}`       |
| EMQX WebSocket       | `emqx:8083`         | `localhost:${EMQX_WEBSOCKET_PORT:-8083}`      |
| EMQX Dashboard       | `emqx:18083`        | `http://localhost:${EMQX_DASHBOARD_PORT:-18083}` |
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
MQTT_SECURE_BROKER_URL=ssl://emqx:8883
```

Use these values from tools running on the host:

```text
POSTGRES_URL=jdbc:postgresql://localhost:5432/device_management
REDIS_URL=redis://localhost:6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9094
MQTT_BROKER_URL=tcp://localhost:1883
MQTT_SECURE_BROKER_URL=ssl://localhost:8883
```

The current Spring Boot `device-api` does not yet require these infrastructure
services at runtime; the variables are provided as stable local defaults for
future integration work.

## Secure MQTT With EMQX

Mosquitto remains available as the simple local broker on `mqtt:1883` for legacy
smoke checks. EMQX is the secure MQTT broker path and runs side-by-side on
separate host ports by default:

- plain MQTT: `localhost:${EMQX_MQTT_PORT:-1884}`
- MQTT over TLS: `localhost:${EMQX_MQTT_TLS_PORT:-8883}`
- WebSocket: `localhost:${EMQX_WEBSOCKET_PORT:-8083}`
- dashboard: `http://localhost:${EMQX_DASHBOARD_PORT:-18083}`

Generate local development TLS certificates before starting EMQX:

```bash
sh infra/emqx/certs/generate-dev-certs.sh
docker compose up -d emqx
```

Generated private keys and certificates under `infra/emqx/certs/dev/` are
ignored by Git and must not be used outside local development. Production TLS
must be provided by environment-specific secrets or a managed certificate
process.

Local dashboard credentials are configured through `.env`:

```text
EMQX_DASHBOARD_USERNAME=admin
EMQX_DASHBOARD_PASSWORD=public-emqx-local-admin-change-me
```

Anonymous MQTT access is disabled for EMQX. Local development authentication is
bootstrapped from `infra/emqx/auth/dev-users.csv`:

| Device | Username | Password |
| ------ | -------- | -------- |
| `SN123456` | `device_SN123456` | `dev-device-SN123456-change-me` |
| `SN654321` | `device_SN654321` | `dev-device-SN654321-change-me` |

Topic authorization is defined in `infra/emqx/acl/dev-acl.conf`. Each device
user is limited to its own topics. For example, `device_SN123456` can publish to:

```text
devices/SN123456/heartbeat
devices/SN123456/telemetry
```

and can subscribe to:

```text
devices/SN123456/commands
devices/SN123456/heartbeat
devices/SN123456/telemetry
```

All unmatched actions are denied. This keeps the heartbeat topic contract
compatible with `DEVICE_HEARTBEAT_TOPIC=devices/{serialNumber}/heartbeat`.

Authorized TLS publish:

```bash
mosquitto_pub -h localhost -p 8883 \
  --cafile infra/emqx/certs/dev/ca.crt \
  -u device_SN123456 -P dev-device-SN123456-change-me \
  -t devices/SN123456/heartbeat \
  -m '{"timestamp":"2026-06-20T12:00:00Z"}'
```

Authorized TLS subscribe:

```bash
mosquitto_sub -h localhost -p 8883 \
  --cafile infra/emqx/certs/dev/ca.crt \
  -u device_SN123456 -P dev-device-SN123456-change-me \
  -t devices/SN123456/heartbeat -v
```

Unauthorized publish check:

```bash
mosquitto_pub -h localhost -p 8883 \
  --cafile infra/emqx/certs/dev/ca.crt \
  -u device_SN123456 -P dev-device-SN123456-change-me \
  -t devices/OTHER_DEVICE/heartbeat \
  -m '{}'
```

Persistent sessions are controlled with `EMQX_SESSION_EXPIRY_INTERVAL`, which
defaults to `2h`. Device clients should connect with a stable client ID and
clean start disabled when they need queued QoS 1 messages while offline.

EMQX logs are written to stdout and `/opt/emqx/log` inside the container. The
EMQX dashboard exposes broker, listener, client, session, and metrics views.
The current Prometheus MQTT exporter remains Mosquitto-specific; add an EMQX
Prometheus scrape job or exporter when EMQX metrics are promoted into the
default dashboard.

Production identity should replace local static users with one of:

- mTLS client certificates tied to registered devices
- EMQX JWT authentication
- EMQX auth webhook backed by the platform device registry

The current `device-api` heartbeat state engine is HTTP-backed. A future MQTT
consumer should subscribe to the configured EMQX heartbeat topic and call the
same heartbeat ingestion service used by `POST /api/v1/devices/{serialNumber}/heartbeat`.

## Virtual Device Simulator

The repository includes a local virtual device simulator for scalability and
workflow testing. It can generate deterministic virtual devices, heartbeat
messages, telemetry messages, update lifecycle events, and failure scenarios.

Run a one-device dry-run smoke test without Docker or a broker:

```bash
pnpm simulate:devices -- --dry-run --count 1 --duration 5s
```

Run a 100-device heartbeat and telemetry dry run:

```bash
pnpm simulate:devices -- \
  --dry-run \
  --count 100 \
  --serial-prefix SN-LOAD \
  --heartbeat-interval 5s \
  --telemetry-interval 15s \
  --duration 1m
```

Run a telemetry burst simulation:

```bash
pnpm simulate:devices -- \
  --dry-run \
  --count 25 \
  --failure-mode telemetry-burst \
  --duration 30s
```

Run offline, invalid payload, out-of-order heartbeat, unauthorized topic,
rejected auth, or update failure scenarios:

```bash
pnpm simulate:devices -- --dry-run --failure-mode offline
pnpm simulate:devices -- --dry-run --failure-mode invalid-payload
pnpm simulate:devices -- --dry-run --failure-mode out-of-order-heartbeat
pnpm simulate:devices -- --dry-run --failure-mode unauthorized-topic
pnpm simulate:devices -- --dry-run --failure-mode rejected-auth
pnpm simulate:devices -- --dry-run --failure-mode update-failure
```

To publish to local EMQX over TLS, start EMQX and use the dev certificate
generated earlier:

```bash
sh infra/emqx/certs/generate-dev-certs.sh
docker compose up -d emqx
pnpm simulate:devices -- \
  --dry-run false \
  --serials SN123456 \
  --broker-url ssl://localhost:8883 \
  --ca-file infra/emqx/certs/dev/ca.crt \
  --username-template device_{serialNumber} \
  --password-template dev-device-{serialNumber}-change-me \
  --duration 5s
```

The default simulator serial format is `{serialPrefix}-000001`. For the local
EMQX dev users in this repository, use `--serials SN123456,SN654321` or update
`infra/emqx/auth/dev-users.csv` and `infra/emqx/acl/dev-acl.conf` with matching
serials.

Simulator configuration can be supplied with CLI flags, environment variables,
or a JSON config file with `--config path/to/config.json`. Useful environment
variables include:

```text
DEVICE_SIMULATOR_COUNT=100
DEVICE_SIMULATOR_SERIAL_PREFIX=SN-LOAD
DEVICE_SIMULATOR_SERIALS=SN123456,SN654321
DEVICE_SIMULATOR_BROKER_URL=ssl://localhost:8883
DEVICE_SIMULATOR_CA_FILE=infra/emqx/certs/dev/ca.crt
DEVICE_SIMULATOR_USERNAME_TEMPLATE=device_{serialNumber}
DEVICE_SIMULATOR_PASSWORD_TEMPLATE=dev-device-{serialNumber}-change-me
DEVICE_SIMULATOR_HEARTBEAT_INTERVAL=5s
DEVICE_SIMULATOR_TELEMETRY_INTERVAL=15s
DEVICE_SIMULATOR_DURATION=1m
DEVICE_SIMULATOR_FAILURE_MODE=telemetry-burst
DEVICE_SIMULATOR_DRY_RUN=true
```

Simulator output is newline-delimited JSON. Use the generated topics and
payloads with EMQX, Loki, Prometheus, Grafana, and Jaeger when those services
are running locally.

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
against the local Mosquitto broker. EMQX metrics are available through the EMQX
dashboard locally and should be wired into Prometheus when EMQX replaces
Mosquitto for default observability.

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
docker compose exec emqx /opt/emqx/bin/emqx ctl status
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
