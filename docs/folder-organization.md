# Folder Organization

## Root

```text
client/       Frontend React application
server/       Backend Express API
docs/         Engineering standards and architecture notes
docker/       Docker Compose and container definitions
scripts/      Repeatable local and CI automation
.vscode/      Editor recommendations
```

## Client Target Structure

```text
client/
  src/
    app/              Application providers, router, layout shell
    assets/           Static frontend assets
    components/       Shared reusable UI components
    config/           Client runtime configuration
    features/         Feature-oriented UI modules
    hooks/            Shared React hooks
    lib/              Framework-neutral utilities
    routes/           Route definitions and route-level screens
    services/         API clients and client-side service wrappers
    styles/           Global styles and Tailwind entry points
    types/            Client-only TypeScript types
```

## Server Target Structure

```text
server/
  src/
    app/              Express app composition
    config/           Environment and configuration loading
    db/               Prisma client and database utilities
    modules/          Domain modules
    middleware/       Express middleware
    providers/        External service adapters
    routes/           HTTP route registration
    shared/           Server-only shared utilities
    types/            Server-only TypeScript types
  prisma/             Prisma schema and migrations
  tests/              Server test setup and integration tests
```

## Domain Module Shape

```text
modules/
  audits/
    audit.controller.ts
    audit.service.ts
    audit.repository.ts
    audit.schemas.ts
    audit.types.ts
    audit.test.ts
```

Controllers should stay thin. Services should contain orchestration. Repositories should own persistence details. Provider adapters should hide third-party SDK behavior.

