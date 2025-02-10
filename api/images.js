import { connectToDatabase } from '../lib/connectToDatabase.js';

export const config = { maxDuration: 15 };

export default async (req, res) => {

  // Set CORS headers
  const allowedOrigins = [
    'http://localhost:3000', // Local development
    'https://head.samuelbagin.xyz' // Production
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

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