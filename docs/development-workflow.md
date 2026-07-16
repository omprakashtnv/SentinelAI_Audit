# Development Workflow

## Branching

- Use short-lived feature branches.
- Prefix automation-created branches with `codex/`.
- Keep pull requests focused on one behavior or architectural change.

## Local Setup Sequence

1. Install workspace dependencies.
2. Start local infrastructure from `docker/`.
3. Configure environment variables from documented examples.
4. Run database migrations.
5. Start the client and server in separate terminals.
6. Run tests before opening a pull request.

## Quality Gates

Every pull request should pass:

- Type checking
- Linting
- Formatting check
- Unit tests
- Relevant integration tests
- Build verification

## Review Expectations

- Include screenshots for meaningful UI changes.
- Include API examples for endpoint changes.
- Include migration notes for database changes.
- Call out security-sensitive behavior explicitly.
- Keep generated audit, upload, and provider integration changes especially small and reviewable.

## Release Notes

Track user-visible changes, security improvements, and operational migrations. Do not include secrets, prompts, source-code uploads, or customer-specific findings in release notes.

