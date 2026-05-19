# Device Management Platform

Enterprise-grade cloud platform for managing connected devices at scale. The platform is structured to support device registry, firmware management, OTA campaigns, telemetry ingestion, notifications, administration workflows, infrastructure automation, CI/CD, and observability foundations.

## Tech Stack

- Nx monorepo
- pnpm package management
- Angular admin frontend
- Node.js and NestJS backend services
- TypeScript
- ESLint and Prettier
- Commitlint, Husky, and lint-staged
- GitHub Actions
- Docker, Kubernetes, Helm, and Terraform folders for future infrastructure work

## Repository Structure

```text
apps/
  web-admin/
  device-api/
  firmware-api/
  telemetry-api/
  notification-service/
  ota-update-service/
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
tools/
  scripts/
  generators/
docs/
  architecture/
  api/
  adr/
```

## Getting Started

Use Node.js 22 and pnpm 9.15.9 or newer.

Install dependencies:

```bash
pnpm install
```

Run the admin portal:

```bash
pnpm start:web
```

Run a backend service:

```bash
pnpm start:device-api
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
