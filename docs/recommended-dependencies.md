# Recommended Dependencies

This document lists the intended dependency families. Exact versions should be selected during implementation setup.

## Root Workspace

- Package manager: `pnpm`
- Monorepo scripts: native package-manager workspaces first; add Turborepo only when orchestration complexity requires it
- Formatting: Prettier
- Linting: ESLint
- Git hooks: Lefthook or Husky with lint-staged

## Client

- `react`
- `react-dom`
- `typescript`
- `vite`
- `@vitejs/plugin-react`
- `tailwindcss`
- `@tailwindcss/vite`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `lucide-react`
- `@tanstack/react-query`
- `react-router`
- `react-hook-form`
- `@hookform/resolvers`
- `zod`
- `sonner`
- `vitest`
- `@testing-library/react`
- `@testing-library/user-event`
- `jsdom`
- `playwright`

## Server

- `express`
- `typescript`
- `tsx`
- `zod`
- `prisma`
- `@prisma/client`
- `pg`
- `cors`
- `helmet`
- `compression`
- `morgan` or `pino-http`
- `pino`
- `dotenv`
- `multer` or a streaming upload parser
- `jsonwebtoken`, later
- `bcrypt` or `argon2`, later
- `openai`, later
- `vitest`
- `supertest`

## Infrastructure

- PostgreSQL
- Docker Compose for local infrastructure
- Object storage emulator later, if report and upload storage move outside local disk

