# SentinelAI

SentinelAI is a production-style SaaS security auditing platform for source code repositories. Users can create projects, upload a ZIP file or import a public GitHub repository, run a security scan, review findings, inspect source files, view security dashboards, and open guided fix previews.

The application is designed for a hackathon demo, but the codebase follows a production-minded architecture: typed APIs, Prisma persistence, centralized configuration, secure authentication, reusable scan services, and a modern React dashboard.

## What It Does

- Creates and manages authenticated user workspaces.
- Accepts repository sources from ZIP upload or public GitHub URL.
- Extracts ZIP files safely and protects against Zip Slip.
- Clones public GitHub repositories with timeout and URL validation.
- Parses repository files and builds file metadata.
- Runs rule-based security scanning without requiring AI.
- Optionally enhances scan/fix output with OpenAI when an API key is configured.
- Stores scans, findings, statuses, severities, and repository metadata in PostgreSQL.
- Shows dashboards, charts, repository security views, finding details, and fix previews.
- Provides a hackathon-safe demo mode when OpenAI is unavailable.

## Tech Stack

Frontend:

- React 19
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui-style components
- TanStack Query
- React Router
- React Hook Form
- Zod
- Framer Motion
- Recharts
- Monaco Editor
- Axios

Backend:

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication
- bcrypt password hashing
- HTTP-only refresh token cookies
- Winston logging
- Helmet, CORS, compression, rate limiting, Morgan
- Multer, yauzl, simple-git
- Optional OpenAI SDK integration

Database:

- PostgreSQL
- Prisma migrations
- Recommended hosted database for demo: Neon Postgres

Deployment:

- Frontend: Vercel
- Backend: Render
- Database: Neon Postgres

## Monorepo Structure

```text
sentinelai/
  client/                 React + Vite frontend
  server/                 Express + Prisma backend
  docs/                   Architecture and engineering notes
  docker/                 Local infrastructure placeholder
  scripts/                Automation placeholder
  README.md               Project guide
```

## Key Features

### Authentication

- Register
- Login
- Logout
- Refresh token
- Current user profile
- Protected frontend routes
- Access token returned in JSON
- Refresh token stored in HTTP-only cookie
- Refresh token rotation and replay protection
- Password hashing with bcrypt

### Projects

- Create project
- List projects with backend search and pagination
- View project details
- Edit project
- Soft delete project
- Dashboard statistics
- Ownership checks on every protected query

### Repository Sources

- ZIP upload up to 100 MB
- MIME and extension validation
- Temporary storage and extraction
- Safe ZIP extraction
- Nested archive rejection
- Public GitHub repository import
- Repository source attached to the project
- Repository Explorer with tree view and Monaco source preview

### Scan Engine

- Scan lifecycle:
  - `QUEUED`
  - `PARSING`
  - `INDEXING`
  - `READY_FOR_AI`
  - `AI_SCANNING`
  - `PROCESSING_RESULTS`
  - `COMPLETED`
  - `FAILED`
  - `CANCELLED`
- Progress tracking
- Elapsed time
- Cancellation
- Retry failed scans
- Prevents concurrent scans for the same project
- Real-time progress with SSE-style progress updates

### Security Intelligence

- Rule-based scanner that works without AI
- Security knowledge base
- Finding explanation engine
- Security score engine
- Findings dashboard
- Repository security view
- Finding details page
- Fix generator
- Language adapters
- Code diff generator
- Fix preview page

### Optional OpenAI Enhancement

The app does not require OpenAI to work. If `OPENAI_API_KEY` is configured, SentinelAI can enhance generated explanations, recommendations, and fixes. If the key is missing, invalid, or quota-limited, the application falls back to the built-in rule-based scanner and template-based fix engine.

For hackathon demos, keep:

```env
SENTINEL_DEMO_MODE=true
SENTINEL_DEMO_FINDINGS_ENABLED=true
```

This keeps the demo stable even when OpenAI is unavailable.

## Architecture

Backend modules follow a Controller -> Service -> Repository pattern.

```text
Route
  -> Controller
    -> Service
      -> Repository
        -> Prisma
```

Frontend code is organized around routes, features, services, shared UI, types, hooks, and providers.

```text
client/src/
  app/                    App shell, router, providers
  components/             Shared UI and feedback components
  config/                 Client environment validation
  features/               Feature-specific hooks/components/schemas
  hooks/                  Shared React hooks
  layouts/                Dashboard/auth layouts
  routes/                 Page-level route components
  services/api/           Axios API layer
  types/                  Shared frontend types
```

Backend modules:

```text
server/src/
  config/                 Environment validation
  db/                     Prisma client utilities
  middleware/             Express middleware
  modules/
    auth/
    projects/
    uploads/
    github-imports/
    repository-parser/
    repository-explorer/
    file-indexer/
    chunk-generator/
    rule-based-scanner/
    prompt-builder/
    openai/
    ai-response-validator/
    scans/
    findings/
    security-score/
    security-knowledge-base/
    finding-explanation/
    fix-generator/
    language-adapters/
    code-diff-generator/
  routes/                 API router
  shared/                 Errors, HTTP helpers, logger, utilities
```

## Prerequisites

- Node.js 20.11 or newer
- pnpm 9.15 or newer through Corepack
- PostgreSQL database
- Git installed locally for GitHub import support

Enable Corepack:

```bash
corepack enable
```

## Local Development

Install dependencies:

```bash
cd server
pnpm install

cd ../client
pnpm install
```

Create `server/.env`:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sentinelai?schema=public
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
REQUEST_BODY_LIMIT=1mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
SHUTDOWN_GRACE_MS=10000

JWT_ACCESS_SECRET=replace-with-at-least-32-random-characters
JWT_ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=7
REFRESH_TOKEN_COOKIE_NAME=sentinelai_refresh_token
REFRESH_TOKEN_COOKIE_SAME_SITE=lax
BCRYPT_SALT_ROUNDS=12

UPLOAD_TEMP_DIR=tmp/uploads/zips
UPLOAD_EXTRACT_DIR=tmp/uploads/extracted
UPLOAD_MAX_ZIP_SIZE_BYTES=104857600
UPLOAD_MAX_EXTRACTED_SIZE_BYTES=524288000
UPLOAD_MAX_ZIP_ENTRIES=10000

GITHUB_IMPORT_BASE_DIR=tmp/imports/github
GITHUB_IMPORT_TIMEOUT_MS=120000

REPOSITORY_PARSER_MAX_FILE_SIZE_BYTES=1048576
REPOSITORY_PARSER_MAX_FILES=20000
REPOSITORY_PARSER_MAX_DEPTH=50

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1
OPENAI_TIMEOUT_MS=60000
OPENAI_MAX_RETRIES=2
OPENAI_TEMPERATURE=0.2
OPENAI_MAX_OUTPUT_TOKENS=4000
OPENAI_STREAMING_ENABLED=false

SENTINEL_DEMO_MODE=true
SENTINEL_DEMO_FINDINGS_ENABLED=true
```

Create `client/.env.local`:

```env
VITE_APP_NAME=SentinelAI
VITE_API_BASE_URL=http://localhost:4000/api
VITE_APP_ENV=development
```

Prepare the database:

```bash
cd server
pnpm prisma:generate
pnpm prisma:deploy
```

Run the backend:

```bash
cd server
pnpm dev
```

Run the frontend:

```bash
cd client
pnpm dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`
- Health check: `http://localhost:4000/api/health`

## Scripts

Backend:

```bash
pnpm dev               # Start Express API in watch mode
pnpm build             # Compile TypeScript
pnpm start             # Start compiled API
pnpm typecheck         # TypeScript check
pnpm prisma:generate   # Generate Prisma Client
pnpm prisma:validate   # Validate Prisma schema
pnpm prisma:deploy     # Apply production migrations
pnpm prisma:migrate    # Create/apply local dev migration
pnpm prisma:studio     # Open Prisma Studio
```

Frontend:

```bash
pnpm dev          # Start Vite dev server
pnpm build        # Typecheck and build production assets
pnpm preview      # Preview production build
pnpm typecheck    # TypeScript check
```

## Demo Flow

1. Register a user.
2. Create a project.
3. Open the project.
4. Upload a ZIP file or import a public GitHub repository.
5. Open Repository Explorer to inspect files.
6. Run a scan.
7. Watch scan progress.
8. Open Security Dashboard.
9. Review Findings.
10. Open a Finding Details page.
11. Open Fix Preview to inspect the generated secure fix and diff.
12. Open Reports for the security health certificate view.

## Deployment

The recommended hackathon deployment is:

- Frontend on Vercel
- Backend on Render
- Database on Neon Postgres

### 1. Deploy Database On Neon

1. Create a Neon project.
2. Copy the PostgreSQL connection string from the Neon dashboard.
3. Ensure the connection string includes SSL, usually:

```text
?sslmode=require
```

For this app, use the direct Neon connection string as `DATABASE_URL` for the Render backend. For a larger production setup, review pooled vs direct connection settings before scaling.

### 2. Deploy Backend On Render

Create a Render Web Service from the GitHub repository.

Recommended Render settings:

```text
Language: Node
Root Directory: server
Build Command: corepack enable && pnpm install --frozen-lockfile && pnpm build
Start Command: pnpm prisma:deploy && pnpm start
Health Check Path: /api/health
```

Render backend environment variables:

```env
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@YOUR-NEON-HOST/YOUR-DB?sslmode=require
CORS_ORIGIN=https://your-vercel-app.vercel.app
LOG_LEVEL=info
REQUEST_BODY_LIMIT=1mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
SHUTDOWN_GRACE_MS=10000

JWT_ACCESS_SECRET=replace-with-a-random-32-plus-character-secret
JWT_ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=7
REFRESH_TOKEN_COOKIE_NAME=sentinelai_refresh_token
REFRESH_TOKEN_COOKIE_SAME_SITE=none
BCRYPT_SALT_ROUNDS=12

UPLOAD_TEMP_DIR=tmp/uploads/zips
UPLOAD_EXTRACT_DIR=tmp/uploads/extracted
UPLOAD_MAX_ZIP_SIZE_BYTES=104857600
UPLOAD_MAX_EXTRACTED_SIZE_BYTES=524288000
UPLOAD_MAX_ZIP_ENTRIES=10000

GITHUB_IMPORT_BASE_DIR=tmp/imports/github
GITHUB_IMPORT_TIMEOUT_MS=120000

REPOSITORY_PARSER_MAX_FILE_SIZE_BYTES=1048576
REPOSITORY_PARSER_MAX_FILES=20000
REPOSITORY_PARSER_MAX_DEPTH=50

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1
OPENAI_TIMEOUT_MS=60000
OPENAI_MAX_RETRIES=2
OPENAI_TEMPERATURE=0.2
OPENAI_MAX_OUTPUT_TOKENS=4000
OPENAI_STREAMING_ENABLED=false

SENTINEL_DEMO_MODE=true
SENTINEL_DEMO_FINDINGS_ENABLED=true
```

After deployment, your API base URL will look like:

```text
https://your-render-service.onrender.com/api
```

Health check:

```text
https://your-render-service.onrender.com/api/health
```

### 3. Deploy Frontend On Vercel

Create a Vercel project from the GitHub repository.

Recommended Vercel settings:

```text
Framework Preset: Vite
Root Directory: client
Install Command: corepack enable && pnpm install --frozen-lockfile
Build Command: pnpm build
Output Directory: dist
```

Frontend environment variables:

```env
VITE_APP_NAME=SentinelAI
VITE_API_BASE_URL=https://your-render-service.onrender.com/api
VITE_APP_ENV=production
```

After Vercel gives you a production URL, update Render:

```env
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

For local frontend plus deployed backend testing:

```env
CORS_ORIGIN=http://localhost:5173,https://your-vercel-app.vercel.app
```

Because the frontend and backend are on different domains, production refresh-token cookies need:

```env
REFRESH_TOKEN_COOKIE_SAME_SITE=none
```

The backend automatically marks the cookie as secure in production.

## API Overview

Base URL:

```text
/api
```

Primary route groups:

```text
GET    /health
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh-token
GET    /auth/me

GET    /projects
POST   /projects
GET    /projects/:projectId
PATCH  /projects/:projectId
DELETE /projects/:projectId

POST   /uploads/projects/:projectId/repository-upload
POST   /projects/:projectId/github-import
GET    /projects/:projectId/repository
GET    /projects/:projectId/repository/source
GET    /projects/:projectId/repository/files

POST   /projects/:projectId/scans
GET    /projects/:projectId/scans
GET    /projects/:projectId/scans/:scanId
GET    /projects/:projectId/scans/:scanId/progress
POST   /projects/:projectId/scans/:scanId/cancel
POST   /projects/:projectId/scans/:scanId/retry

GET    /projects/:projectId/findings
GET    /projects/:projectId/findings/:findingId
GET    /projects/:projectId/findings/:findingId/explanation
GET    /projects/:projectId/findings/:findingId/fix-preview
POST   /projects/:projectId/findings/:findingId/dismiss
POST   /projects/:projectId/findings/:findingId/resolve
DELETE /projects/:projectId/findings/:findingId
```

## Security Notes

- Passwords are hashed with bcrypt.
- Refresh tokens are hashed before storage.
- Refresh token rotation is implemented.
- Protected routes validate ownership.
- Project and finding queries are scoped to the authenticated user.
- ZIP extraction validates file paths to prevent Zip Slip.
- Nested archives are rejected.
- Rate limiting skips read-only requests but protects mutation routes.
- CORS must be configured to the deployed frontend origin.
- OpenAI failures do not break the scan pipeline.

## Demo Limitations

- Render free services can cold start after inactivity.
- Render filesystem storage is ephemeral unless persistent disk is configured.
- Uploaded ZIPs and cloned repositories should be treated as temporary runtime files.
- For a smooth demo, upload/import and scan during the same active session.
- Keep demo findings enabled when OpenAI quota is unavailable.

## Useful Documentation

- [Shared Architecture](docs/architecture.md)
- [Folder Organization](docs/folder-organization.md)
- [Naming Conventions](docs/naming-conventions.md)
- [Coding Standards](docs/coding-standards.md)
- [Recommended Dependencies](docs/recommended-dependencies.md)
- [Development Workflow](docs/development-workflow.md)
- [VSCode Extensions](docs/vscode-extensions.md)

## Production Roadmap

- Move repository files to durable object storage.
- Add background workers for long-running scans.
- Add queue-backed scan orchestration.
- Add test coverage for critical auth, scan, and findings flows.
- Add audit log tables.
- Add organization/team support.
- Add report export to PDF.
- Add stronger OpenAI usage controls and per-user quotas.
- Add CI/CD checks for lint, typecheck, Prisma validation, and builds.

## License

This project is currently private and intended for hackathon/demo use.
