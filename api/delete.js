import { connectToDatabase } from '../lib/connectToDatabase';
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
  
  res.setHeader('Access-Control-Allow-Methods', 'DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, publicId } = req.body;
    
    // Validate input
    if (!id || !publicId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Delete from Cloudinary
    const cloudinaryResult = await cloudinary.v2.uploader.destroy(publicId);
    if (cloudinaryResult.result !== 'ok') {
      throw new Error('Failed to delete from Cloudinary');
    }

    // Delete from MongoDB
    const { db } = await connectToDatabase();
    const deleteResult = await db.collection('images').deleteOne({ _id: id });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.stack 
    });
  }
};