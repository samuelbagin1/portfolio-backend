import { connectToDatabase, ObjectId } from '../lib/connectToDatabase.js';
import cloudinary from 'cloudinary';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default async (req, res) => {
  // CORS Configuration
  const allowedOrigins = ['http://localhost:3000', 'https://head.samuelbagin.xyz'];
  const origin = req.headers.origin;
  
  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, publicId } = req.body;
    console.log('Deletion request:', { id, publicId });

    // Validate input
    if (!id || !publicId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert to ObjectId
    const objectId = new ObjectId(id);

    const { db } = await connectToDatabase();

    // 1. Delete from MongoDB
    const deleteResult = await db.collection('images').deleteOne({ 
      _id: objectId,
      publicId: publicId
    });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // 2. Delete from Cloudinary
    const cloudResult = await cloudinary.v2.uploader.destroy(publicId);
    console.log('Cloudinary deletion result:', cloudResult);

    return res.status(200).json({ 
      success: true,
      cloudinary: cloudResult 
    });

  } catch (error) {
    console.error('Delete Error:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.stack 
    });
  }
};