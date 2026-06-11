# portfolio-backend

Vercel serverless backend for portfolio website

## Used services

- [Cloudinary](https://cloudinary.com)
- [MongoDB](https://account.mongodb.com/account/login)

## Authentication

`GET` and `OPTIONS` requests are public. `POST` and `DELETE` requests to the
content endpoints require an admin JWT in the `Authorization` header.

Interactive Swagger API documentation is available at `/api/doc`.

## Markdown theme settings

The public frontend can load the singleton global Markdown theme from:

```http
GET /api/settings/markdown-theme
```

When no theme is stored, the endpoint returns `404`. If loading fails for any
reason, public pages should use their bundled default Markdown theme.

An authenticated administrator can replace the theme:

```http
PUT /api/settings/markdown-theme
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "css": "h1 { font-size: 3rem; color: #fefefa; }"
}
```

The server validates and canonicalizes the CSS, stores one global theme, and
generates `updatedAt`. CSS is limited to 20,000 characters. At-rules, unknown
Markdown selectors or properties, external/dynamic values such as `url()` and
`var()`, custom properties, and `!important` are rejected with `400`.

## Edit a development project

An authenticated administrator can update a development project with
`multipart/form-data`:

```http
PUT /api/develop
Authorization: Bearer <jwt>
Content-Type: multipart/form-data
```

Required fields are `id`, `title`, `shortText`, `text`, and `linkText`.
`linkText` must be a valid HTTP or HTTPS URL. An `image` file is optional.
Without an image, the existing Cloudinary image is preserved. With an image,
the previous image is deleted only after the database update succeeds.

Configure these environment variables in Vercel:

```text
ADMIN_USERNAME
ADMIN_PASSWORD_HASH
JWT_SECRET
```

Generate the password hash locally:

```bash
node -e "console.log(require('bcryptjs').hashSync('replace-with-password', 12))"
```

Generate a JWT secret containing at least 32 bytes:

```bash
openssl rand -base64 32
```

### Login

Request:

```http
POST /api/auth
Content-Type: application/json

{
  "username": "admin",
  "password": "secret"
}
```

Successful response:

```json
{
  "token": "<jwt>",
  "expiresIn": 3600
}
```

The frontend should keep the token in memory or session storage and send it
with each protected request:

```http
Authorization: Bearer <jwt>
```

Example:

```js
const loginResponse = await fetch(`${API_URL}/api/auth`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const { token } = await loginResponse.json();

await fetch(`${API_URL}/api/video`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({ linkText })
});
```
