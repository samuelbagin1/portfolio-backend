import { connectToDatabase } from '../lib/connectToDatabase.js';

export const config = { maxDuration: 15 };

export default async (req, res) => {

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001', 'https://head.samuelbagin.xyz/portfolio/photo');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Connect inside the handler
    const { db } = await connectToDatabase();
    
    // Get images collection
    const images = await db.collection('images').find().toArray();

    return res.status(200).json(images);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch images' 
    });
  }
};