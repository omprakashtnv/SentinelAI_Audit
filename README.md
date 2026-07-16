# SentinelAI

SentinelAI is an AI-powered security auditor for uploaded GitHub repositories or ZIP archives. The product will scan projects with OpenAI Codex, identify vulnerabilities, explain findings, generate secure fixes, and produce professional audit reports.

This repository currently contains only the production-grade project foundation. Authentication, scanning workflows, OpenAI integration, persistence models, and application business logic are intentionally deferred.

## Monorepo Structure

```text
sentinelai/
  client/                 React application
  server/                 Express API application
  docs/                   Architecture and engineering standards
  docker/                 Docker and local infrastructure assets
  scripts/                Development and automation scripts
  .vscode/                Recommended editor configuration
```

## Planned Stack

Frontend:

- React 19
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui
- TanStack Query
- React Router
- React Hook Form
- Zod

Backend:

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication, later
- OpenAI SDK, later

## Architecture Documents

- [Shared Architecture](docs/architecture.md)
- [Folder Organization](docs/folder-organization.md)
- [Naming Conventions](docs/naming-conventions.md)
- [Coding Standards](docs/coding-standards.md)
- [Recommended Dependencies](docs/recommended-dependencies.md)
- [Development Workflow](docs/development-workflow.md)
- [VSCode Extensions](docs/vscode-extensions.md)

## Foundation Principles

- Keep client and server deployable independently.
- Treat security audit data as sensitive by default.
- Keep business logic out of transport layers.
- Prefer explicit boundaries over hidden cross-package coupling.
- Introduce shared packages only when duplication becomes meaningful.
- Design for testability before adding integrations.

