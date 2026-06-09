# portfolio-backend

Vercel serverless backend for portfolio website

## Used services

- [Cloudinary](https://cloudinary.com)
- [MongoDB](https://account.mongodb.com/account/login)

## Authentication

`GET` and `OPTIONS` requests are public. `POST` and `DELETE` requests to the
content endpoints require an admin JWT in the `Authorization` header.

Interactive Swagger API documentation is available at `/api/doc`.

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
