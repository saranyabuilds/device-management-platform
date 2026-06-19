# Local Containers

The local Compose stack starts shared infrastructure for development:

- PostgreSQL
- Redis
- Kafka in single-node KRaft mode
- Eclipse Mosquitto MQTT broker

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

## Smoke Checks

```bash
docker compose ps
docker compose exec postgres pg_isready -U dmp_user -d device_management
docker compose exec redis redis-cli ping
docker compose exec kafka kafka-topics.sh --bootstrap-server kafka:9092 --list
docker compose exec mqtt mosquitto_pub -h localhost -p 1883 -t dmp/smoke -m ok
```

If the `apps` profile is running:

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:4200/healthz
```

## Troubleshooting

- If a port is already in use, change it in `.env`.
- If Kafka does not become healthy after changing cluster settings, run
  `docker compose down -v` to reset its local volume.
- If Docker Compose reports missing variables, refresh `.env` from
  `.env.example`.
- `.env` is intentionally ignored by Git; keep local overrides there.
