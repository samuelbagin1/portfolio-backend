import { connectToDatabase, ObjectId } from '../lib/connectToDatabase.js';
import { IncomingForm } from 'formidable';
import cloudinary from 'cloudinary';

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 15
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default async (req, res) => {
  // CORS Configuration
  const allowedOrigins = ['http://localhost:3000', 'https://head.samuelbagin.xyz', 'https://samuelbagin.xyz'];
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
      // GET - Fetch all develop items
      const items = await db.collection('develop').find().sort({ createdAt: -1 }).toArray();
      return res.status(200).json(items);

    } else if (req.method === 'POST') {
      // POST - Create new develop item
      const form = new IncomingForm();

      // Parse form data
      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          resolve([fields, files]);
        });
      });

      // Validate required fields
      const title = fields.title?.[0];
      const text = fields.text?.[0];
      const linkText = fields.linkText?.[0];

      if (!title || !text || !linkText) {
        return res.status(400).json({
          error: 'Title, text, and link text are required for develop content'
        });
      }

      if (!files.image || !files.image[0]) {
        return res.status(400).json({ error: 'Image is required for develop content' });
      }

      const file = files.image[0];

      // Upload to Cloudinary
      const result = await cloudinary.v2.uploader.upload(file.filepath, {
        folder: 'develop',
        resource_type: 'auto',
        use_filename: true,
        width: 1350,              // Resize to 1350px width
        format: 'webp',           // Convert to WebP format
        quality: 'auto:good',     // Automatic quality optimization
        crop: 'limit',            // Only resize if larger (won't upscale)
        fetch_format: 'auto',     // Best format for browser
        flags: 'progressive'      // Progressive loading
      });

      // Save to MongoDB
      const developDoc = {
        title,
        text,
        linkText,
        image: result.secure_url,
        publicId: result.public_id,
        createdAt: new Date(),
        _id: new ObjectId()
      };

      await db.collection('develop').insertOne(developDoc);
      return res.status(201).json(developDoc);

    } else if (req.method === 'DELETE') {
      // DELETE - Remove develop item
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      return new Promise((resolve) => {
        req.on('end', async () => {
          try {
            const { id, publicId } = JSON.parse(body);
            console.log('Develop deletion request:', { id, publicId });

            // Validate input
            if (!id || !publicId) {
              return resolve(res.status(400).json({ error: 'Missing required fields' }));
            }

            // Convert to ObjectId
            const objectId = new ObjectId(id);

            // Delete from MongoDB
            const deleteResult = await db.collection('develop').deleteOne({
              _id: objectId,
              publicId: publicId
            });

            if (deleteResult.deletedCount === 0) {
              return resolve(res.status(404).json({ error: 'Develop item not found' }));
            }

            // Delete from Cloudinary
            const cloudResult = await cloudinary.v2.uploader.destroy(publicId);
            console.log('Cloudinary deletion result:', cloudResult);

            return resolve(res.status(200).json({
              success: true,
              cloudinary: cloudResult
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
    console.error('Develop API Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      details: error.stack
    });
  }
};