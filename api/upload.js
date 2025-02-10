import { connectToDatabase } from '../lib/connectToDatabase.js';
import { IncomingForm } from 'formidable';
import cloudinary from 'cloudinary';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001', 'http://samuelbagin.xyz');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to parse form data' });
      }

      if (!files.photo) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await cloudinary.v2.uploader.upload(files.photo.path, {
        folder: 'test',
      });

      const { db } = await connectToDatabase();
      const image = {
        text: fields.text,
        photo: result.secure_url,
      };

      await db.collection('images').insertOne(image);

      return res.status(201).json(image);
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ error: error.message });
  }
};