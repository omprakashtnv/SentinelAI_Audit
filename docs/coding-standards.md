# Coding Standards

## TypeScript

- Enable strict TypeScript.
- Avoid `any`; use `unknown` at boundaries and narrow explicitly.
- Prefer named exports for application code.
- Keep functions small and intention-revealing.
- Model invalid states out of public types where practical.
- Use Zod for runtime validation at trust boundaries.

## React

- Prefer feature folders over global component sprawl.
- Keep server-state fetching in TanStack Query hooks.
- Keep form validation schemas close to forms unless shared.
- Use shadcn/ui as the default component foundation.
- Keep route components thin; move reusable behavior into feature modules.

## API

- Validate request bodies, params, query strings, and file metadata.
- Return consistent error shapes.
- Avoid leaking stack traces, provider prompts, secrets, or raw upload paths.
- Keep controllers transport-focused.
- Keep business orchestration in services.

## Database

- Use Prisma migrations for schema changes.
- Keep database access behind repositories or module data access functions.
- Never expose Prisma models directly as API responses.
- Add indexes intentionally around lookup and ownership boundaries.

## Security

- Validate archive extraction paths before writing files.
- Scan uploads in isolated temporary directories.
- Do not execute untrusted project code.
- Keep generated fixes reviewable by the user before application.
- Log operational metadata, not uploaded source content.

## Testing

- Unit test domain services and utility logic.
- Integration test API boundaries.
- Component test complex UI behavior.
- Add regression tests for every fixed security-sensitive bug.

