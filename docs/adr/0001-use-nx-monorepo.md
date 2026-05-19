# 0001: Use Nx Monorepo

## Status

Accepted

## Context

The device management platform will include multiple frontend, backend, domain, and infrastructure components. Teams need a consistent way to build, test, lint, and share TypeScript code across services without duplicating configuration.

## Decision

Use Nx as the monorepo foundation with pnpm as the package manager. Applications live under `apps/`, reusable TypeScript libraries live under `libs/`, and infrastructure, documentation, and platform tooling are kept in dedicated top-level directories.

## Consequences

Nx provides consistent generators, project graph awareness, affected commands, and shared task orchestration. Teams must follow workspace conventions for project names, dependency boundaries, and shared libraries. CI can run broad validation now and later optimize around affected projects as the repository grows.
