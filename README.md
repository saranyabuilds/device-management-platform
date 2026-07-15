# Device Management Platform

Enterprise-grade cloud platform for managing connected devices at scale. The platform is structured to support device registry, firmware management, OTA campaigns, telemetry ingestion, notifications, administration workflows, infrastructure automation, CI/CD, and observability foundations.

## Tech Stack

- Nx monorepo
- pnpm package management
- Angular admin frontend
- Java and Spring Boot backend services
- TypeScript
- Maven
- ESLint and Prettier
- Commitlint, Husky, and lint-staged
- GitHub Actions
- Docker, Kubernetes, Helm, and Terraform folders for future infrastructure work

## Repository Structure

```text
apps/
  admin-portal/
  web-admin/
  firmware-api/
  telemetry-api/
  notification-service/
  ota-update-service/
services/
  device-api/
libs/
  shared-types/
  shared-utils/
  auth/
  logging/
  validation/
  device-domain/
  firmware-domain/
  telemetry-domain/
infra/
  docker/
  kubernetes/
  helm/
  terraform/
deploy/
  k8s/
tools/
  scripts/
  device-simulator/
  generators/
docs/
  architecture/
  api/
  adr/
  development/
```

## Getting Started

Node.js 22 is required for the Nx workspace. Use pnpm 9.15.9 or newer. Use
Java 17 or newer for Spring Boot services.

Install dependencies:

```bash
pnpm install
```

Run the admin portal:

```bash
pnpm start
# or
pnpm start:admin-portal
```

Run a backend service:

```bash
pnpm start:device-api
```

Run remaining generated backend placeholders:

```bash
pnpm start:firmware-api
pnpm start:ota
```

Validate the workspace:

```bash
pnpm format:check
pnpm lint
pnpm test
pnpm build
```

Validate only the admin portal:

```bash
pnpm build:admin-portal
pnpm test:admin-portal
```

Validate the Spring Boot device API:

```bash
pnpm test:device-api
pnpm build:device-api
```

Run the local virtual device simulator in dry-run mode:

```bash
pnpm simulate:devices -- --dry-run --count 1 --duration 5s
```

Build Docker images locally:

```bash
docker build -f apps/admin-portal/Dockerfile -t admin-portal:local .
docker build -f services/device-api/Dockerfile -t device-api:local services/device-api
```

Start local infrastructure containers:

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

See [docs/development/local-containers.md](docs/development/local-containers.md)
for PostgreSQL, Redis, Kafka, MQTT, optional app containers, connection strings,
smoke checks, and reset commands.

## CI/CD

GitHub Actions provides the automated build and deployment foundation:

- `Pull Request Validation`: runs formatting, lint, tests, builds, Maven validation,
  and Docker image builds for pull requests to `main` and `develop`.
- `Continuous Integration`: validates pushes to `develop`.
- `Build and Publish Images`: builds and publishes production images on `main`.
- `Security Scan`: runs dependency and container scans with critical severity
  failures.
- `Deploy`: manually deploys a selected image tag to Kubernetes.
- `Rollback Kubernetes Deployment`: manually rolls back to the previous rollout
  revision or a selected image tag.

Images are published to GitHub Container Registry by default:

```text
ghcr.io/<owner>/<repo>/admin-portal:<tag>
ghcr.io/<owner>/<repo>/device-api:<tag>
```

Published tags include:

- `sha-<12-character-git-sha>`
- `ref-<branch-name>`
- `latest` for `main`

Optional GitHub variables:

- `CONTAINER_REGISTRY`: container registry hostname. Defaults to `ghcr.io`.

Required GitHub secrets:

- `GHCR_TOKEN` if the default `GITHUB_TOKEN` is not sufficient for package
  publishing.
- `KUBE_CONFIG_DEV`
- `KUBE_CONFIG_STAGING`
- `KUBE_CONFIG_PROD`
- `KUBE_NAMESPACE_DEV`
- `KUBE_NAMESPACE_STAGING`
- `KUBE_NAMESPACE_PROD`

Optional registry secrets for non-GHCR registries:

- `REGISTRY_USERNAME`
- `REGISTRY_PASSWORD`

Kubeconfig secrets may contain raw kubeconfig YAML or base64-encoded kubeconfig
content. Namespace secrets should contain the target namespace name. The target
namespaces must exist before deployment.

Manual deployment:

1. Publish images by merging to `main` or running the image workflow from a branch
   after adapting the trigger.
2. Open **Actions** > **Deploy**.
3. Select `dev`, `staging`, or `prod`.
4. Enter an immutable image tag such as `sha-495954d0f0aa`.
5. Run the workflow. The workflow verifies the image tag exists before applying
   manifests and waits for Kubernetes rollout completion.

Rollback:

- Open **Actions** > **Rollback Kubernetes Deployment**.
- Select the environment and service.
- Leave `image_tag` empty to run `kubectl rollout undo`.
- Provide a tag such as `sha-495954d0f0aa` to roll back to a specific image.
- For specific image rollback, the workflow verifies the tag exists before
  updating the deployment image.

See [docs/operations/rollback.md](docs/operations/rollback.md) for manual
verification commands.

## Development Standards

- Use Nx generators for new apps and libraries.
- Keep reusable contracts and utilities in `libs/`.
- Prefer domain libraries for business concepts and application projects for delivery mechanisms.
- Run format, lint, tests, and builds before opening a pull request.
- Use conventional commits, for example `feat(device-api): add registry endpoint`.

## Branch Strategy

- `main` is the production-ready branch.
- `develop` is the integration branch for upcoming releases.
- Feature work should branch from `develop` using `feature/<short-description>`.
- Hotfixes should branch from `main` using `hotfix/<short-description>`.

## Commit Message Format

This repository uses Conventional Commits enforced by commitlint:

```text
<type>(optional-scope): <description>
```

Common types include `feat`, `fix`, `docs`, `refactor`, `test`, `build`, and `chore`.
