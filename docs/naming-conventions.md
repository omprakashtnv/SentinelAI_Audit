# Naming Conventions

## Files

- React components: `PascalCase.tsx`
- Hooks: `useThing.ts`
- TypeScript utilities: `kebab-case.ts`
- Tests: `name.test.ts` or `Name.test.tsx`
- Zod schemas: `*.schemas.ts`
- Types: `*.types.ts`
- Express controllers: `*.controller.ts`
- Services: `*.service.ts`
- Repositories: `*.repository.ts`
- Provider adapters: `*.provider.ts`

## Code

- Components: `PascalCase`
- Types and interfaces: `PascalCase`
- Functions and variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE` only for true constants
- Environment variables: `SCREAMING_SNAKE_CASE`
- Database tables: `snake_case`
- API routes: kebab-case nouns, for example `/audit-reports`

## Domain Language

Use consistent product terms:

- `audit`: a complete security review of one uploaded source
- `finding`: one detected security issue
- `fix`: a generated remediation proposal or patch
- `report`: a generated user-facing audit document
- `workspace`: a future tenant or organization boundary

