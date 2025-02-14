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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, publicId } = req.body;
    console.log('Deletion request for:', { id, publicId });

    // Validate input
    if (!id || !publicId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert string ID to MongoDB ObjectId
    const objectId = new ObjectId(id);

    // Delete from MongoDB first
    const { db } = await connectToDatabase();
    const deleteResult = await db.collection('images').deleteOne({ 
      _id: objectId,
      publicId: publicId 
    });

    console.log('MongoDB deletion result:', deleteResult);

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ error: 'Image not found in database' });
    }

    // Delete from Cloudinary after successful DB deletion
    const cloudinaryResult = await cloudinary.v2.uploader.destroy(publicId);
    console.log('Cloudinary deletion result:', cloudinaryResult);

    return res.status(200).json({ 
      success: true,
      cloudinary: cloudinaryResult 
    });

  } catch (error) {
    console.error('Delete Error:', {
      message: error.message,
      stack: error.stack,
      rawBody: req.body
    });
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.stack 
    });
  }
};