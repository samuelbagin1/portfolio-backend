import { connectToDatabase } from '../lib/connectToDatabase.js';
import { IncomingForm } from 'formidable';
import cloudinary from 'cloudinary';

export const config = {
  api: {
    bodyParser: false,
  },
};

const setCorsHeaders = (req, res) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://head.samuelbagin.xyz'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin'); // Important for caching
};

export default async (req, res) => {
  // Handle OPTIONS preflight first
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    return res.status(200).end();
  }

  // Set CORS headers for actual request
  setCorsHeaders(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm();

    // Wrap form.parse in a promise
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    if (!files.photo) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const result = await cloudinary.v2.uploader.upload(files.photo.path, {
      folder: 'test',
    });

    // Save to MongoDB
    const { db } = await connectToDatabase();
    const image = {
      text: fields.text,
      photo: result.secure_url,
    };
    
    await db.collection('images').insertOne(image);

    return res.status(201).json(image);

  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.stack 
    });
  }
};