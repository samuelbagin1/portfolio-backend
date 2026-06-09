import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const ALLOWED_ORIGINS = ['http://localhost:3000', 'https://samuelbagin.xyz'];
const JWT_AUDIENCE = 'portfolio-admin';
const JWT_ISSUER = 'portfolio-backend';
const JWT_EXPIRES_IN_SECONDS = 60 * 60;

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : '');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

function getAuthConfig() {
  const username = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;

  if (!username || !passwordHash || !jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
    return null;
  }

  return { username, passwordHash, jwtSecret };
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  let body = '';

  for await (const chunk of req) {
    body += chunk.toString();
  }

  return JSON.parse(body);
}

export function authorizeAdmin(req, res) {
  const config = getAuthConfig();

  if (!config) {
    res.status(500).json({ error: 'Authentication is not configured' });
    return false;
  }

  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER
    });

    if (payload.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return false;
    }

    return true;
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const config = getAuthConfig();

  if (!config) {
    return res.status(500).json({ error: 'Authentication is not configured' });
  }

  try {
    const { username, password } = await readJsonBody(req);
    const usernameMatches = typeof username === 'string' && username === config.username;
    const passwordMatches = typeof password === 'string'
      && await bcrypt.compare(password, config.passwordHash);

    if (!usernameMatches || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { role: 'admin' },
      config.jwtSecret,
      {
        algorithm: 'HS256',
        audience: JWT_AUDIENCE,
        expiresIn: JWT_EXPIRES_IN_SECONDS,
        issuer: JWT_ISSUER,
        subject: config.username
      }
    );

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      token,
      expiresIn: JWT_EXPIRES_IN_SECONDS
    });
  } catch {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
}
