# Shared Architecture

SentinelAI should be organized as a modular monorepo with separate frontend and backend applications. The client owns user experience, routing, forms, and API consumption. The server owns HTTP transport, validation, authorization boundaries, persistence, background orchestration, and external service integrations.

## Boundary Model

```text
client
  -> typed API calls
server
  -> application services
  -> domain modules
  -> infrastructure adapters
  -> database and external providers
```

## Target Request Flow

1. The client validates user input locally for fast feedback.
2. The server validates every request again at the API boundary.
3. Controllers translate HTTP concerns into application commands.
4. Services coordinate domain behavior.
5. Repositories isolate database access.
6. Provider adapters isolate OpenAI, GitHub, storage, and reporting integrations.

## Shared Contracts

Use Zod schemas at application boundaries. Keep shared request and response contracts small, stable, and explicit. Do not share database models directly with the client.

Shared types may later live in a dedicated workspace package when the same contracts are consumed by both applications. Until then, avoid premature package extraction.

## Security Posture

- Treat uploaded source code, generated reports, and scan results as confidential.
- Validate file type, size, path traversal risk, and archive contents before processing uploads.
- Keep secrets server-side only.
- Do not expose raw provider errors to end users.
- Record audit trails for sensitive future actions.
- Prefer least-privilege service credentials.

## Future Runtime Components

- Web application: `client/`
- API service: `server/`
- PostgreSQL database
- Object storage for uploaded archives and generated reports
- Background worker for long-running audits
- OpenAI Codex integration adapter
- GitHub import adapter

