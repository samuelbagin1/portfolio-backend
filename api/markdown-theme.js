import { connectToDatabase } from '../lib/connectToDatabase.js';
import {
  MAX_MARKDOWN_THEME_CSS_LENGTH,
  validateAndCanonicalizeMarkdownThemeCss
} from '../lib/markdownThemeCss.js';
import { authorizeAdmin } from './auth.js';

const ALLOWED_ORIGINS = ['http://localhost:3000', 'https://samuelbagin.xyz'];
const SETTING_ID = 'markdown-theme';

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  let body = '';

  for await (const chunk of req) {
    body += chunk.toString();

    if (body.length > MAX_MARKDOWN_THEME_CSS_LENGTH + 1_000) {
      throw new Error('REQUEST_TOO_LARGE');
    }
  }

  return JSON.parse(body);
}

export async function handleMarkdownTheme(req, res, connect = connectToDatabase) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'PUT' && !authorizeAdmin(req, res)) {
    return;
  }

  try {
    const { db } = await connect();
    const settings = db.collection('settings');

    if (req.method === 'GET') {
      const setting = await settings.findOne({ _id: SETTING_ID });

      if (!setting) {
        return res.status(404).json({ error: 'Markdown theme not found' });
      }

      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return res.status(200).json({
        css: setting.css,
        updatedAt: setting.updatedAt
      });
    }

    let body;

    try {
      body = await readJsonBody(req);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    let css;

    try {
      css = validateAndCanonicalizeMarkdownThemeCss(body?.css);
    } catch (error) {
      if (error.code === 'INVALID_MARKDOWN_THEME_CSS') {
        return res.status(400).json({ error: error.message });
      }

      throw error;
    }

    const updatedAt = new Date();

    await settings.updateOne(
      { _id: SETTING_ID },
      {
        $set: {
          css,
          updatedAt
        }
      },
      { upsert: true }
    );

    return res.status(200).json({
      css,
      updatedAt
    });
  } catch (error) {
    console.error('Markdown Theme API Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

export default function handler(req, res) {
  return handleMarkdownTheme(req, res);
}
