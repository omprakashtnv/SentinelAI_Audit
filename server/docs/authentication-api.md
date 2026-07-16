# SentinelAI Authentication API

Base path: `/api/auth`

Refresh tokens are issued as HTTP-only cookies. Access tokens are returned in JSON and expire after 15 minutes by default.

## Security Model

- Passwords are hashed with bcrypt.
- Access tokens are signed JWTs.
- Refresh tokens are opaque high-entropy tokens.
- Only SHA-256 refresh token hashes are stored in PostgreSQL.
- Refresh tokens rotate on every refresh.
- Reusing a revoked refresh token revokes the entire token family.
- Password hashes and refresh token hashes are never returned by the API.

## Cookie

Name defaults to `sentinelai_refresh_token`.

Options:

- `httpOnly: true`
- `secure: true` in production
- `sameSite: lax`
- `path: /api/auth`
- `maxAge: 7 days` by default

## Register

`POST /api/auth/register`

Body:

```json
{
  "email": "security@example.com",
  "name": "Security Lead",
  "password": "StrongPassword#123"
}
```

Response `201`:

```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "security@example.com",
      "name": "Security Lead",
      "createdAt": "2026-07-16T00:00:00.000Z",
      "updatedAt": "2026-07-16T00:00:00.000Z"
    },
    "accessToken": "jwt",
    "accessTokenExpiresInSeconds": 900
  }
}
```

## Login

`POST /api/auth/login`

Body:

```json
{
  "email": "security@example.com",
  "password": "StrongPassword#123"
}
```

Response `200`: same shape as register.

## Refresh Token

`POST /api/auth/refresh-token`

Requires the refresh token cookie. Returns a new access token and rotates the refresh token cookie.

Response `200`: same shape as login.

Replay response:

```json
{
  "success": false,
  "error": {
    "code": "REFRESH_TOKEN_REPLAY_DETECTED",
    "message": "Refresh token reuse was detected. Please sign in again."
  }
}
```

## Logout

`POST /api/auth/logout`

Revokes the current refresh token when present and clears the cookie.

Response `200`:

```json
{
  "success": true,
  "message": "Logout successful.",
  "data": null
}
```

## Current User

`GET /api/auth/me`

Headers:

```http
Authorization: Bearer <access-token>
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "security@example.com",
      "name": "Security Lead",
      "createdAt": "2026-07-16T00:00:00.000Z",
      "updatedAt": "2026-07-16T00:00:00.000Z"
    }
  }
}
```

## Environment Variables

```env
JWT_ACCESS_SECRET=replace-with-at-least-32-random-characters
JWT_ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=7
REFRESH_TOKEN_COOKIE_NAME=sentinelai_refresh_token
BCRYPT_SALT_ROUNDS=12
```

