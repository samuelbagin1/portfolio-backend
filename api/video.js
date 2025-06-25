import { connectToDatabase, ObjectId } from '../lib/connectToDatabase.js';

export const config = { maxDuration: 15 };

export default async (req, res) => {
  // CORS Configuration
  const allowedOrigins = ['http://localhost:3000', 'https://head.samuelbagin.xyz'];
  const origin = req.headers.origin;
  
  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      // GET - Fetch all video items
      const items = await db.collection('video').find().sort({ createdAt: -1 }).toArray();
      return res.status(200).json(items);

    } else if (req.method === 'POST') {
      // POST - Create new video item
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      return new Promise((resolve) => {
        req.on('end', async () => {
          try {
            const { linkText } = JSON.parse(body);
            
            if (!linkText) {
              return resolve(res.status(400).json({ error: 'Link text is required for video content' }));
            }

            // Save to MongoDB
            const videoDoc = {
              linkText,
              createdAt: new Date(),
              _id: new ObjectId()
            };

            await db.collection('video').insertOne(videoDoc);
            return resolve(res.status(201).json(videoDoc));

          } catch (error) {
            console.error('Video Post Error:', error);
            return resolve(res.status(400).json({ 
              error: 'Invalid JSON data or missing linkText' 
            }));
          }
        });
      });

    } else if (req.method === 'DELETE') {
      // DELETE - Remove video item
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      return new Promise((resolve) => {
        req.on('end', async () => {
          try {
            const { id } = JSON.parse(body);
            console.log('Video deletion request:', { id });

            // Validate input
            if (!id) {
              return resolve(res.status(400).json({ error: 'ID is required' }));
            }

            // Convert to ObjectId
            const objectId = new ObjectId(id);

            // Delete from MongoDB
            const deleteResult = await db.collection('video').deleteOne({ 
              _id: objectId
            });

            if (deleteResult.deletedCount === 0) {
              return resolve(res.status(404).json({ error: 'Video item not found' }));
            }

            return resolve(res.status(200).json({ 
              success: true,
              message: 'Video item deleted successfully'
            }));

          } catch (error) {
            console.error('Delete Error:', error);
            return resolve(res.status(500).json({ 
              error: error.message || 'Internal server error',
              details: error.stack 
            }));
          }
        });
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Video API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.stack 
    });
  }
};