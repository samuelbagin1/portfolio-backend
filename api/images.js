import { connectToDatabase } from '../lib/mongodb';

export const config = { maxDuration: 15 };

export default async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method === 'GET') {
    try {
      const { db } = await connectToDatabase();
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 1;
      const skip = (page - 1) * limit;

      const images = await db.collection('images')
        .find({})
        .skip(skip)
        .limit(limit)
        .toArray();

      const totalImages = await db.collection('images').countDocuments();
      const totalPages = Math.ceil(totalImages / limit);

      res.status(200).json({ images, totalPages, currentPage: page });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};