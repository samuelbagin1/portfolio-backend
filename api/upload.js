import { connectToDatabase } from '../lib/connectToDatabase.js';
import { IncomingForm } from 'formidable';
import cloudinary from 'cloudinary';

export const config = {
  api: {
    bodyParser: false,
  },
};

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default async (req, res) => {
  // CORS headers setup
  const allowedOrigins = ['http://localhost:3000', 'https://head.samuelbagin.xyz'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm();

    // Parse form data
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Validate file upload
    if (!files.photo || !files.photo[0]) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = files.photo[0];

    // Upload to Cloudinary using buffer
    const result = await cloudinary.v2.uploader.upload(file.filepath, {
      folder: 'test',
      resource_type: 'auto',
      use_filename: true,
    });

    // Save to MongoDB
    const { db } = await connectToDatabase();
    const imageDoc = {
      text: fields.text[0],
      photo: result.secure_url,
      createdAt: new Date(),
      publicId: result.public_id, // Make sure this is stored
      _id: new ObjectId() // Explicit ID creation
    };

    await db.collection('images').insertOne(imageDoc);

    return res.status(201).json(imageDoc);

  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(error.http_code || 500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
};