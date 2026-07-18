# Vercel + Railway Deployment

This is the recommended hackathon deployment setup:

- Frontend: Vercel
- Backend: Railway
- Database: Railway PostgreSQL

## Backend On Railway

### 1. Create The Railway Project

1. Open Railway.
2. Create a new project.
3. Add a PostgreSQL service.
4. Add a backend service from the GitHub repository.

### 2. Configure The Backend Service

Use these service settings:

```text
Root Directory: /server
Config File Path: /server/railway.json
Build Command: pnpm build
Pre-deploy Command: pnpm prisma:deploy
Start Command: pnpm railway:start
Healthcheck Path: /api/health
```

`server/railway.json` already contains these build and deploy settings. If Railway does not pick up the config file automatically, set them manually in the dashboard.

### 3. Backend Variables

In the backend service variables, set:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
CORS_ORIGIN=https://your-vercel-app.vercel.app
JWT_ACCESS_SECRET=replace-with-a-random-32-plus-character-secret
LOG_LEVEL=info
REQUEST_BODY_LIMIT=1mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
SHUTDOWN_GRACE_MS=10000
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
OPENAI_MODEL=gpt-4.1
OPENAI_TIMEOUT_MS=60000
OPENAI_MAX_RETRIES=2
OPENAI_TEMPERATURE=0.2
OPENAI_MAX_OUTPUT_TOKENS=4000
OPENAI_STREAMING_ENABLED=false
SENTINEL_DEMO_MODE=true
SENTINEL_DEMO_FINDINGS_ENABLED=true
```

If your PostgreSQL service is not named `Postgres`, change `DATABASE_URL` to:

```env
DATABASE_URL=${{YourDatabaseServiceName.DATABASE_URL}}
```

Optional:

```env
OPENAI_API_KEY=your-openai-api-key
```

Leave `OPENAI_API_KEY` unset or blank for a stable rule-based demo. The application will still scan and show findings.

### 4. Generate A Public API Domain

In the backend Railway service:

1. Go to Settings.
2. Open Networking.
3. Generate a public domain.

Your API base URL will be:

```text
https://your-api.up.railway.app/api
```

Smoke test:

```text
https://your-api.up.railway.app/api/health
```

## Frontend On Vercel

### 1. Import The Repository

1. Open Vercel.
2. Import the same GitHub repository.
3. Select the frontend project.

Use these settings:

```text
Framework Preset: Vite
Root Directory: client
Install Command: corepack enable && pnpm install --frozen-lockfile
Build Command: pnpm build
Output Directory: dist
```

`client/vercel.json` already contains the build settings and SPA rewrite rules.

### 2. Frontend Variables

In Vercel project variables, set:

```env
VITE_API_BASE_URL=https://your-api.up.railway.app/api
VITE_APP_ENV=production
```

Redeploy the frontend after changing `VITE_API_BASE_URL`; Vite bakes this value into the production bundle.

### 3. Update Railway CORS

After Vercel gives you the frontend URL, update Railway:

```env
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

For local plus deployed frontend testing:

```env
CORS_ORIGIN=http://localhost:5173,https://your-vercel-app.vercel.app
```

Redeploy the Railway backend after changing CORS.

## Demo Checklist

1. Open `https://your-api.up.railway.app/api/health`.
2. Open the Vercel frontend.
3. Register a new user.
4. Create a project.
5. Upload ZIP or import a public GitHub repository.
6. Run scan.
7. Open Security Dashboard, Findings, Finding Details, and Fix Preview.

## Important Demo Notes

- Railway filesystem storage is ephemeral unless you add a volume. Uploaded ZIPs and cloned repos should be treated as temporary.
- For the hackathon demo, upload/import and scan in the same active session.
- Keep `SENTINEL_DEMO_FINDINGS_ENABLED=true` so findings appear even if OpenAI is unavailable.
- Because the frontend and backend are on different domains, production refresh-token cookies require `REFRESH_TOKEN_COOKIE_SAME_SITE=none` and HTTPS.
